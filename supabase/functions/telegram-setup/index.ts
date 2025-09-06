import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetupBotRequest {
  firstName: string;
  lastName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    
    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Telegram bot token not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { firstName, lastName }: SetupBotRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get bot info
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const botInfo = await botInfoResponse.json();

    if (!botInfoResponse.ok) {
      throw new Error(`Bot error: ${botInfo.description}`);
    }

    // Get bot updates to find the user who interacted with the bot
    const updatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100`);
    const updates = await updatesResponse.json();

    if (!updatesResponse.ok) {
      throw new Error(`Updates error: ${updates.description}`);
    }

    // Find the user by name
    let userChatId = null;
    for (const update of updates.result.reverse()) { // Check newest messages first
      if (update.message && update.message.from) {
        const user = update.message.from;
        const userFullName = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
        const searchName = `${firstName} ${lastName}`.trim().toLowerCase();
        
        if (userFullName.includes(searchName) || searchName.includes(userFullName)) {
          userChatId = user.id;
          break;
        }
      }
    }

    if (!userChatId) {
      return new Response(
        JSON.stringify({ 
          error: "Usuário não encontrado. Certifique-se de que enviou uma mensagem para o bot primeiro.",
          botUsername: botInfo.result.username,
          instructions: `1. Envie uma mensagem para @${botInfo.result.username} no Telegram\n2. Tente novamente esta configuração`
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Store chat ID in profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ telegram_chat_id: userChatId.toString() })
      .eq('first_name', firstName)
      .eq('last_name', lastName);

    if (updateError) {
      console.error('Error updating profile:', updateError);
    }

    // Send confirmation message
    const confirmationMessage = `✅ Configuração concluída!\n\nOlá ${firstName} ${lastName}!\nO seu Telegram foi configurado com sucesso no sistema de emergências.\n\nVocê receberá notificações quando for selecionado para uma tripulação.`;

    const sendResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: userChatId,
        text: confirmationMessage,
        parse_mode: "HTML",
      }),
    });

    const sendResult = await sendResponse.json();

    if (!sendResponse.ok) {
      throw new Error(`Send message error: ${sendResult.description}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      chatId: userChatId,
      botUsername: botInfo.result.username,
      message: "Configuração concluída com sucesso!"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in telegram-setup function:", error);
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