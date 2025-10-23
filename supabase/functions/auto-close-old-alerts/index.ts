import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find alerts older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    console.log(`Looking for alerts created before: ${oneHourAgo}`);

    const { data: oldAlerts, error: fetchError } = await supabase
      .from('readiness_alerts')
      .select('alert_id, alert_type')
      .lt('created_at', oneHourAgo);

    if (fetchError) {
      console.error('Error fetching old alerts:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch old alerts' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`Found ${oldAlerts?.length || 0} old alerts to close`);

    if (!oldAlerts || oldAlerts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No old alerts to close',
          closedAlerts: 0 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Close each old alert by calling clear-readiness-alert
    const results = [];
    for (const alert of oldAlerts) {
      console.log(`Closing alert: ${alert.alert_id} (${alert.alert_type})`);
      
      try {
        const { data, error } = await supabase.functions.invoke('clear-readiness-alert', {
          body: {
            alertId: alert.alert_id,
            alertType: alert.alert_type,
            closedByName: 'Sistema (Auto-conclusão)',
          }
        });

        if (error) {
          console.error(`Error closing alert ${alert.alert_id}:`, error);
          results.push({ alertId: alert.alert_id, success: false, error: error.message });
        } else {
          console.log(`Successfully closed alert ${alert.alert_id}`);
          results.push({ alertId: alert.alert_id, success: true, data });
        }
      } catch (error: any) {
        console.error(`Exception closing alert ${alert.alert_id}:`, error);
        results.push({ alertId: alert.alert_id, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Closed ${successCount} alerts successfully, ${failureCount} failures`);

    return new Response(
      JSON.stringify({
        success: true,
        closedAlerts: successCount,
        failedAlerts: failureCount,
        results
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in auto-close-old-alerts:", error);
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
