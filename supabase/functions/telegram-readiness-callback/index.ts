import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  message: {
    message_id: number;
    chat: {
      id: number;
    };
  };
  data: string;
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

    const body = await req.json();
    const callbackQuery: TelegramCallbackQuery = body.callback_query;

    if (!callbackQuery || !callbackQuery.data.startsWith('readiness_')) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse callback data: readiness_yes/no_alertId_chatId
    const callbackDataParts = callbackQuery.data.split('_');
    console.log('Callback data parts:', callbackDataParts);
    
    // Handle both old format and new format
    let response, alertId, chatId;
    if (callbackDataParts.length >= 5) {
      // New format: readiness_yes_alert_1759076362784_6y0qf9hpb_723174237
      [, response, , alertId, chatId] = callbackDataParts;
      alertId = `alert_${alertId}_${callbackDataParts[4]}`;
      chatId = callbackDataParts[5] || callbackDataParts[4];
    } else {
      // Old format: readiness_yes_alertId_chatId
      [, response, alertId, chatId] = callbackDataParts;
    }
    
    console.log(`Processing callback: response=${response}, alertId=${alertId}, chatId=${chatId}`);
    
    // Get user profile from chat_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .eq('telegram_chat_id', chatId)
      .single();

    console.log('Found profile:', profile);

    if (!profile) {
      console.error(`No profile found for chat_id: ${chatId}`);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userName = `${profile.first_name} ${profile.last_name || ''}`.trim();
    const isAvailable = response === 'yes';

    console.log(`User ${userName} responded: ${isAvailable ? 'Available' : 'Not Available'}`);

    // Store the response
    const { data: insertedResponse, error: insertError } = await supabase
      .from('readiness_responses')
      .insert({
        alert_id: alertId,
        user_id: profile.user_id,
        response: isAvailable,
        responded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting response:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Response inserted:', insertedResponse);

    // Get the original alert details
    const { data: alert } = await supabase
      .from('readiness_alerts')
      .select('requester_name, alert_type')
      .eq('alert_id', alertId)
      .single();

    // Answer the callback query
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id,
        text: isAvailable ? "✅ Resposta registada: Disponível" : "❌ Resposta registada: Não disponível",
        show_alert: false
      })
    });

    // Create real-time notification for the original requester
    if (isAvailable && alert) {
      // Insert into realtime notifications table
      await supabase
        .from('realtime_notifications')
        .insert({
          alert_id: alertId,
          responder_name: userName,
          message: `${userName} está disponível para o alerta de ${alert.alert_type}`,
          created_at: new Date().toISOString()
        });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in telegram-readiness-callback:", error);
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