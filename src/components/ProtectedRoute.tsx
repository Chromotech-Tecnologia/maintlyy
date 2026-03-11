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
        .select('permission_profile_id, is_admin, is_super_admin, account_status, trial_days, trial_start, is_permanent')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!data) {
        setHasProfile(false)
      } else {
        const status = (data as any).account_status || 'active'
        setAccountStatus(status)

        // Check trial expiry
        if (status === 'trial' && (data as any).trial_start && (data as any).trial_days) {
          const trialEnd = new Date((data as any).trial_start)
          trialEnd.setDate(trialEnd.getDate() + (data as any).trial_days)
          if (new Date() > trialEnd) {
            setAccountStatus('expired')
            setHasProfile(true)
            setProfileChecked(true)
            return
          }
        }

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

  // Account disabled or expired
  if (accountStatus === 'disabled' || accountStatus === 'expired') {
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
            <h1 className="text-2xl font-bold text-foreground">
              {accountStatus === 'disabled' ? 'Conta desabilitada' : 'Período de teste expirado'}
            </h1>
            <p className="text-muted-foreground">
              {accountStatus === 'disabled'
                ? 'Sua conta foi desabilitada pelo administrador. Entre em contato para mais informações.'
                : 'Seu período de teste expirou. Entre em contato com o administrador para ativar sua conta.'}
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
