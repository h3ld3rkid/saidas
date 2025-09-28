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
    console.log(`Starting clear-readiness-alert for alertId: ${alertId}, alertType: ${alertType}`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get positive responders and their Telegram chat IDs from the database
    console.log('Fetching responders data...');
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
    } else {
      console.log('Raw responders data:', JSON.stringify(respondersData, null, 2));
    }

    const responders = (respondersData || [])
      .map((r: any) => ({
        chatId: r?.profiles?.telegram_chat_id || '',
        name: `${r?.profiles?.first_name || ''} ${r?.profiles?.last_name || ''}`.trim() || 'Desconhecido'
      }))
      .filter(r => !!r.chatId);

    console.log(`Processing ${responders.length} responders:`, responders);

    // Notify each positive responder via Telegram
    const notificationPromises = responders.map(async (responder) => {
      if (!responder.chatId) return;

      const message = `✅ O alerta de ${alertType} foi resolvido. Obrigado pela sua disponibilidade!`;

      try {
        console.log(`Sending notification to ${responder.name} (${responder.chatId})`);
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: responder.chatId,
            text: message,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to send message to ${responder.name}: ${response.status} ${response.statusText} - ${errorText}`);
        } else {
          console.log(`Notification sent successfully to ${responder.name}`);
        }
      } catch (error) {
        console.error(`Error sending message to ${responder.name}:`, error);
      }
    });

    await Promise.all(notificationPromises);

    // Delete all responses for this alert
    console.log(`Deleting responses for alert ${alertId}`);
    const { error: delRespError, count: delRespCount } = await supabase
      .from('readiness_responses')
      .delete({ count: 'exact' })
      .eq('alert_id', alertId);

    if (delRespError) {
      console.error('Error deleting responses:', delRespError);
    } else {
      console.log(`Deleted ${delRespCount} responses`);
    }

    // Delete the alert itself
    console.log(`Deleting alert ${alertId}`);
    const { error: delAlertError, count: delAlertCount } = await supabase
      .from('readiness_alerts')
      .delete({ count: 'exact' })
      .eq('alert_id', alertId);

    if (delAlertError) {
      console.error('Error deleting alert:', delAlertError);
    } else {
      console.log(`Deleted ${delAlertCount} alerts`);
    }

    const result = {
      success: true, 
      notificationsSent: responders.length,
      deletedResponses: delRespCount ?? 0,
      deletedAlerts: delAlertCount ?? 0
    };

    console.log('Final result:', result);

    return new Response(
      JSON.stringify(result),
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