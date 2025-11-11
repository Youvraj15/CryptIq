# CryptIQ

## 💡 Overview
CryptIQ is an interactive, gamified educational platform designed to teach users about blockchain technology, specifically focusing on the Solana ecosystem. It features a modern, responsive user interface and integrates decentralized technologies for hands-on learning, quizzes, and a token-based rewards system.

## ✨ Features
The application provides a comprehensive learning and user management experience, including:

* **User Authentication:** Secure login, registration, and link verification powered by Supabase.
* **Interactive Labs:** Hands-on learning modules to practice blockchain concepts (implied by `LabModal.tsx`, `Labs.tsx`, and Supabase functions like `check-lab-flag`).
* **Quizzes:** Knowledge assessments to track learning progress, with integrated rewards logic (implied by `Quiz.tsx`, `QuizModal.tsx`, `record-quiz-completion`).
* **Personalized Dashboard:** A central hub for users to view their progress and key statistics.
* **Rewards System:** Integrates with the Solana blockchain to manage and reward users with tokens (e.g., JIET Token, based on `useJietBalance.tsx` and transfer functions).
* **Wallet Integration:** Seamless connection and synchronization with Solana wallets using the Wallet Adapter (implied by `@solana/wallet-adapter-react` and `SolanaWalletProvider.tsx`).
* **Admin Panel:** Dedicated view for administrators to manage the platform (`Admin.tsx`).
* **Responsive UI:** Built with Shadcn UI and Tailwind CSS for a consistent experience across devices.

## 💻 Tech Stack

This project is built using a modern JavaScript/TypeScript ecosystem.

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React, TypeScript, Vite | Core application framework and build tool. |
| **Styling** | Tailwind CSS, Shadcn UI, Radix UI | Utility-first CSS framework and unstyled, accessible UI primitives. |
| **Routing** | `react-router-dom` | Client-side routing. |
| **Data Fetching** | `@tanstack/react-query` | Caching, synchronization, and state management. |
| **Authentication/DB** | Supabase (`@supabase/supabase-js`) | Backend as a Service for database and authentication. |
| **Web3/Solana** | `@solana/web3.js`, `@solana/spl-token`, Wallet Adapters | Interacting with the Solana blockchain for token transfers and wallet management. |
| **Forms** | `react-hook-form`, `zod` | Performant and flexible forms with schema validation. |
| **Visualization**| `recharts` | Data visualization and charts for the Dashboard. |

---

## 🚀 Quick Start

### Prerequisites

* Node.js (LTS recommended)
* A package manager (npm, yarn, or pnpm)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [repository-url]
    cd CryptIq
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root directory and add your configuration details. This is essential for connecting to your Supabase and Solana environments.

    ```bash
    # Supabase Configuration
    VITE_SUPABASE_URL="[Your Supabase Project URL]"
    VITE_SUPABASE_ANON_KEY="[Your Supabase Anon Key]"

    # Solana Configuration
    VITE_SOLANA_RPC_URL="[Your Solana RPC Endpoint]"
    VITE_SOLANA_REWARD_TOKEN_MINT="[Solana Token Mint Address for Rewards]"
    # ... any other Solana/Supabase credentials
    ```

### Running the Project

Run the development server:

```bash
npm run dev
