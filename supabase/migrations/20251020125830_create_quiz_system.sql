/*
  # Quiz System Database Schema

  ## Overview
  Creates comprehensive database structure for quiz functionality including quiz metadata, 
  user completions, and reward tracking.

  ## New Tables
  
  ### `quizzes`
  Stores quiz metadata and configuration
  - `id` (integer, primary key) - Unique quiz identifier
  - `title` (text) - Quiz title
  - `description` (text) - Quiz description
  - `difficulty` (text) - Difficulty level (Beginner, Intermediate, Advanced)
  - `xp_reward` (integer) - XP points awarded for completion
  - `jiet_reward` (numeric) - JIET tokens awarded for 70%+ score
  - `duration_minutes` (integer) - Expected completion time
  - `question_count` (integer) - Number of questions
  - `is_locked` (boolean) - Whether quiz requires prerequisites
  - `sort_order` (integer) - Display order
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `quiz_questions`
  Stores individual quiz questions and answers
  - `id` (uuid, primary key) - Unique question identifier
  - `quiz_id` (integer, foreign key) - References quizzes table
  - `question_text` (text) - The question
  - `options` (jsonb) - Array of answer options
  - `correct_answer_index` (integer) - Index of correct answer
  - `explanation` (text) - Explanation of correct answer
  - `sort_order` (integer) - Question order within quiz
  - `created_at` (timestamptz) - Creation timestamp

  ### `quiz_completions`
  Tracks user quiz attempts and rewards
  - `id` (uuid, primary key) - Unique completion identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `quiz_id` (integer, foreign key) - References quizzes table
  - `score` (integer) - Percentage score (0-100)
  - `jiet_rewarded` (boolean) - Whether JIET tokens have been claimed
  - `completed_at` (timestamptz) - Completion timestamp
  - `created_at` (timestamptz) - Record creation timestamp
  - Unique constraint on (user_id, quiz_id)

  ## Security
  
  ### Row Level Security (RLS)
  All tables have RLS enabled with specific policies:
  
  #### quizzes table
  - Public read access for authenticated users
  
  #### quiz_questions table  
  - Public read access for authenticated users
  
  #### quiz_completions table
  - Users can read their own completions
  - Users can insert their own completions
  - Users can update their own completions (for score updates and reward claims)

  ## Important Notes
  1. Uses IF NOT EXISTS to safely handle re-runs
  2. JIET rewards are only claimable once per quiz (tracked via jiet_rewarded)
  3. Score can be updated to track best score or latest attempt
  4. All timestamps use timestamptz for timezone awareness
*/

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id integer PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  xp_reward integer NOT NULL DEFAULT 0,
  jiet_reward numeric(10, 2) NOT NULL DEFAULT 10.00,
  duration_minutes integer NOT NULL DEFAULT 15,
  question_count integer NOT NULL DEFAULT 5,
  is_locked boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id integer NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer_index integer NOT NULL,
  explanation text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create quiz_completions table
CREATE TABLE IF NOT EXISTS quiz_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id integer NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  jiet_rewarded boolean NOT NULL DEFAULT false,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, quiz_id)
);

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quizzes (public read)
CREATE POLICY "Anyone can view quizzes"
  ON quizzes
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for quiz_questions (public read)
CREATE POLICY "Anyone can view quiz questions"
  ON quiz_questions
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for quiz_completions
CREATE POLICY "Users can view own completions"
  ON quiz_completions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
  ON quiz_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completions"
  ON quiz_completions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_completions_user_id ON quiz_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_completions_quiz_id ON quiz_completions(quiz_id);

-- Insert quiz metadata
INSERT INTO quizzes (id, title, description, difficulty, xp_reward, jiet_reward, duration_minutes, question_count, is_locked, sort_order)
VALUES
  (1, 'Blockchain Basics', 'Learn the fundamentals of blockchain technology', 'Beginner', 100, 10.00, 15, 5, false, 1),
  (2, 'Cryptocurrency Fundamentals', 'Understanding Bitcoin, Ethereum, and altcoins', 'Beginner', 150, 15.00, 20, 5, false, 2),
  (3, 'Smart Contracts', 'Deep dive into smart contract development', 'Intermediate', 200, 20.00, 18, 5, false, 3),
  (4, 'DeFi Protocols', 'Explore decentralized finance ecosystems', 'Intermediate', 250, 25.00, 25, 5, false, 4),
  (5, 'NFT & Web3', 'Non-fungible tokens and Web3 applications', 'Advanced', 300, 30.00, 20, 5, false, 5),
  (6, 'Crypto Security', 'Advanced security practices and wallet management', 'Advanced', 350, 35.00, 22, 5, true, 6)
ON CONFLICT (id) DO NOTHING;

-- Insert quiz questions for Quiz 1: Blockchain Basics
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer_index, explanation, sort_order)
VALUES
  (1, 'What is a blockchain?', 
   '["A type of cryptocurrency", "A distributed ledger technology", "A mining algorithm", "A wallet application"]'::jsonb,
   1, 'A blockchain is a distributed ledger technology that records transactions across multiple computers in a way that makes it difficult to alter retroactively.', 1),
  
  (1, 'What does ''decentralized'' mean in blockchain context?',
   '["Controlled by a single entity", "No one can use it", "Distributed across multiple nodes with no central authority", "Only governments can access it"]'::jsonb,
   2, 'Decentralization means the network is distributed across multiple nodes worldwide with no single point of control or failure.', 2),
  
  (1, 'What is a ''block'' in blockchain?',
   '["A physical device", "A group of transactions bundled together", "A type of cryptocurrency", "A mining computer"]'::jsonb,
   1, 'A block is a collection of transactions that are bundled together and added to the blockchain after validation.', 3),
  
  (1, 'What is mining in blockchain?',
   '["Extracting gold from computers", "The process of validating transactions and adding blocks", "Buying cryptocurrency", "Creating wallets"]'::jsonb,
   1, 'Mining is the process of validating transactions and adding new blocks to the blockchain, typically rewarded with cryptocurrency.', 4),
  
  (1, 'What makes blockchain secure?',
   '["Password protection", "Antivirus software", "Cryptographic hashing and distributed consensus", "Firewalls"]'::jsonb,
   2, 'Blockchain security comes from cryptographic hashing, distributed consensus mechanisms, and the immutability of the chain.', 5);

-- Insert quiz questions for Quiz 2: Cryptocurrency Fundamentals
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer_index, explanation, sort_order)
VALUES
  (2, 'What was the first cryptocurrency?',
   '["Ethereum", "Bitcoin", "Ripple", "Litecoin"]'::jsonb,
   1, 'Bitcoin, created by Satoshi Nakamoto in 2009, was the first cryptocurrency and remains the most valuable.', 1),
  
  (2, 'What is Ethereum primarily used for?',
   '["Only as a currency", "Smart contracts and decentralized applications", "Government transactions", "Banking only"]'::jsonb,
   1, 'Ethereum is a blockchain platform designed for smart contracts and decentralized applications (dApps), not just as a currency.', 2),
  
  (2, 'What is a cryptocurrency wallet?',
   '["A physical wallet for coins", "A bank account", "Software that stores private keys to access crypto", "A mining device"]'::jsonb,
   2, 'A cryptocurrency wallet is software that stores your private keys, allowing you to send, receive, and manage your cryptocurrency.', 3),
  
  (2, 'What is an altcoin?',
   '["Alternative to Bitcoin", "A fake cryptocurrency", "A physical coin", "A mining tool"]'::jsonb,
   0, 'An altcoin is any cryptocurrency alternative to Bitcoin, including Ethereum, Litecoin, and thousands of others.', 4),
  
  (2, 'What does ''HODL'' mean in crypto?',
   '["Hold On for Dear Life - keep your crypto long-term", "A type of wallet", "A trading strategy", "A cryptocurrency name"]'::jsonb,
   0, 'HODL originated from a misspelling of ''hold'' and now means holding cryptocurrency long-term despite market volatility.', 5);

-- Insert quiz questions for Quiz 3: Smart Contracts
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer_index, explanation, sort_order)
VALUES
  (3, 'What is a smart contract?',
   '["A paper contract", "Self-executing code on blockchain", "A lawyer agreement", "A phone app"]'::jsonb,
   1, 'A smart contract is self-executing code deployed on a blockchain that automatically enforces agreement terms when conditions are met.', 1),
  
  (3, 'Which language is commonly used for Ethereum smart contracts?',
   '["Python", "JavaScript", "Solidity", "Java"]'::jsonb,
   2, 'Solidity is the primary programming language used to write smart contracts on the Ethereum blockchain.', 2),
  
  (3, 'What is gas in Ethereum?',
   '["Fuel for cars", "Fee to execute transactions and contracts", "A cryptocurrency", "Mining hardware"]'::jsonb,
   1, 'Gas is the fee required to execute transactions or smart contracts on the Ethereum network, paid in ETH.', 3),
  
  (3, 'Can smart contracts be changed after deployment?',
   '["Yes, anytime", "Only by admin", "Generally no, they are immutable", "Only on weekends"]'::jsonb,
   2, 'Smart contracts are typically immutable once deployed, meaning their code cannot be changed, ensuring transparency and trust.', 4),
  
  (3, 'What is a common use case for smart contracts?',
   '["Making coffee", "Decentralized exchanges and DeFi", "Playing video games", "Social media posts"]'::jsonb,
   1, 'Smart contracts are commonly used in decentralized exchanges (DEX), DeFi protocols, NFTs, and automated financial agreements.', 5);

-- Insert quiz questions for Quiz 4: DeFi Protocols
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer_index, explanation, sort_order)
VALUES
  (4, 'What does DeFi stand for?',
   '["Decentralized Finance", "Digital Finance", "Defined Finance", "Deferred Finance"]'::jsonb,
   0, 'DeFi stands for Decentralized Finance, which refers to financial services built on blockchain without traditional intermediaries.', 1),
  
  (4, 'What is liquidity in DeFi?',
   '["How much water is in the pool", "Available assets for trading", "A type of coin", "Mining power"]'::jsonb,
   1, 'Liquidity refers to how easily assets can be traded or exchanged in a DeFi protocol without significant price impact.', 2),
  
  (4, 'What is yield farming?',
   '["Growing vegetables", "Earning rewards by providing liquidity", "Mining Bitcoin", "Trading stocks"]'::jsonb,
   1, 'Yield farming involves providing liquidity to DeFi protocols in exchange for rewards, typically in the form of interest or tokens.', 3),
  
  (4, 'What is a DEX?',
   '["Decentralized Exchange", "Digital Exchange", "Data Exchange", "Direct Exchange"]'::jsonb,
   0, 'A DEX (Decentralized Exchange) allows peer-to-peer cryptocurrency trading without a central authority or intermediary.', 4),
  
  (4, 'What are liquidity pools?',
   '["Swimming pools", "Collections of locked funds for trading", "Mining farms", "Storage devices"]'::jsonb,
   1, 'Liquidity pools are smart contracts containing locked crypto assets that provide liquidity for decentralized trading.', 5);

-- Insert quiz questions for Quiz 5: NFT & Web3
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer_index, explanation, sort_order)
VALUES
  (5, 'What does NFT stand for?',
   '["New Financial Token", "Non-Fungible Token", "Network File Transfer", "Next Future Technology"]'::jsonb,
   1, 'NFT stands for Non-Fungible Token, representing unique digital assets that cannot be replicated or exchanged one-to-one.', 1),
  
  (5, 'What is Web3?',
   '["The third version of a website", "Decentralized internet built on blockchain", "A web browser", "A programming language"]'::jsonb,
   1, 'Web3 represents the vision of a decentralized internet built on blockchain technology, giving users control of their data.', 2),
  
  (5, 'What makes an NFT unique?',
   '["Its color", "Unique token ID on blockchain", "The file size", "The creator''s name"]'::jsonb,
   1, 'Each NFT has a unique token ID recorded on the blockchain, making it distinguishable and non-interchangeable.', 3),
  
  (5, 'What is minting an NFT?',
   '["Making physical coins", "Creating and recording a new NFT on blockchain", "Buying an NFT", "Selling artwork"]'::jsonb,
   1, 'Minting is the process of creating a new NFT and recording it on the blockchain, establishing ownership and authenticity.', 4),
  
  (5, 'What is a DAO in Web3?',
   '["Digital Art Object", "Decentralized Autonomous Organization", "Data Access Option", "Direct Asset Ownership"]'::jsonb,
   1, 'A DAO is a Decentralized Autonomous Organization governed by smart contracts and community voting rather than central leadership.', 5);

-- Insert quiz questions for Quiz 6: Crypto Security
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer_index, explanation, sort_order)
VALUES
  (6, 'What is a private key?',
   '["A password for your email", "Secret cryptographic code to access your crypto", "A physical key", "Your username"]'::jsonb,
   1, 'A private key is a secret cryptographic code that gives you ownership and control over your cryptocurrency holdings.', 1),
  
  (6, 'What is two-factor authentication (2FA)?',
   '["Using two passwords", "Extra security layer requiring second verification", "Having two wallets", "Trading twice"]'::jsonb,
   1, 'Two-factor authentication adds an extra security layer by requiring a second form of verification beyond just a password.', 2),
  
  (6, 'What is a cold wallet?',
   '["A wallet stored in a freezer", "Offline storage for cryptocurrency", "A wallet app", "A bank account"]'::jsonb,
   1, 'A cold wallet stores cryptocurrency offline, providing maximum security by keeping private keys away from internet threats.', 3),
  
  (6, 'What is phishing in crypto?',
   '["A type of fishing", "Fraudulent attempts to steal crypto credentials", "Mining method", "Trading strategy"]'::jsonb,
   1, 'Phishing involves fraudulent attempts to trick users into revealing sensitive information like passwords or private keys.', 4),
  
  (6, 'Why should you never share your seed phrase?',
   '["It''s bad luck", "Anyone with it can access and steal your crypto", "It expires", "It''s against the law"]'::jsonb,
   1, 'Your seed phrase provides complete access to your cryptocurrency. Anyone who has it can steal all your funds.', 5);
