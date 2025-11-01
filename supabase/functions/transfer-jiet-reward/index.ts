// supabase/functions/transfer-jiet-reward/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Connection, Keypair, PublicKey, Transaction } from "https://esm.sh/@solana/web3.js@1.95.8";
import { 
  TOKEN_PROGRAM_ID, 
  createTransferInstruction, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} from "https://esm.sh/@solana/spl-token@0.4.11";
import bs58 from "https://esm.sh/bs58@6.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const JIET_TOKEN_MINT = "mntS6ZetAcdw5dLFFtLw3UEX3BZW5RkDPamSpEmpSbP";
// Define a fixed reward amount per quiz
const QUIZ_REWARD_AMOUNT = 10; // 10 JIET tokens
const MIN_SCORE_TO_CLAIM = 70; // Must score 70% or higher
const TOKEN_DECIMALS = 9; // JIET token uses 9 decimals

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Setup Supabase and Solana clients
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const privateKeyBase58 = Deno.env.get('SOLANA_WALLET_PRIVATE_KEY')!;
    if (!privateKeyBase58) throw new Error('Server not configured');

    // 2. Get user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');
    
    // 3. Get and validate request body
    const { quizId, score, walletAddress } = await req.json();
    if (!quizId || score === undefined || !walletAddress) {
      throw new Error('quizId, score, and walletAddress are required');
    }

    // 4. Check for existing completion and rules
    const { data: existingCompletion, error: selectError } = await supabase
      .from('quiz_completions')
      .maybeSingle(); // Return null if no record

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 means "no rows found", which is fine. Other errors are not.
      throw selectError;
    }

    if (score < MIN_SCORE_TO_CLAIM) {
      return new Response(JSON.stringify({ success: false, error: "Score is too low to claim." }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingCompletion && existingCompletion.jiet_rewarded) {
      return new Response(JSON.stringify({ success: false, alreadyRewarded: true, error: "Reward already claimed." }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 5. Send Solana transaction
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const senderKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
    const mintPublicKey = new PublicKey(JIET_TOKEN_MINT);
    const recipientPublicKey = new PublicKey(walletAddress);

    const senderTokenAccount = await getAssociatedTokenAddress(mintPublicKey, senderKeypair.publicKey);
    const recipientTokenAccount = await getAssociatedTokenAddress(mintPublicKey, recipientPublicKey);

    // Check if recipient token account exists, create if not
    const transaction = new Transaction();
    try {
      await getAccount(connection, recipientTokenAccount);
      console.log('Recipient token account exists');
    } catch (error: any) {
      if (error?.message?.includes('could not find account')) {
        console.log('Creating recipient token account...');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            senderKeypair.publicKey, // payer
            recipientTokenAccount,
            recipientPublicKey, // owner
            mintPublicKey
          )
        );
      } else {
        throw error;
      }
    }

    // Assuming TOKEN_DECIMALS
    const amount = BigInt(Math.floor(QUIZ_REWARD_AMOUNT * Math.pow(10, TOKEN_DECIMALS)));

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount,
        senderKeypair.publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderKeypair.publicKey;
    
    const signature = await connection.sendTransaction(transaction, [senderKeypair]);
    await connection.confirmTransaction(signature);

    // 6. Mark as claimed in database
    const { error: updateError } = await supabase
      .from('quiz_completions')
      .upsert({
        user_id: user.id,
        quiz_id: quizId,
        score: score,
        jiet_rewarded: true,
        jiet_amount: QUIZ_REWARD_AMOUNT,
        wallet_address: walletAddress,
        transaction_signature: signature
      }, { onConflict: ['user_id', 'quiz_id'] });

    if (updateError) throw updateError;

    // 7. Return success
    return new Response(JSON.stringify({ 
      success: true, 
      amount: QUIZ_REWARD_AMOUNT, 
      signature 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error claiming single reward:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});