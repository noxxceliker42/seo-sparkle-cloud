import { LayoutDashboard, PlusCircle, Network, Layers, Building2, Settings, Users, BarChart3 } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { hasMinRole, hasRole } = useAuth();

  type MinRole = "viewer" | "editor" | "admin";
  const items: Array<{ title: string; url: string; icon: typeof LayoutDashboard; minRole: MinRole }> = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, minRole: "viewer" },
    { title: "Neue Seite", url: "/", icon: PlusCircle, minRole: "editor" },
    { title: "Analysen", url: "/analysen", icon: BarChart3, minRole: "editor" },
    { title: "Cluster", url: "/cluster", icon: Layers, minRole: "editor" },
    { title: "Firmen", url: "/firmen", icon: Building2, minRole: "editor" },
    { title: "Einstellungen", url: "/settings", icon: Settings, minRole: "viewer" },
  ];

  if (hasRole("admin")) {
    items.push({ title: "Benutzer", url: "/benutzer", icon: Users, minRole: "admin" });
  }

  const visibleItems = items.filter((item) => hasMinRole(item.minRole));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div>
            <h2 className="text-lg font-bold text-sidebar-primary">SEO-OS</h2>
            <p className="text-xs text-sidebar-foreground/60">v3.1</p>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
