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

    console.log('Starting yearly counter reset...')

    // Create backup of current counters before reset
    const currentYear = new Date().getFullYear()
    const backupTableName = `service_counters_backup_${currentYear - 1}`

    // Create backup table if it doesn't exist
    const { error: createError } = await supabaseClient.rpc('create_backup_table', {
      backup_table: backupTableName
    })

    if (createError) {
      console.error('Error creating backup table:', createError)
    } else {
      console.log(`Created backup table: ${backupTableName}`)
    }

    // Reset all service counters to 0
    const { error: resetServiceError } = await supabaseClient
      .from('service_counters')
      .update({ 
        current_number: 0,
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Update all rows

    if (resetServiceError) {
      console.error('Error resetting service counters:', resetServiceError)
      throw resetServiceError
    }

    // Reset total service counter to 0
    const { error: resetTotalError } = await supabaseClient
      .from('total_service_counter')
      .update({ 
        current_number: 0,
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Update all rows

    if (resetTotalError) {
      console.error('Error resetting total counter:', resetTotalError)
      throw resetTotalError
    }

    console.log('Successfully reset all counters for new year')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Counters reset successfully for new year',
        resetDate: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Reset counters error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to reset counters',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})