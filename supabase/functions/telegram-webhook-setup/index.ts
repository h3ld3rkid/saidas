import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Setting up Telegram webhook...');

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not found');
      return new Response(
        JSON.stringify({ error: 'Bot token não configurado' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the current Supabase project URL to set up webhook
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      console.error('SUPABASE_URL not found');
      return new Response(
        JSON.stringify({ error: 'URL do Supabase não encontrado' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook`;
    console.log('Setting webhook URL to:', webhookUrl);

    // Set webhook URL
    const setWebhookResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query']
        }),
      }
    );

    const webhookResult = await setWebhookResponse.json();
    console.log('Webhook setup result:', webhookResult);

    if (!webhookResult.ok) {
      console.error('Failed to set webhook:', webhookResult);
      return new Response(
        JSON.stringify({ 
          error: `Erro ao configurar webhook: ${webhookResult.description || 'Erro desconhecido'}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get webhook info to confirm setup
    const getWebhookResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );
    const webhookInfo = await getWebhookResponse.json();
    console.log('Current webhook info:', webhookInfo);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook configurado com sucesso!',
        webhookInfo: webhookInfo.result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error setting up webhook:', error);
    return new Response(
      JSON.stringify({ error: `Erro interno: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});