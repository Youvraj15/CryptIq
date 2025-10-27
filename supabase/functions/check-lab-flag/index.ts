import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // We now expect 'task_id' instead of 'lab_id'
    const { task_id, submitted_flag } = await req.json()

    if (!task_id || !submitted_flag) {
      throw new Error('Missing task_id or submitted_flag')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch from the 'lab_tasks' table
    const { data: task, error } = await supabaseAdmin
      .from('lab_tasks')
      .select('flag')
      .eq('id', task_id) // Check against the task_id
      .single()

    if (error || !task) {
      throw new Error('Task not found or database error')
    }

    // Check the flag
    if (task.flag === submitted_flag) {
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