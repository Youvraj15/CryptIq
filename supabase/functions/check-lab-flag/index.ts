import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define CORS headers directly inside the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lab_id, submitted_flag } = await req.json()

    if (!lab_id || !submitted_flag) {
      throw new Error('Missing lab_id or submitted_flag')
    }

    // Create a Supabase client with the Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch the correct flag from the database
    // --- THIS IS THE CORRECTED LINE ---
    const { data: lab, error } = await supabaseAdmin
      .from('labs')
      .select('flag')
      .eq('id', lab_id)
      .single()

    if (error || !lab) {
      throw new Error('Lab not found or database error')
    }

    // Check the flag
    if (lab.flag === submitted_flag) {
      return new Response(
        JSON.stringify({ success: true, message: 'Correct flag!' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Incorrect flag.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: (err as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})