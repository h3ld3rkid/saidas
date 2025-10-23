import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramNotificationRequest {
  chatIds: string[];
  message: string;
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

    const { chatIds, message }: TelegramNotificationRequest = await req.json();

    console.log(`Telegram notify request: ${chatIds?.length || 0} chat IDs`);

    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
      console.log("No chat IDs provided, will send notification anyway");
      return new Response(
        JSON.stringify({ 
          results: [], 
          summary: "Notification request processed but no Telegram chat IDs available" 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const results = [];

    // Send message to each chat ID
    for (const chatId of chatIds) {
      try {
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        const response = await fetch(telegramUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "HTML",
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          console.log(`Message sent successfully to chat ${chatId}`);
          results.push({ chatId, success: true, messageId: result.result?.message_id });
        } else {
          console.error(`Failed to send message to chat ${chatId}:`, result);
          results.push({ chatId, success: false, error: result.description });
        }
      } catch (error: any) {
        console.error(`Error sending message to chat ${chatId}:`, error);
        results.push({ chatId, success: false, error: error.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in telegram-notify function:", error);
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