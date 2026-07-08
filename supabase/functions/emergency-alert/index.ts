import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmergencyAlertRequest {
  alertType: 'condutores' | 'socorristas';
  requesterName: string;
  requesterUserId?: string;
  isTest?: boolean;
  testUserIds?: string[];
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

    const { alertType, requesterName, requesterUserId, isTest, testUserIds }: EmergencyAlertRequest = await req.json();

    if (!alertType || !requesterName) {
      return new Response(
        JSON.stringify({ error: "alertType and requesterName are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obter chat IDs baseado no tipo de alerta (incluir TODOS os users ativos, não apenas os com chatId)
    let query = supabase
      .from('profiles')
      .select('first_name, last_name, telegram_chat_id')
      .eq('is_active', true);

    if (isTest && testUserIds && testUserIds.length > 0) {
      // Modo teste: enviar apenas para os user_ids selecionados
      query = query.in('user_id', testUserIds);
    } else if (alertType === 'condutores') {
      query = query.eq('function_role', 'Condutor');
    }
    // Para socorristas, enviar para todos os users ativos

    const { data: profiles, error } = await query;

    if (error) {
      console.error("Error fetching profiles:", error);
      return new Response(
        JSON.stringify({ error: "Database query failed" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Found ${profiles?.length || 0} active users for ${alertType}`);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active users found" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Separar users com e sem chat ID
    const usersWithTelegram = profiles.filter(p => p.telegram_chat_id);
    const usersWithoutTelegram = profiles.filter(p => !p.telegram_chat_id);

    console.log(`Users with Telegram: ${usersWithTelegram.length}, without: ${usersWithoutTelegram.length}`);

    const chatIds = usersWithTelegram
      .map(p => p.telegram_chat_id)
      .filter((id: string | null) => !!id && String(id).trim().length > 0) as string[];

    console.log(`Preparing to send ${alertType} alert to ${chatIds.length} Telegram recipients`);

    if (chatIds.length === 0 && usersWithoutTelegram.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users found for this alert type" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const lisbonTime = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });
    const categoryLabel = alertType === 'condutores' ? 'CONDUTORES' : 'SOCORRISTAS';
    const message = isTest
      ? `🧪 <b>TESTE DE PRONTIDÃO ${categoryLabel}</b> 🧪\n\n<i>Esta é apenas uma mensagem de teste - não é necessário deslocamento.</i>\n\n📝 Solicitado por: ${requesterName}\n⏰ ${lisbonTime}`
      : `🚨 <b>ALERTA DE PRONTIDÃO ${categoryLabel}</b> 🚨\n\nÉ necessário reforço da equipa, informe se disponível URGENTE\n\n📝 Solicitado por: ${requesterName}\n⏰ ${lisbonTime}`;

    // Generate unique alert ID for tracking responses
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store alert in database - save in UTC, display will handle timezone
    // Em modo teste, prefixar alert_type para não aparecer como alerta ativo nos painéis
    await supabase
      .from('readiness_alerts')
      .insert({
        alert_id: alertId,
        alert_type: isTest ? `test_${alertType}` : alertType,
        requester_name: isTest ? `[TESTE] ${requesterName}` : requesterName,
        requester_user_id: requesterUserId ?? null,
        created_at: new Date().toISOString()
      });

    const results = [];

    // Enviar mensagem para cada chat ID com botões inline
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
            reply_markup: {
              inline_keyboard: [[
                {
                  text: "✅ SIM - Estou disponível",
                  callback_data: `readiness_yes_${alertId}_${chatId}`
                },
                {
                  text: "❌ NÃO - Não disponível",
                  callback_data: `readiness_no_${alertId}_${chatId}`
                }
              ]]
            }
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          console.log(`Emergency alert sent successfully to chat ${chatId}`);
          results.push({ chatId, success: true, messageId: result.result?.message_id });
        } else {
          console.error(`Failed to send emergency alert to chat ${chatId}:`, result);
          results.push({ chatId, success: false, error: result.description });
        }
      } catch (error: any) {
        console.error(`Error sending emergency alert to chat ${chatId}:`, error);
        results.push({ chatId, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const usersNotifiedCount = usersWithTelegram.length;
    const usersNotNotifiedCount = usersWithoutTelegram.length;
    
    return new Response(JSON.stringify({ 
      results, 
      summary: `Emergency alert sent to ${successCount}/${chatIds.length} Telegram users. ${usersNotifiedCount} users with Telegram, ${usersNotNotifiedCount} users without Telegram configured.`,
      usersWithTelegram: usersWithTelegram.length,
      usersWithoutTelegram: usersWithoutTelegram.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in emergency-alert function:", error);
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