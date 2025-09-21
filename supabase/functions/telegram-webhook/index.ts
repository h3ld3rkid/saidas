import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('Received webhook request');
    
    const update = await req.json();
    console.log('Webhook update:', JSON.stringify(update, null, 2));

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not found');
      return new Response('Bot token not configured', { status: 400 });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different types of updates
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id;
      const firstName = message.from.first_name;
      const lastName = message.from.last_name || '';
      
      console.log(`Message from ${firstName} ${lastName} (${userId}): ${message.text}`);

      // Check if this is a /start command or first interaction
      if (message.text === '/start') {
        // Send welcome message
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Olá ${firstName}! Para receber notificações, contacte o administrador para configurar a sua conta.`
          })
        });
      }

      // Log the interaction for potential user linking
      console.log(`User interaction logged: ${firstName} ${lastName} - Chat ID: ${chatId}`);
    }

    // Always return success to Telegram
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    // Still return success to avoid Telegram retries
    return new Response('Error handled', { status: 200 });
  }
});