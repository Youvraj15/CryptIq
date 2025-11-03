import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to automatically sync connected wallet address to user profile
 */
export const useWalletSync = () => {
  const { publicKey, connected } = useWallet();
  const { user } = useAuth();

  useEffect(() => {
    const syncWallet = async () => {
      if (!user || !connected || !publicKey) return;

      const walletAddress = publicKey.toString();

      try {
        // Update user profile with wallet address
        const { error } = await supabase
          .from('profiles')
          .update({ wallet_address: walletAddress })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error syncing wallet address:', error);
        } else {
          console.log('✅ Wallet address synced:', walletAddress);
        }
      } catch (err) {
        console.error('Failed to sync wallet:', err);
      }
    };

    syncWallet();
  }, [user, connected, publicKey]);
};
