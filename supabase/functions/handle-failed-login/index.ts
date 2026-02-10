import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing failed login attempt for email: ${email}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Find user by email - use paginated search to handle large user lists
    let authUser = null;
    let page = 1;
    const perPage = 100;

    while (!authUser) {
      const { data: pageData, error: pageError } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (pageError) {
        console.error("Error listing users page", page, ":", pageError);
        return new Response(
          JSON.stringify({ error: "Internal error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Page ${page}: ${pageData.users.length} users, checking emails...`);
      authUser = pageData.users.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;

      if (authUser || pageData.users.length < perPage) break;
      page++;
    }

    if (!authUser) {
      console.log("User not found after checking all pages, ignoring");
      return new Response(
        JSON.stringify({ attempts: 0, locked: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found user: ${authUser.id}`);

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, failed_login_attempts, is_active")
      .eq("user_id", authUser.id)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ attempts: 0, locked: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already locked, just return
    if (!profile.is_active) {
      console.log("User already deactivated");
      return new Response(
        JSON.stringify({ attempts: MAX_ATTEMPTS, locked: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newAttempts = (profile.failed_login_attempts || 0) + 1;
    const shouldLock = newAttempts >= MAX_ATTEMPTS;

    console.log(`Attempt ${newAttempts}/${MAX_ATTEMPTS} for user ${authUser.id}, shouldLock: ${shouldLock}`);

    // Update the profile
    const updateData: Record<string, unknown> = {
      failed_login_attempts: newAttempts,
    };

    if (shouldLock) {
      updateData.is_active = false;
      updateData.locked_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", authUser.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update attempts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If locked, notify admins via Telegram
    if (shouldLock) {
      console.log("User locked, notifying admins...");
      
      const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      
      if (telegramBotToken) {
        const { data: admins, error: adminsError } = await supabase
          .from("profiles")
          .select("telegram_chat_id, first_name, last_name")
          .eq("role", "admin")
          .eq("is_active", true)
          .not("telegram_chat_id", "is", null);

        if (adminsError) {
          console.error("Error fetching admins:", adminsError);
        } else if (admins && admins.length > 0) {
          const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || email;
          const message = `🔒 *Utilizador Bloqueado*\n\n` +
            `O utilizador *${userName}* (${email}) foi bloqueado após ${MAX_ATTEMPTS} tentativas de login falhadas.\n\n` +
            `Para desbloquear, aceda à gestão de utilizadores.`;

          for (const admin of admins) {
            if (admin.telegram_chat_id) {
              try {
                const response = await fetch(
                  `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      chat_id: admin.telegram_chat_id,
                      text: message,
                      parse_mode: "Markdown",
                    }),
                  }
                );
                
                if (!response.ok) {
                  const errorText = await response.text();
                  console.error(`Failed to send Telegram to admin ${admin.first_name}:`, errorText);
                } else {
                  console.log(`Notified admin ${admin.first_name} via Telegram`);
                }
              } catch (telegramError) {
                console.error(`Error sending Telegram to admin:`, telegramError);
              }
            }
          }
        } else {
          console.log("No admins with Telegram configured found");
        }
      } else {
        console.log("TELEGRAM_BOT_TOKEN not configured");
      }
    }

    return new Response(
      JSON.stringify({ 
        attempts: newAttempts, 
        locked: shouldLock,
        remaining: Math.max(0, MAX_ATTEMPTS - newAttempts)
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in handle-failed-login:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
