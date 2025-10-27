import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "https://esm.sh/@solana/web3.js@1.95.8";
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress
} from "https://esm.sh/@solana/spl-token@0.4.11";
import bs58 from "https://esm.sh/bs58@6.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Max-Age": "86400",
};

const JIET_TOKEN_MINT = "mntS6ZetAcdw5dLFFtLw3UEX3BZW5RkDPamSpEmpSbP";
const RPC_ENDPOINT = "https://api.devnet.solana.com";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🚀 Starting JIET transfer...");

    // Validate environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const privateKeyBase58 = Deno.env.get("SOLANA_WALLET_PRIVATE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    if (!privateKeyBase58) {
      throw new Error("Missing SOLANA_WALLET_PRIVATE_KEY environment variable");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("❌ Auth error:", userError);
      throw new Error("Unauthorized: " + (userError?.message || "Invalid token"));
    }

    console.log("✅ User authenticated:", user.id);

    // Parse request body
    let body;
    try {
      const text = await req.text();
      console.log("📦 Raw body:", text);
      body = JSON.parse(text);
    } catch (e) {
      throw new Error("Invalid JSON body: " + e.message);
    }

    const { quizId, score, walletAddress } = body;

    if (!quizId || score === undefined || !walletAddress) {
      throw new Error(`Missing required fields. Got: quizId=${quizId}, score=${score}, walletAddress=${walletAddress}`);
    }

    console.log(`📝 Request: quizId=${quizId}, score=${score}, wallet=${walletAddress}`);

    // Validate score
    if (score < 70) {
      throw new Error(`Score too low: ${score}%. Need 70% or higher.`);
    }

    // Check if already rewarded
    const { data: existingCompletion } = await supabase
      .from("quiz_completions")
      .select("*")
      .eq("user_id", user.id)
      .eq("quiz_id", quizId)
      .maybeSingle();

    if (existingCompletion?.jiet_rewarded) {
      console.log("⚠️ Already rewarded");
      return new Response(
        JSON.stringify({
          success: false,
          message: "You've already claimed rewards for this quiz.",
          alreadyRewarded: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get quiz reward amount
    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .select("jiet_reward")
      .eq("id", quizId)
      .single();

    if (quizError || !quizData) {
      throw new Error("Quiz not found: " + quizError?.message);
    }

    const jietAmount = Number(quizData.jiet_reward);
    if (jietAmount <= 0) {
      throw new Error("No reward assigned for this quiz");
    }

    console.log(`💰 Reward amount: ${jietAmount} JIET`);

    // Initialize Solana connection
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    const senderKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
    const mintPublicKey = new PublicKey(JIET_TOKEN_MINT);
    const recipientPublicKey = new PublicKey(walletAddress);

    console.log(`📍 Sender: ${senderKeypair.publicKey.toString()}`);
    console.log(`📍 Recipient: ${recipientPublicKey.toString()}`);

    // Get token accounts
    const senderTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      senderKeypair.publicKey
    );
    const recipientTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      recipientPublicKey
    );

    console.log(`🏦 Sender ATA: ${senderTokenAccount.toString()}`);
    console.log(`🏦 Recipient ATA: ${recipientTokenAccount.toString()}`);

    // Check if recipient account exists
    const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
    
    const transaction = new Transaction();

    // Create recipient token account if it doesn't exist
    if (!recipientAccountInfo) {
      console.log("⚠️ Creating recipient token account...");
      transaction.add(
        createAssociatedTokenAccountInstruction(
          senderKeypair.publicKey,  // payer
          recipientTokenAccount,     // ata
          recipientPublicKey,        // owner
          mintPublicKey             // mint
        )
      );
    }

    // Add transfer instruction (6 decimals for JIET)
    const amount = BigInt(Math.floor(jietAmount * 1_000_000));
    console.log(`💸 Transferring: ${amount} (${jietAmount} JIET)`);

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

    // Send transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderKeypair.publicKey;

    console.log("📤 Sending transaction...");
    const signature = await connection.sendTransaction(transaction, [senderKeypair]);
    console.log("✅ Transaction sent:", signature);

    // Confirm transaction
    console.log("⏳ Confirming transaction...");
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });

    if (confirmation.value.err) {
      throw new Error("Transaction failed: " + JSON.stringify(confirmation.value.err));
    }

    console.log("✅ Transaction confirmed!");

    // Save to database
    const completionData = {
      user_id: user.id,
      quiz_id: quizId,
      score,
      jiet_rewarded: true,
      jiet_amount: jietAmount,
      wallet_address: walletAddress,
      transaction_signature: signature,
    };

    if (existingCompletion) {
      await supabase
        .from("quiz_completions")
        .update(completionData)
        .eq("id", existingCompletion.id);
    } else {
      await supabase.from("quiz_completions").insert(completionData);
    }

    console.log("✅ Database updated");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully transferred ${jietAmount} JIET tokens!`,
        signature,
        amount: jietAmount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});