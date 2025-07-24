import { 
  LayoutDashboard, 
  Wrench, 
  Users, 
  Building2, 
  Shield, 
  Settings, 
  UserCog,
  KeyRound,
  Calendar
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Manutenções", url: "/manutencoes", icon: Wrench },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Empresas Terceiras", url: "/empresas", icon: Building2 },
  { title: "Equipes", url: "/equipes", icon: UserCog },
  { title: "Tipos de Manutenção", url: "/tipos-manutencao", icon: Calendar },
]

const securityItems = [
  { title: "Cofre de Senhas", url: "/cofre", icon: KeyRound },
]

const systemItems = [
  { title: "Usuários", url: "/usuarios", icon: Settings },
  { title: "Permissões", url: "/permissoes", icon: Shield },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const isCollapsed = state === "collapsed"

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/"
    return currentPath.startsWith(path)
  }

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold border-r-3 border-sidebar-ring shadow-lg" 
      : "hover:bg-sidebar-accent text-sidebar-foreground transition-all duration-200 hover:text-sidebar-accent-foreground"

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        {/* Logo/Brand */}
        <div className="p-4 border-b border-sidebar-border bg-gradient-to-r from-sidebar-accent to-sidebar-background">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-sidebar-primary to-sidebar-ring rounded-lg flex items-center justify-center shadow-lg">
              <Wrench className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-bold text-lg text-sidebar-foreground tracking-wide">Maintly</h1>
                <p className="text-xs text-sidebar-foreground/70 font-medium">Gestão Profissional</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-bold uppercase tracking-wider mb-2">Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className={getNavCls}>
                      <item.icon className="mr-3 h-5 w-5" />
                      {!isCollapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Security Section */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-bold uppercase tracking-wider mb-2">Segurança</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {securityItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="mr-3 h-5 w-5" />
                      {!isCollapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Section */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-bold uppercase tracking-wider mb-2">Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="mr-3 h-5 w-5" />
                      {!isCollapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}