import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { quizId, score } = await req.json();
    if (quizId === undefined || score === undefined) {
      throw new Error('Missing quizId or score');
    }

    // Check if it's already completed
    const { data: existing } = await supabase
      .from('quiz_completions')
      .select('id')
      .eq('user_id', user.id)
      .eq('quiz_id', quizId)
      .maybeSingle();
      
    if (existing) {
       return new Response(JSON.stringify({ success: true, message: "Already recorded" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get reward from 'quizzes' table
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('jiet_reward')
      .eq('id', quizId)
      .single();

    if (quizError || !quizData) throw new Error('Quiz not found');
    
    const jietAmount = Number(quizData.jiet_reward);

    // Insert into DB, but mark as NOT rewarded
    await supabase.from('quiz_completions').insert({
      user_id: user.id,
      quiz_id: quizId,
      score: score,
      jiet_rewarded: false, // <-- The key change
      jiet_amount: jietAmount,
    });

    return new Response(JSON.stringify({ success: true, jietAmount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error recording completion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});