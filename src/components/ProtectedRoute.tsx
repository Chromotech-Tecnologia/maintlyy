import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { ShieldAlert, LogOut, Clock, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth()
  const location = useLocation()
  const [profileChecked, setProfileChecked] = useState(false)
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const [accountStatus, setAccountStatus] = useState<string>('active')

  useEffect(() => {
    if (!user) return

    const checkProfile = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('permission_profile_id, is_admin, is_super_admin, account_status')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!data) {
        setHasProfile(false)
      } else {
        const status = (data as any).account_status || 'active'
        setAccountStatus(status)

        if (status === 'disabled') {
          setHasProfile(true)
          setProfileChecked(true)
          return
        }

        if ((data as any).is_super_admin || data.is_admin) {
          setHasProfile(true)
        } else if (!data.permission_profile_id) {
          setHasProfile(false)
        } else {
          setHasProfile(true)
        }
      }
      setProfileChecked(true)
    }

    checkProfile()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace />

  if (!profileChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  // Account disabled or cancelled
  if (accountStatus === 'disabled' || accountStatus === 'cancelled') {
    // Allow access to /assinaturas when cancelled
    if (accountStatus === 'cancelled' && location.pathname === '/assinaturas') {
      return <>{children}</>
    }

    const handleSignOut = async () => { try { await signOut() } catch { toast.error("Erro ao sair") } }

    const titleMap: Record<string, string> = {
      disabled: 'Conta desabilitada',
      cancelled: 'Plano cancelado',
    }
    const descriptionMap: Record<string, string> = {
      disabled: 'Sua conta foi desabilitada pelo administrador. Entre em contato para mais informações.',
      cancelled: 'Seu plano foi cancelado. Escolha um novo plano para continuar utilizando o Maintly.',
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-destructive/10 rounded-full">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {titleMap[accountStatus]}
            </h1>
            <p className="text-muted-foreground">
              {descriptionMap[accountStatus]}
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Conta conectada:</p>
            <p>{user.email}</p>
          </div>
          {accountStatus === 'cancelled' && (
            <Button asChild className="w-full">
              <a href="/assinaturas">
                <CreditCard className="h-4 w-4 mr-2" />
                Ver Planos
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={handleSignOut} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </Button>
        </div>
      </div>
    )
  }

  // Account pending activation
  if (accountStatus === 'pending') {
    const handleSignOut = async () => { try { await signOut() } catch { toast.error("Erro ao sair") } }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-amber-500/10 rounded-full">
              <Clock className="h-12 w-12 text-amber-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Aguardando ativação</h1>
            <p className="text-muted-foreground">
              Sua conta foi criada com sucesso e está aguardando ativação pelo administrador do sistema.
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Conta conectada:</p>
            <p>{user.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </Button>
        </div>
      </div>
    )
  }

  if (!hasProfile) {
    const handleSignOut = async () => { try { await signOut() } catch { toast.error("Erro ao sair") } }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-destructive/10 rounded-full">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Acesso não configurado</h1>
            <p className="text-muted-foreground">
              Sua conta ainda não possui um perfil de permissão atribuído.
              Entre em contato com o administrador do sistema para liberar seu acesso.
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Conta conectada:</p>
            <p>{user.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
