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
      console.error("Missing required environment variables");
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

    // FIRST: Get positive responders BEFORE deleting anything
    console.log('Fetching positive responses (no FK join)...');
    const { data: responses, error: responsesError } = await supabase
      .from('readiness_responses')
      .select('user_id')
      .eq('alert_id', alertId)
      .eq('response', true);

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch responders' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const userIds = Array.from(new Set((responses || []).map((r: any) => r.user_id).filter(Boolean)));
    console.log(`Positive response userIds:`, userIds);

    let profilesMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, telegram_chat_id')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      } else {
        (profiles || []).forEach((p: any) => profilesMap.set(p.user_id, p));
      }
    }

    const responders = userIds
      .map((uid: string) => {
        const p = profilesMap.get(uid) || {};
        return {
          chatId: p.telegram_chat_id || '',
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Utilizador',
        };
      })
      .filter((r: any) => !!r.chatId);

    console.log(`Found ${responders.length} responders with Telegram chat IDs:`, responders);

    // SECOND: Send notifications to responders
    let notificationsSent = 0;
    for (const responder of responders) {
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

        const responseText = await response.text();
        
        if (!response.ok) {
          console.error(`Failed to send message to ${responder.name}: ${response.status} ${response.statusText} - ${responseText}`);
        } else {
          console.log(`Notification sent successfully to ${responder.name}`);
          notificationsSent++;
        }
      } catch (error) {
        console.error(`Error sending message to ${responder.name}:`, error);
      }
    }

    // THIRD: Delete responses and alert
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
      notificationsSent: notificationsSent,
      totalResponders: responders.length,
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