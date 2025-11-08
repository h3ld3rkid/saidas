import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const { address, parish, municipality } = await req.json();
    
    console.log('Geocode request for:', { address, parish, municipality });

    // Create Supabase client to get API key from settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Google Maps API key from settings
    const { data: settingData, error: settingError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'google_maps_api_key')
      .maybeSingle();

    if (settingError || !settingData?.value) {
      console.error('No Google Maps API key configured:', settingError);
      return new Response(
        JSON.stringify({ 
          error: 'Google Maps API key não configurada. Configure a chave nas Configurações do sistema.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const googleMapsApiKey = settingData.value;

    // Build search query
    const parts = [address, parish, municipality, 'Portugal'].filter(Boolean);
    const searchQuery = parts.join(', ');

    console.log('Search query:', searchQuery);

    // Call Google Maps Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${googleMapsApiKey}`;
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    console.log('Google Maps API status:', data.status);

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Maps API error:', data);
      return new Response(
        JSON.stringify({ 
          error: `Erro da Google Maps API: ${data.error_message || data.status}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (data.status === 'ZERO_RESULTS') {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format suggestions
    const suggestions = data.results.map((result: any) => ({
      formatted_address: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    }));

    console.log(`Found ${suggestions.length} suggestions`);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in google-maps-geocode function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
