import { 
  LayoutDashboard, Wrench, Users, Building2, Shield, Settings, UserCog,
  KeyRound, Calendar, Crown, FileBarChart
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { usePermissions } from "@/hooks/usePermissions"
import { cn } from "@/lib/utils"

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Manutenções", url: "/manutencoes", icon: Wrench },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Equipes", url: "/equipes", icon: UserCog },
  { title: "Tipos de Manutenção", url: "/tipos-manutencao", icon: Calendar },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart },
]

const securityItems = [
  { title: "Cofre de Senhas", url: "/cofre", icon: KeyRound },
]

const getSystemItems = (isAdmin: boolean) => {
  const items = [
    { title: isAdmin ? "Usuários" : "Minha Conta", url: "/perfil-usuarios", icon: Settings },
  ]
  if (isAdmin) {
    items.push({ title: "Perfil", url: "/permissoes", icon: Shield })
  }
  return items
}

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const isCollapsed = state === "collapsed"
  const { isAdmin, isSuperAdmin, canViewSystem } = usePermissions()
  
  const menuResourceMap: Record<string, string> = {
    "Dashboard": "dashboard",
    "Manutenções": "manutencoes",
    "Clientes": "clientes",
    "Empresas": "empresas_terceiras",
    "Equipes": "equipes",
    "Tipos de Manutenção": "tipos_manutencao",
    "Cofre de Senhas": "cofre_senhas",
    "Usuários": "perfis_usuarios",
    "Perfil": "permissoes",
    "Relatórios": "relatorios",
  }
  
  const filteredMainItems = mainItems.filter((item) => {
    if (item.title === "Dashboard" || item.title === "Relatórios") return true
    if (isAdmin) return true
    const resource = menuResourceMap[item.title]
    return resource ? canViewSystem(resource) : true
  })
  
  const filteredSecurityItems = securityItems.filter((item) => {
    if (isAdmin) return true
    const resource = menuResourceMap[item.title]
    return resource ? canViewSystem(resource) : true
  })
  
  const filteredSystemItems = getSystemItems(isAdmin).filter((item) => {
    if (isAdmin) return true
    if (item.url === "/perfil-usuarios") return true
    const resource = menuResourceMap[item.title]
    return resource ? canViewSystem(resource) : false
  })

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/"
    return currentPath.startsWith(path)
  }

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group relative flex items-center gap-3 rounded-r-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
      isActive 
        ? "bg-sidebar-accent/60 text-sidebar-foreground font-semibold border-l-[3px] border-l-primary" 
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground border-l-[3px] border-l-transparent"
    )

  const renderSection = (label: string, items: typeof mainItems) => (
    items.length > 0 && (
      <SidebarGroup className="px-3 py-1">
        <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-1 px-3">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="space-y-0.5">
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink to={item.url} end={item.url === "/"} className={getNavCls}>
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  )

  return (
    <Sidebar className={cn("hidden md:flex", isCollapsed ? "w-16" : "w-64")} collapsible="icon">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border/50">
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/30">
              <img 
                src="/lovable-uploads/90637fdc-0828-4765-9f53-c726c82d9dac.png" 
                alt="Maintly Logo" 
                className="w-8 h-8"
              />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-display font-bold text-lg text-sidebar-foreground tracking-tight">Maintly</h1>
                <p className="text-[10px] text-sidebar-foreground/40 font-medium tracking-wider uppercase">Gestão Profissional</p>
              </div>
            )}
          </div>
        </div>

        {renderSection("Principal", filteredMainItems)}
        {renderSection("Segurança", filteredSecurityItems)}
        {renderSection("Sistema", filteredSystemItems)}
        
        {/* Super Admin */}
        {isSuperAdmin && renderSection("Administração", [
          { title: "Painel Admin", url: "/super-admin", icon: Crown },
        ])}
      </SidebarContent>
    </Sidebar>
  )
}
