import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Connection } from "https://esm.sh/@solana/web3.js@1.95.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// !!! IMPORTANT !!!
// This is your project's treasury wallet.
// This MUST match TREASURY_WALLET_ADDRESS in your Rewards.tsx
// THIS MUST BE YOUR NEW, SAFE WALLET ADDRESS
const TREASURY_WALLET_ADDRESS = Deno.env.get('TREASURY_WALLET_ADDRESS')!;

// Your Public Token Mint Address
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
    
    if (!TREASURY_WALLET_ADDRESS) {
      throw new Error("TREASURY_WALLET_ADDRESS is not set in environment secrets");
    }

    // Get user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Parse request
    const { rewardId, transactionSignature, userWalletAddress } = await req.json();
    if (!rewardId || !transactionSignature || !userWalletAddress) {
      throw new Error('Missing rewardId, transactionSignature, or userWalletAddress');
    }

    // 1. Get the reward details from DB to know the cost
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .select('cost')
      .eq('id', rewardId)
      .single();
    if (rewardError || !reward) throw new Error('Reward not found');
    
    const expectedCost = Number(reward.cost);

    // 2. Verify the Solana transaction
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const tx = await connection.getParsedTransaction(transactionSignature, {
      maxSupportedTransactionVersion: 0
    });
    if (!tx) throw new Error('Transaction not found');

    // 3. Find the transfer instruction in the transaction
    let transferVerified = false;
    const instructions = tx.transaction.message.instructions;
    
    // Check pre/post token balances for the transfer
    const preBalance = tx.meta?.preTokenBalances?.find(b => 
      b.mint === JIET_TOKEN_MINT && b.owner === userWalletAddress
    );
    const postBalance = tx.meta?.postTokenBalances?.find(b => 
      b.mint === JIET_TOKEN_MINT && b.owner === userWalletAddress
    );
    
    if (!preBalance || !postBalance) {
      throw new Error("Could not verify token balances for this transaction.");
    }
    
    const amountTransferred = (preBalance.uiTokenAmount.uiAmount || 0) - (postBalance.uiTokenAmount.uiAmount || 0);

    // Check if the treasury wallet received the funds
    const treasuryBalance = tx.meta?.postTokenBalances?.find(b => 
      b.mint === JIET_TOKEN_MINT && b.owner === TREASURY_WALLET_ADDRESS
    );
    
    if (amountTransferred >= expectedCost && treasuryBalance) {
        transferVerified = true;
    } else {
        throw new Error(`Transaction verification failed. Expected ${expectedCost} JIET, found ${amountTransferred}`);
    }

    // 4. Record the redemption in the database
    const { error: insertError } = await supabase
      .from('user_redemptions')
      .insert({
        user_id: user.id,
        reward_id: rewardId,
        cost_paid: expectedCost,
        transaction_signature: transactionSignature
      });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, message: 'Reward redeemed successfully!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error redeeming reward:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});