import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Password recovery request for: ${email}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by email with pagination
    let authUser = null;
    let page = 1;
    while (!authUser) {
      const { data: pageData, error: pageError } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (pageError) {
        console.error("Error listing users:", pageError);
        return new Response(
          JSON.stringify({ success: false, error: "Erro interno" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      authUser = pageData.users.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
      if (authUser || pageData.users.length < 100) break;
      page++;
    }

    if (!authUser) {
      // Don't reveal if user exists or not - generic message
      return new Response(
        JSON.stringify({ success: true, message: "Se o email estiver registado e tiver Telegram configurado, receberá a nova password." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, telegram_chat_id, is_active, manually_blocked")
      .eq("user_id", authUser.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(
        JSON.stringify({ success: true, message: "Se o email estiver registado e tiver Telegram configurado, receberá a nova password." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if manually blocked
    if (profile.manually_blocked) {
      console.log("User is manually blocked, denying recovery");
      return new Response(
        JSON.stringify({ success: false, error: "A sua conta está bloqueada por um administrador. Contacte um administrador." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if has Telegram configured
    if (!profile.telegram_chat_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Não tem o Telegram configurado. Contacte um administrador para recuperar a password." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate temp password
    const tempPassword = "CVAmares_" + Math.random().toString(36).slice(-6);

    // Update password and set force_password_change
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: tempPassword,
      user_metadata: { force_password_change: true },
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao gerar nova password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If user was auto-locked (not manually blocked), reactivate
    if (!profile.is_active && !profile.manually_blocked) {
      await supabase
        .from("profiles")
        .update({ is_active: true, failed_login_attempts: 0, locked_at: null })
        .eq("user_id", authUser.id);
    }

    // Send via Telegram
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!telegramBotToken) {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Sistema de notificação não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = `🔑 *Recuperação de Password*\n\n` +
      `Olá ${profile.first_name || ""}!\n\n` +
      `A sua nova password temporária é:\n\n` +
      `\`${tempPassword}\`\n\n` +
      `⚠️ Terá de alterar a password no primeiro login.`;

    const response = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: profile.telegram_chat_id,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Telegram send error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao enviar mensagem no Telegram. Verifique se iniciou o bot com /start." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Password recovery successful, sent via Telegram");

    return new Response(
      JSON.stringify({ success: true, message: "Nova password enviada para o seu Telegram." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in recover-password:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
