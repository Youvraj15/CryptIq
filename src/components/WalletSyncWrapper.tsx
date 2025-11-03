import { useWalletSync } from '@/hooks/useWalletSync';

/**
 * Wrapper component that syncs wallet on mount
 */
export const WalletSyncWrapper = ({ children }: { children: React.ReactNode }) => {
  useWalletSync();
  return <>{children}</>;
};
