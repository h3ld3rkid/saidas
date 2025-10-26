import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClearAlertRequest {
  alertId: string;
  alertType: string;
  closedByName: string;
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

    const { alertId, alertType, closedByName }: ClearAlertRequest = await req.json();
    const safeClosedByName = (closedByName && String(closedByName).trim()) ? String(closedByName).trim() : 'Utilizador';
    console.log(`Starting clear-readiness-alert for alertId: ${alertId}, alertType: ${alertType}, closedBy: ${safeClosedByName}`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // FIRST: Get ALL responses BEFORE deleting anything
    console.log('Fetching all responses...');
    const { data: responses, error: responsesError } = await supabase
      .from('readiness_responses')
      .select('user_id, response')
      .eq('alert_id', alertId);

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch responders' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const positiveResponders = (responses || []).filter((r: any) => r.response === true).map((r: any) => r.user_id);
    const negativeResponders = (responses || []).filter((r: any) => r.response === false).map((r: any) => r.user_id);
    const allResponders = (responses || []).map((r: any) => r.user_id);
    
    console.log(`Positive responders:`, positiveResponders);
    console.log(`Negative responders:`, negativeResponders);

    // Get all active profiles with Telegram
    console.log('Fetching all active profiles with Telegram...');
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, telegram_chat_id')
      .eq('is_active', true)
      .not('telegram_chat_id', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const profilesMap = new Map<string, any>();
    (allProfiles || []).forEach((p: any) => profilesMap.set(p.user_id, p));

    // Separate into groups
    const positiveNotifications = positiveResponders
      .map((uid: string) => {
        const p = profilesMap.get(uid);
        return p ? {
          chatId: p.telegram_chat_id,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Utilizador',
          type: 'positive'
        } : null;
      })
      .filter((r: any) => r && r.chatId);

    const cancelledNotifications = (allProfiles || [])
      .filter((p: any) => !allResponders.includes(p.user_id) || negativeResponders.includes(p.user_id))
      .map((p: any) => ({
        chatId: p.telegram_chat_id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Utilizador',
        type: 'cancelled'
      }))
      .filter((r: any) => r && r.chatId);

    console.log(`Sending ${positiveNotifications.length} positive notifications`);
    console.log(`Sending ${cancelledNotifications.length} cancellation notifications`);

    // SECOND: Send notifications
    let notificationsSent = 0;

    // Send to positive responders
    for (const responder of positiveNotifications) {
      const lisbonTime = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });
      const message = `✅ O alerta de ${alertType} foi resolvido por ${safeClosedByName}. Obrigado pela sua disponibilidade!\n⏰ ${lisbonTime}`;

      try {
        console.log(`Sending positive notification to ${responder.name} (${responder.chatId})`);
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
          
          // Insert into realtime_notifications for app notification
          try {
            const { error: notifError } = await supabase
              .from('realtime_notifications')
              .insert({
                alert_id: alertId,
                responder_name: responder.name,
                message: `Alerta de ${alertType} resolvido por ${safeClosedByName}`
              });
            
            if (notifError) {
              console.error(`Failed to insert realtime notification for ${responder.name}:`, notifError);
            } else {
              console.log(`Realtime notification inserted for ${responder.name}`);
            }
          } catch (notifInsertError) {
            console.error(`Error inserting realtime notification:`, notifInsertError);
          }
        }
      } catch (error) {
        console.error(`Error sending message to ${responder.name}:`, error);
      }
    }

    // Send to non-responders and negative responders
    for (const responder of cancelledNotifications) {
      const lisbonTime = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });
      const message = `❌ Pedido de prontidão anulado por ${safeClosedByName}. Obrigado\n⏰ ${lisbonTime}`;

      try {
        console.log(`Sending cancellation notification to ${responder.name} (${responder.chatId})`);
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
          console.log(`Cancellation notification sent successfully to ${responder.name}`);
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
      positiveNotifications: positiveNotifications.length,
      cancelledNotifications: cancelledNotifications.length,
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