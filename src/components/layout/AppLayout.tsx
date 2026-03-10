import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { MobileNav } from "./MobileNav"
import { LogOut, User, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "next-themes"
import { toast } from "sonner"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success("Logout realizado com sucesso!")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-40 h-16 border-b border-border/50 bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hidden md:flex" />
              <div className="flex md:hidden items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <img 
                    src="/lovable-uploads/90637fdc-0828-4765-9f53-c726c82d9dac.png" 
                    alt="Maintly" 
                    className="w-5 h-5"
                  />
                </div>
                <span className="font-display font-bold text-base">Maintly</span>
              </div>
              <div className="hidden md:block text-sm text-muted-foreground font-medium">
                Sistema de Gestão de Manutenções
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground mr-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="hidden lg:inline text-xs font-medium">{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-9 w-9 rounded-xl"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
            {children}
          </main>

          {/* Mobile Bottom Nav */}
          <MobileNav />
        </div>
      </div>
    </SidebarProvider>
  )
}
