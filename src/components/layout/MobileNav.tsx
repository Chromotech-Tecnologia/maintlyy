import { 
  LayoutDashboard, Wrench, Users, KeyRound, Menu, Building2,
  UserCog, Calendar, Shield, Settings, ChevronRight, Crown
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { usePermissions } from "@/hooks/usePermissions"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const bottomNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Manutenções", url: "/manutencoes", icon: Wrench },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Cofre", url: "/cofre", icon: KeyRound },
]

const allNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, section: "Principal" },
  { title: "Manutenções", url: "/manutencoes", icon: Wrench, section: "Principal" },
  { title: "Clientes", url: "/clientes", icon: Users, section: "Principal" },
  { title: "Empresas", url: "/empresas", icon: Building2, section: "Principal" },
  { title: "Equipes", url: "/equipes", icon: UserCog, section: "Principal" },
  { title: "Tipos de Manutenção", url: "/tipos-manutencao", icon: Calendar, section: "Principal" },
  { title: "Cofre de Senhas", url: "/cofre", icon: KeyRound, section: "Segurança" },
]

export function MobileNav() {
  const location = useLocation()
  const currentPath = location.pathname
  const { isAdmin, isSuperAdmin, canViewSystem } = usePermissions()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const menuResourceMap: Record<string, string> = {
    "Manutenções": "manutencoes",
    "Clientes": "clientes",
    "Empresas": "empresas_terceiras",
    "Equipes": "equipes",
    "Tipos de Manutenção": "tipos_manutencao",
    "Cofre de Senhas": "cofre_senhas",
  }

  const systemItems = [
    { title: isAdmin ? "Usuários" : "Minha Conta", url: "/perfil-usuarios", icon: Settings, section: "Sistema" },
    ...(isAdmin ? [{ title: "Perfil de Permissões", url: "/permissoes", icon: Shield, section: "Sistema" }] : []),
    ...(isSuperAdmin ? [{ title: "Painel Admin", url: "/super-admin", icon: Crown, section: "Administração" }] : []),
  ]

  const filteredNavItems = allNavItems.filter((item) => {
    if (item.title === "Dashboard") return true
    if (isAdmin) return true
    const resource = menuResourceMap[item.title]
    return resource ? canViewSystem(resource) : true
  })

  const allItems = [...filteredNavItems, ...systemItems]

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/"
    return currentPath.startsWith(path)
  }

  const sections = Array.from(new Set(allItems.map(i => i.section)))

  return (
    <>
      <nav className="mobile-bottom-nav md:hidden">
        <div className="flex items-center justify-around px-2 pt-1">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className={() => cn("mobile-nav-item", isActive(item.url) && "active")}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.title}</span>
            </NavLink>
          ))}
          
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button className="mobile-nav-item">
                <Menu className="h-5 w-5" />
                <span className="text-[10px] font-medium">Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl p-0 bg-card/95 backdrop-blur-xl">
              <div className="p-6 space-y-6">
                <div className="flex justify-center -mt-2">
                  <div className="w-10 h-1 rounded-full bg-border" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    <img src="/lovable-uploads/90637fdc-0828-4765-9f53-c726c82d9dac.png" alt="Maintly" className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg">Maintly</h2>
                    <p className="text-xs text-muted-foreground">Menu de Navegação</p>
                  </div>
                </div>
                <div className="space-y-5 overflow-y-auto max-h-[calc(70vh-160px)]">
                  {sections.map(section => (
                    <div key={section}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2 px-1">{section}</p>
                      <div className="space-y-1">
                        {allItems.filter(i => i.section === section).map((item) => (
                          <NavLink
                            key={item.url}
                            to={item.url}
                            end={item.url === "/"}
                            onClick={() => setDrawerOpen(false)}
                            className={() => cn(
                              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                              isActive(item.url) 
                                ? "gradient-primary text-primary-foreground shadow-md" 
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            <span className="flex-1">{item.title}</span>
                            <ChevronRight className="h-4 w-4 opacity-40" />
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  )
}
