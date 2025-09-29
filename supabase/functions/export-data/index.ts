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

    console.log('Export request received:', { startDate, endDate })

    // Fetch exits with related data - using proper foreign key relationships
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
        user_id,
        vehicle_id
      `)
      .gte('departure_date', startDate)
      .lte('departure_date', endDate)
      .order('departure_date', { ascending: true })

    console.log('Exits query result:', { exits: exits?.length, error })

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch exits: ' + error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch user profiles and vehicles separately
    const userIds = [...new Set(exits?.map(exit => exit.user_id).filter(Boolean) || [])]
    const vehicleIds = [...new Set(exits?.map(exit => exit.vehicle_id).filter(Boolean) || [])]

    console.log('Fetching additional data:', { userIds: userIds.length, vehicleIds: vehicleIds.length })

    const [profilesResult, vehiclesResult] = await Promise.all([
      userIds.length > 0 ? supabaseClient
        .from('profiles')
        .select('user_id, first_name, last_name, employee_number')
        .in('user_id', userIds) : { data: [], error: null },
      vehicleIds.length > 0 ? supabaseClient
        .from('vehicles')
        .select('id, license_plate, make, model')
        .in('id', vehicleIds) : { data: [], error: null }
    ])

    if (profilesResult.error) {
      console.error('Profiles fetch error:', profilesResult.error)
    }
    if (vehiclesResult.error) {
      console.error('Vehicles fetch error:', vehiclesResult.error)
    }

    // Create lookup maps
    const profilesMap = new Map()
    profilesResult.data?.forEach(profile => {
      profilesMap.set(profile.user_id, profile)
    })

    const vehiclesMap = new Map()
    vehiclesResult.data?.forEach(vehicle => {
      vehiclesMap.set(vehicle.id, vehicle)
    })

    // Convert to CSV format optimized for Excel (Portuguese locale)
    const headers = [
      'Data de Saída',
      'Hora de Saída',
      'Tipo de Serviço',
      'Número de Serviço',
      'Número Total',
      'Motivo',
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
      'Matrícula Viatura',
      'Data Criação'
    ]

    console.log('Processing exits for CSV export:', exits?.length || 0)

    const csvRows = [headers.join(';')]

    for (const exit of exits || []) {
      const profile = profilesMap.get(exit.user_id)
      const vehicle = vehiclesMap.get(exit.vehicle_id)
      
      // Convert crew IDs to names
      let crewNames = '';
      if (exit.crew) {
        const crewIds = exit.crew.split(',').map((id: string) => id.trim()).filter(Boolean);
        const names = crewIds.map((id: string) => {
          const crewProfile = profilesMap.get(id);
          if (crewProfile) {
            return `${crewProfile.first_name} ${crewProfile.last_name}`.trim();
          }
          return '';
        }).filter(Boolean);
        crewNames = names.join(', ');
      }
      
      const row = [
        exit.departure_date || '',
        exit.departure_time || '',
        exit.exit_type || '',
        exit.service_number || '',
        exit.total_service_number || '',
        `"${(exit.purpose || '').replace(/"/g, '""')}"`,
        `"${(exit.patient_name || '').replace(/"/g, '""')}"`,
        exit.patient_age || '',
        exit.patient_gender || '',
        exit.patient_contact || '',
        `"${(exit.patient_district || '').replace(/"/g, '""')}"`,
        `"${(exit.patient_municipality || '').replace(/"/g, '""')}"`,
        `"${(exit.patient_parish || '').replace(/"/g, '""')}"`,
        `"${(exit.patient_address || '').replace(/"/g, '""')}"`,
        exit.ambulance_number || '',
        `"${crewNames.replace(/"/g, '""')}"`,
        `"${(exit.observations || '').replace(/"/g, '""')}"`,
        exit.status || '',
        exit.is_pem ? 'Sim' : 'Não',
        exit.is_reserve ? 'Sim' : 'Não',
        `"${((profile?.first_name || '') + ' ' + (profile?.last_name || '')).trim()}"`,
        vehicle?.license_plate || '',
        exit.created_at || ''
      ]
      csvRows.push(row.join(';'))
    }

    // Add UTF-8 BOM for Excel to properly recognize special characters
    const csv = '\uFEFF' + csvRows.join('\n')
    console.log('CSV export completed successfully')

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
      JSON.stringify({ 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})