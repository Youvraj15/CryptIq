import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Coins, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useJietBalance } from "@/hooks/useJietBalance";

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const [username, setUsername] = useState<string>('');
  const { connected, disconnect } = useWallet();
  const { balance: jietBalance } = useJietBalance();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUsername(data.username || data.full_name || user.email?.split('@')[0] || 'User');
      } else if (!error) {
        // Fallback to email username part
        setUsername(user.email?.split('@')[0] || 'User');
      }
    };

    fetchProfile();
  }, [user]);

  return (
    <div className="dark min-h-screen bg-background">
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1">
            <header className="h-14 sm:h-16 flex items-center justify-between border-b border-border px-3 sm:px-6">
              <SidebarTrigger />
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden md:flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="truncate max-w-[100px] sm:max-w-none">{username}</span>
                </div>
                {connected && (
                  <>
                    <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-accent/10 rounded-lg border border-accent/20">
                      <Coins className="w-3 h-3 sm:w-4 sm:h-4 text-accent" />
                      <span className="text-xs sm:text-sm font-semibold text-accent">{jietBalance.toFixed(2)}</span>
                      <span className="hidden sm:inline text-xs sm:text-sm font-semibold text-accent">JIET</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={disconnect}
                      className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
                      title="Disconnect Wallet"
                    >
                      <Unplug className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden lg:inline text-xs sm:text-sm">Disconnect</span>
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  onClick={signOut}
                  className="flex items-center gap-1 sm:gap-2 bg-accent hover:bg-accent/90 text-accent-foreground h-8 sm:h-9 px-2 sm:px-3"
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline text-xs sm:text-sm">Sign Out</span>
                </Button>
              </div>
            </header>
            <div className="p-3 sm:p-4 md:p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}