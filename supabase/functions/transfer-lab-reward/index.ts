import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Connection, Keypair, PublicKey, Transaction } from "https://esm.sh/@solana/web3.js@1.98.0";
import { 
  TOKEN_PROGRAM_ID, 
  createTransferInstruction, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} from "https://esm.sh/@solana/spl-token@0.4.14";
import bs58 from "https://esm.sh/bs58@5.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const JIET_TOKEN_MINT = "mntS6ZetAcdw5dLFFtLw3UEX3BZW5RkDPamSpEmpSbP";
const LAB_REWARD_AMOUNT = 15; // 15 JIET tokens per lab task
const TOKEN_DECIMALS = 9;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Lab reward request received');
    
    // 1. Setup Supabase
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
    const { taskId, walletAddress } = await req.json();
    if (!taskId || !walletAddress) {
      throw new Error('taskId and walletAddress are required');
    }

    console.log(`✅ Processing lab reward for user ${user.id}, task ${taskId}`);

    // 4. Check if already rewarded
    const { data: existingCompletions, error: selectError } = await supabase
      .from('lab_completions')
      .select('*')
      .eq('user_id', user.id)
      .eq('task_id', taskId);

    if (selectError) {
      throw selectError;
    }

    const existingCompletion = existingCompletions && existingCompletions.length > 0 ? existingCompletions[0] : null;

    if (existingCompletion && existingCompletion.jiet_rewarded) {
      console.log('⚠️ Reward already claimed');
      return new Response(JSON.stringify({ 
        success: false, 
        alreadyRewarded: true, 
        error: "Reward already claimed." 
      }), {
        status: 409, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 5. Send Solana transaction
    console.log('💰 Sending JIET tokens...');
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
      console.log('✅ Recipient token account exists');
    } catch (error: any) {
      if (error?.message?.includes('could not find account')) {
        console.log('🔨 Creating recipient token account...');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            senderKeypair.publicKey,
            recipientTokenAccount,
            recipientPublicKey,
            mintPublicKey
          )
        );
      } else {
        throw error;
      }
    }

    const amount = BigInt(Math.floor(LAB_REWARD_AMOUNT * Math.pow(10, TOKEN_DECIMALS)));

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

    console.log(`🎉 Transaction successful: ${signature}`);

    // 6. Save to database
    const { error: upsertError } = await supabase
      .from('lab_completions')
      .upsert({
        user_id: user.id,
        lab_id: 1, // Will be updated based on task
        task_id: taskId,
        jiet_rewarded: true,
        jiet_amount: LAB_REWARD_AMOUNT,
        wallet_address: walletAddress,
        transaction_signature: signature
      }, { onConflict: 'user_id,task_id' });

    if (upsertError) throw upsertError;

    console.log('✅ Reward recorded in database');

    // 7. Return success
    return new Response(JSON.stringify({ 
      success: true, 
      amount: LAB_REWARD_AMOUNT, 
      signature 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error claiming lab reward:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
