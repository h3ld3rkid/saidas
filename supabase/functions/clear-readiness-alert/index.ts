import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClearAlertRequest {
  alertId: string;
  alertType: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!botToken || !supabaseUrl || !supabaseKey) {
      console.error("Missing required environment variables (bot token or supabase creds)");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { alertId, alertType }: ClearAlertRequest = await req.json();

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get positive responders and their Telegram chat IDs from the database
    const { data: respondersData, error: respondersError } = await supabase
      .from('readiness_responses')
      .select(`
        user_id,
        profiles:user_id (
          first_name,
          last_name,
          telegram_chat_id
        )
      `)
      .eq('alert_id', alertId)
      .eq('response', true);

    if (respondersError) {
      console.error('Error fetching responders:', respondersError);
    }

    const responders = (respondersData || [])
      .map((r: any) => ({
        chatId: r?.profiles?.telegram_chat_id || '',
        name: `${r?.profiles?.first_name || ''} ${r?.profiles?.last_name || ''}`.trim() || 'Desconhecido'
      }))
      .filter(r => !!r.chatId);

    console.log(`Clearing alert ${alertId} for ${responders.length} responders`);

    // Notify each positive responder via Telegram
    const notificationPromises = responders.map(async (responder) => {
      if (!responder.chatId) return;

      const message = `✅ O alerta de ${alertType} foi resolvido. Obrigado pela sua disponibilidade!`;

      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: responder.chatId,
            text: message,
          }),
        });

        if (!response.ok) {
          console.error(`Failed to send message to ${responder.name}: ${response.statusText}`);
        } else {
          console.log(`Notification sent to ${responder.name}`);
        }
      } catch (error) {
        console.error(`Error sending message to ${responder.name}:`, error);
      }
    });

    await Promise.all(notificationPromises);

    // Delete all responses for this alert
    const { error: delRespError, count: delRespCount } = await supabase
      .from('readiness_responses')
      .delete({ count: 'exact' })
      .eq('alert_id', alertId);

    if (delRespError) {
      console.error('Error deleting responses:', delRespError);
    }

    // Delete the alert itself
    const { error: delAlertError, count: delAlertCount } = await supabase
      .from('readiness_alerts')
      .delete({ count: 'exact' })
      .eq('alert_id', alertId);

    if (delAlertError) {
      console.error('Error deleting alert:', delAlertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: responders.length,
        deletedResponses: delRespCount ?? 0,
        deletedAlerts: delAlertCount ?? 0
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in clear-readiness-alert:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);