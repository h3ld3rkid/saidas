import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CrewNotifyRequest {
  crewUserIds: string[] | string;
  serviceType: string;
  serviceNumber: number;
  departureTime: string;
  contact: string;
  coduNumber?: string;
  address: string;
  observations?: string;
  mapLocation?: string;
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
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const {
      crewUserIds,
      serviceType,
      serviceNumber,
      departureTime,
      contact,
      coduNumber,
      address,
      observations,
      mapLocation,
    }: CrewNotifyRequest = await req.json();

    const crewIds = Array.isArray(crewUserIds)
      ? crewUserIds
      : String(crewUserIds)
          .split(',')
          .map((s) => s.trim())
          .filter((s) => !!s);

    if (!crewIds.length) {
      return new Response(
        JSON.stringify({ error: "No crew user IDs provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch crew profiles with Telegram chat IDs
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, telegram_chat_id, first_name, last_name, is_active')
      .in('user_id', crewIds);

    if (error) {
      console.error('Error querying profiles:', error);
      return new Response(
        JSON.stringify({ error: 'Database query failed' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No crew profiles found' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const crewWithTelegram = profiles.filter((p) => p.telegram_chat_id);

    if (crewWithTelegram.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No crew members with Telegram configured' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const chatIds = crewWithTelegram
      .map((p) => p.telegram_chat_id)
      .filter((id: string | null) => !!id && String(id).trim().length > 0) as string[];

    const crewNames = profiles
      .map((p) => `${p.first_name} ${p.last_name}`.trim())
      .join(', ');

    const message = `\n🚨 <b>Nova Saída Registrada</b>\n\n📋 <b>Tipo:</b> ${serviceType}\n🔢 <b>Número:</b> ${serviceNumber}\n⏰ <b>Hora:</b> ${departureTime}\n📞 <b>Contacto:</b> ${contact}\n${coduNumber ? `🆘 <b>CODU:</b> ${coduNumber}\n` : ''}📍 <b>Morada:</b> ${address}\n👥 <b>Tripulação:</b> ${crewNames}\n${observations ? `📝 <b>Observações:</b> ${observations}\n` : ''}${mapLocation ? `🗺️ <b>Localização:</b> ${mapLocation}` : ''}`.trim();

    const results: Array<{ chatId: string; success: boolean; error?: string; messageId?: number }> = [];

    for (const chatId of chatIds) {
      try {
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
        });
        const result = await response.json();
        if (response.ok) {
          results.push({ chatId, success: true, messageId: result.result?.message_id });
        } else {
          console.error(`Telegram send failed for ${chatId}:`, result);
          results.push({ chatId, success: false, error: result.description });
        }
      } catch (err: any) {
        console.error(`Telegram error for ${chatId}:`, err);
        results.push({ chatId, success: false, error: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({ results, successCount, total: chatIds.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in service-crew-notify function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
