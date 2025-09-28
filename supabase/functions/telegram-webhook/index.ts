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
    if (update.callback_query) {
      // Handle button callbacks for readiness responses
      const callbackQuery = update.callback_query;
      console.log('Received callback query:', callbackQuery.data);
      
      if (callbackQuery.data && callbackQuery.data.startsWith('readiness_')) {
        console.log('Processing readiness callback:', callbackQuery.data);
        
        // Forward to readiness callback handler
        const callbackResponse = await fetch(`${supabaseUrl}/functions/v1/telegram-readiness-callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ callback_query: callbackQuery })
        });
        
        const responseText = await callbackResponse.text();
        console.log(`Readiness callback processed: ${callbackResponse.status} - ${responseText}`);
      }
    } else if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id;
      const firstName = message.from.first_name;
      const lastName = message.from.last_name || '';
      
      console.log(`Message from ${firstName} ${lastName} (${userId}): ${message.text}`);

      // Check if this is a /start command or first interaction
      if (message.text === '/start') {
        // Auto-setup user for notifications
        console.log(`Auto-setting up user: ${firstName} ${lastName} with chat ID: ${chatId}`);
        
        // Try to find and update user profile
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .ilike('first_name', firstName)
          .ilike('last_name', lastName || '');

        if (profileError) {
          console.error('Error finding profile:', profileError);
        }

        let userFound = false;
        if (profiles && profiles.length > 0) {
          // Find best match (exact match preferred)
          const exactMatch = profiles.find(p => 
            p.first_name.toLowerCase() === firstName.toLowerCase() && 
            (p.last_name || '').toLowerCase() === (lastName || '').toLowerCase()
          );
          
          const profile = exactMatch || profiles[0];
          
          // Update profile with telegram chat ID
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ telegram_chat_id: chatId.toString() })
            .eq('user_id', profile.user_id);

          if (!updateError) {
            userFound = true;
            console.log(`Successfully linked ${firstName} ${lastName} to chat ID ${chatId}`);
            
            // Send confirmation message
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `✅ Olá ${firstName}! A sua conta foi configurada automaticamente para receber notificações. Irá receber alertas sobre novas saídas de serviço.`
              })
            });
          } else {
            console.error('Error updating profile:', updateError);
          }
        }

        if (!userFound) {
          // Send message with chat_id for manual configuration
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `Olá ${firstName}! Para configurar as notificações:\n\n🆔 Seu Chat ID: ${chatId}\n\n1. Copie este número\n2. Cole na aplicação web em Configurações > Telegram\n3. Contacte o administrador se precisar de ajuda`
            })
          });
        }
      } else {
        // For other messages, just acknowledge
        console.log(`Message from ${firstName}: ${message.text}`);
      }
    }

    // Always return success to Telegram
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    // Still return success to avoid Telegram retries
    return new Response('Error handled', { status: 200 });
  }
});