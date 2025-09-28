import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { startDate, endDate } = await req.json()

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: 'Start date and end date are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch exits with related data
    const { data: exits, error } = await supabaseClient
      .from('vehicle_exits')
      .select(`
        id,
        departure_date,
        departure_time,
        expected_return_date,
        expected_return_time,
        exit_type,
        service_number,
        total_service_number,
        destination,
        purpose,
        driver_name,
        driver_license,
        patient_name,
        patient_age,
        patient_gender,
        patient_contact,
        patient_district,
        patient_municipality,
        patient_parish,
        patient_address,
        ambulance_number,
        crew,
        observations,
        status,
        is_pem,
        is_reserve,
        created_at,
        profiles(first_name, last_name, employee_number),
        vehicles(license_plate, make, model)
      `)
      .gte('departure_date', startDate)
      .lte('departure_date', endDate)
      .order('departure_date', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Convert to CSV
    const headers = [
      'Data de Saída',
      'Hora de Saída',
      'Data Retorno Previsto',
      'Hora Retorno Previsto',
      'Tipo de Serviço',
      'Número de Serviço',
      'Número Total',
      'Destino',
      'Finalidade',
      'Condutor',
      'Carta de Condução',
      'Nome Utente',
      'Idade Utente',
      'Género Utente',
      'Contacto Utente',
      'Distrito',
      'Concelho',
      'Freguesia',
      'Morada',
      'Número Ambulância',
      'Tripulação',
      'Observações',
      'Estado',
      'PEM',
      'Reserva',
      'Utilizador',
      'Número Funcionário',
      'Matrícula Viatura',
      'Marca Viatura',
      'Modelo Viatura',
      'Data Criação'
    ]

    const csvRows = [headers.join(',')]

    for (const exit of exits || []) {
      const row = [
        exit.departure_date || '',
        exit.departure_time || '',
        exit.expected_return_date || '',
        exit.expected_return_time || '',
        exit.exit_type || '',
        exit.service_number || '',
        exit.total_service_number || '',
        `"${(exit.destination || '').replace(/"/g, '""')}"`,
        `"${(exit.purpose || '').replace(/"/g, '""')}"`,
        `"${(exit.driver_name || '').replace(/"/g, '""')}"`,
        exit.driver_license || '',
        `"${(exit.patient_name || '').replace(/"/g, '""')}"`,
        exit.patient_age || '',
        exit.patient_gender || '',
        exit.patient_contact || '',
        `"${(exit.patient_district || '').replace(/"/g, '""')}"`,
        `"${(exit.patient_municipality || '').replace(/"/g, '""')}"`,
        `"${(exit.patient_parish || '').replace(/"/g, '""')}"`,
        `"${(exit.patient_address || '').replace(/"/g, '""')}"`,
        exit.ambulance_number || '',
        `"${(exit.crew || '').replace(/"/g, '""')}"`,
        `"${(exit.observations || '').replace(/"/g, '""')}"`,
        exit.status || '',
        exit.is_pem ? 'Sim' : 'Não',
        exit.is_reserve ? 'Sim' : 'Não',
        `"${((exit.profiles?.[0]?.first_name || '') + ' ' + (exit.profiles?.[0]?.last_name || '')).trim()}"`,
        exit.profiles?.[0]?.employee_number || '',
        exit.vehicles?.[0]?.license_plate || '',
        exit.vehicles?.[0]?.make || '',
        exit.vehicles?.[0]?.model || '',
        exit.created_at || ''
      ]
      csvRows.push(row.join(','))
    }

    const csv = csvRows.join('\n')

    return new Response(
      JSON.stringify({ csv }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Export error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})