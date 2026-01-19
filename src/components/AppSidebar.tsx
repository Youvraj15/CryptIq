import { Home, BookOpen, FlaskConical, Trophy, Shield, Sparkles } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAdmin } from "@/hooks/useAdmin";

const items = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Quiz", url: "/dashboard/quiz", icon: BookOpen },
  { title: "Labs", url: "/dashboard/labs", icon: FlaskConical },
  { title: "Rewards", url: "/dashboard/rewards", icon: Trophy },
];

export function AppSidebar() {
  const location = useLocation();
  const { isAdmin } = useAdmin();
  const currentPath = location.pathname;

  return (
    <Sidebar>
      <SidebarContent className="bg-sidebar-background">
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 rounded-lg blur-md group-hover:blur-lg transition-all" />
              <div className="relative w-9 h-9 bg-gradient-to-br from-accent to-accent/60 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent-foreground" />
              </div>
            </div>
            <span className="text-xl font-bold">
              <span className="text-sidebar-foreground">Crypt</span>
              <span className="text-accent">IQ</span>
            </span>
          </NavLink>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 p-3">
              {items.map((item) => {
                const isActive = currentPath === item.url || 
                  (item.url !== '/dashboard' && currentPath.startsWith(item.url));
                const isExactHome = item.url === '/dashboard' && currentPath === '/dashboard';
                const active = item.url === '/dashboard' ? isExactHome : isActive;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-11 rounded-xl">
                      <NavLink 
                        to={item.url} 
                        className={`flex items-center gap-3 px-3 transition-all duration-200 ${
                          active 
                            ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/25' 
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                        }`}
                      >
                        <item.icon className={`h-5 w-5 ${active ? '' : 'opacity-70'}`} />
                        <span className="font-medium">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              
              {/* Admin Link - Only visible to admins */}
              {isAdmin && (
                <>
                  <div className="my-3 mx-3 border-t border-sidebar-border/50" />
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-11 rounded-xl">
                      <NavLink 
                        to="/admin" 
                        className={`flex items-center gap-3 px-3 transition-all duration-200 ${
                          currentPath === '/admin'
                            ? 'bg-destructive/20 text-destructive border border-destructive/30' 
                            : 'text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive'
                        }`}
                      >
                        <Shield className={`h-5 w-5 ${currentPath === '/admin' ? '' : 'opacity-70'}`} />
                        <span className="font-medium">Admin Panel</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}