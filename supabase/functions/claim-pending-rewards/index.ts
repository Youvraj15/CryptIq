import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Connection, Keypair, PublicKey, Transaction } from "https://esm.sh/@solana/web3.js@1.87.6";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from "https://esm.sh/@solana/spl-token@0.3.11";
import bs58 from "https://esm.sh/bs58@5.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JIET_TOKEN_MINT = "mntS6ZetAcdw5dLFFtLw3UEX3BZW5RkDPamSpEmpSbP";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const privateKeyBase58 = Deno.env.get('SOLANA_WALLET_PRIVATE_KEY')!;
    if (!privateKeyBase58) throw new Error('Server not configured');

    // Get user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');
    
    const { walletAddress } = await req.json();
    if (!walletAddress) throw new Error('Wallet address required');

    // 1. Find all unclaimed quiz rewards
    const { data: unclaimedQuiz, error: selectQuizError } = await supabase
      .from('quiz_completions')
      .select('id, jiet_amount')
      .eq('user_id', user.id)
      .eq('jiet_rewarded', false)
      .gt('jiet_amount', 0);

    if (selectQuizError) throw selectQuizError;

    // 2. Find all unclaimed lab rewards
    const { data: unclaimedLab, error: selectLabError } = await supabase
      .from('lab_completions')
      .select('id, jiet_amount')
      .eq('user_id', user.id)
      .eq('jiet_rewarded', false)
      .gt('jiet_amount', 0);

    if (selectLabError) throw selectLabError;

    const hasQuizRewards = unclaimedQuiz && unclaimedQuiz.length > 0;
    const hasLabRewards = unclaimedLab && unclaimedLab.length > 0;

    if (!hasQuizRewards && !hasLabRewards) {
      return new Response(JSON.stringify({ success: true, totalClaimed: 0, message: "No pending rewards found" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 3. Calculate total
    let totalToClaim = 0;
    const quizCompletionIds = unclaimedQuiz?.map(r => r.id) || [];
    const labCompletionIds = unclaimedLab?.map(r => r.id) || [];
    
    if (hasQuizRewards) {
      totalToClaim += unclaimedQuiz.reduce((sum, r) => sum + Number(r.jiet_amount), 0);
    }
    if (hasLabRewards) {
      totalToClaim += unclaimedLab.reduce((sum, r) => sum + Number(r.jiet_amount), 0);
    }
    
    if (totalToClaim <= 0) {
      return new Response(JSON.stringify({ success: true, totalClaimed: 0, message: "No amount to claim" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Send one transaction
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const senderKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
    const mintPublicKey = new PublicKey(JIET_TOKEN_MINT);
    const recipientPublicKey = new PublicKey(walletAddress);

    // Detect token program (Token-2022 or Legacy)
    const mintInfo = await connection.getAccountInfo(mintPublicKey);
    const tokenProgramId = mintInfo?.owner?.toString() === TOKEN_2022_PROGRAM_ID.toString() 
      ? TOKEN_2022_PROGRAM_ID 
      : TOKEN_PROGRAM_ID;

    console.log(`🔍 Detected token program: ${tokenProgramId.toString()}`);

    const senderTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey, 
      senderKeypair.publicKey,
      false,
      tokenProgramId
    );
    const recipientTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey, 
      recipientPublicKey,
      false,
      tokenProgramId
    );

    console.log(`💰 Sender token account: ${senderTokenAccount.toString()}`);
    console.log(`💰 Recipient token account: ${recipientTokenAccount.toString()}`);

    // Verify sender has tokens
    try {
      const senderAccount = await getAccount(connection, senderTokenAccount, 'confirmed', tokenProgramId);
      const senderBalance = Number(senderAccount.amount) / 1_000_000;
      console.log(`💎 Sender balance: ${senderBalance} JIET`);
      
      if (senderBalance < totalToClaim) {
        throw new Error(`Insufficient balance. Has ${senderBalance} JIET, needs ${totalToClaim} JIET`);
      }
    } catch (error) {
      console.error('❌ Sender token account error:', error);
      throw new Error('Reward wallet not funded or token account missing');
    }

    // Check if recipient token account exists, create if needed
    const transaction = new Transaction();
    try {
      await getAccount(connection, recipientTokenAccount, 'confirmed', tokenProgramId);
      console.log('✅ Recipient token account exists');
    } catch (error) {
      console.log('📝 Creating recipient token account...');
      transaction.add(
        createAssociatedTokenAccountInstruction(
          senderKeypair.publicKey,
          recipientTokenAccount,
          recipientPublicKey,
          mintPublicKey,
          tokenProgramId
        )
      );
    }

    // Assuming 6 decimals
    const amount = BigInt(Math.floor(totalToClaim * 1_000_000000));
    console.log(`💸 Transferring ${totalToClaim} JIET (${amount.toString()} smallest units)`);

    transaction.add(
      createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount,
        senderKeypair.publicKey,
        amount,
        [],
        tokenProgramId
      )
    );
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderKeypair.publicKey;
    
    console.log('🚀 Sending transaction...');
    const signature = await connection.sendTransaction(transaction, [senderKeypair], {
      preflightCommitment: 'confirmed',
    });
    console.log(`📝 Transaction signature: ${signature}`);
    
    console.log('⏳ Confirming transaction (polling)...');
    // Poll for confirmation to avoid WebSocket usage in Edge runtime
    const start = Date.now();
    const timeoutMs = 60000; // 60s
    let confirmed = false;
    while (Date.now() - start < timeoutMs) {
      const statusResp = await connection.getSignatureStatuses([signature]);
      const status = statusResp.value[0];
      if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
        confirmed = true;
        break;
      }
      await new Promise((res) => setTimeout(res, 1500));
    }
    if (!confirmed) {
      throw new Error('Transaction confirmation timed out');
    }
    console.log('✅ Transaction confirmed!')

    // 4. Mark all as claimed
    if (quizCompletionIds.length > 0) {
      await supabase
        .from('quiz_completions')
        .update({ jiet_rewarded: true, wallet_address: walletAddress, transaction_signature: signature })
        .in('id', quizCompletionIds);
    }

    if (labCompletionIds.length > 0) {
      await supabase
        .from('lab_completions')
        .update({ jiet_rewarded: true, wallet_address: walletAddress, transaction_signature: signature })
        .in('id', labCompletionIds);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      totalClaimed: totalToClaim, 
      signature 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error claiming rewards:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});