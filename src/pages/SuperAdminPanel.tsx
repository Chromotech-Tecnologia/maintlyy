import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { supabase } from "@/integrations/supabase/client"
import { Navigate } from "react-router-dom"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Crown, Search, MoreHorizontal, Key, Clock, CheckCircle2,
  XCircle, Trash2, Shield, Phone, Mail, User, AlertTriangle
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

interface UserProfile {
  id: string
  user_id: string
  email: string | null
  display_name: string | null
  phone: string | null
  is_admin: boolean | null
  is_super_admin: boolean | null
  account_status: string | null
  trial_days: number | null
  trial_start: string | null
  is_permanent: boolean | null
  created_at: string
}

interface AuthUser {
  id: string
  email?: string
  email_confirmed_at?: string | null
  created_at?: string
}

export default function SuperAdminPanel() {
  const { session } = useAuth()
  const { isSuperAdmin } = usePermissions()
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Dialogs
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; userId: string; email: string }>({ open: false, userId: "", email: "" })
  const [newPassword, setNewPassword] = useState("")
  const [trialDialog, setTrialDialog] = useState<{ open: boolean; userId: string; email: string }>({ open: false, userId: "", email: "" })
  const [trialDays, setTrialDays] = useState("30")
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; email: string }>({ open: false, userId: "", email: "" })
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (isSuperAdmin) fetchData()
  }, [isSuperAdmin])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch all profiles (super admin RLS allows this)
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      setProfiles((profilesData as any[]) || [])

      // Fetch auth users via edge function
      const { data: authData } = await supabase.functions.invoke('admin-operations', {
        body: { operation: 'listUsers' }
      })

      if (authData?.data?.users) {
        setAuthUsers(authData.data.users)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error("Erro ao carregar dados")
    }
    setLoading(false)
  }

  const callAdminOp = async (operation: string, userId: string, extra?: Record<string, any>) => {
    setActionLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { operation, userId, ...extra }
      })
      if (error) throw error
      return data
    } catch (error: any) {
      toast.error(error.message || "Erro na operação")
      throw error
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres")
      return
    }
    try {
      await callAdminOp('updateUserById', passwordDialog.userId, { updateData: { password: newPassword } })
      toast.success("Senha alterada com sucesso!")
      setPasswordDialog({ open: false, userId: "", email: "" })
      setNewPassword("")
    } catch {}
  }

  const handleSetTrial = async () => {
    const days = parseInt(trialDays)
    if (isNaN(days) || days < 1) {
      toast.error("Informe um número válido de dias")
      return
    }
    try {
      await callAdminOp('setTrialPeriod', trialDialog.userId, { trialDays: days })
      toast.success(`Período de teste de ${days} dias configurado!`)
      setTrialDialog({ open: false, userId: "", email: "" })
      setTrialDays("30")
      fetchData()
    } catch {}
  }

  const handleActivatePermanent = async (userId: string) => {
    try {
      await callAdminOp('activatePermanent', userId)
      toast.success("Conta ativada permanentemente!")
      fetchData()
    } catch {}
  }

  const handleDisable = async (userId: string) => {
    try {
      await callAdminOp('disableUser', userId)
      toast.success("Conta desabilitada!")
      fetchData()
    } catch {}
  }

  const handleEnable = async (userId: string) => {
    try {
      await callAdminOp('enableUser', userId)
      toast.success("Conta reabilitada!")
      fetchData()
    } catch {}
  }

  const handleDelete = async () => {
    try {
      await callAdminOp('deleteUser', deleteDialog.userId)
      toast.success("Conta excluída com sucesso!")
      setDeleteDialog({ open: false, userId: "", email: "" })
      fetchData()
    } catch {}
  }

  if (!isSuperAdmin) return <Navigate to="/" replace />

  const getAuthUser = (userId: string) => authUsers.find(u => u.id === userId)

  const getStatusBadge = (profile: UserProfile) => {
    const status = profile.account_status || 'active'
    if (profile.is_super_admin) return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Super Admin</Badge>
    if (profile.is_permanent) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Permanente</Badge>
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ativo</Badge>
      case 'pending': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pendente</Badge>
      case 'trial': {
        if (profile.trial_start && profile.trial_days) {
          const end = new Date(profile.trial_start)
          end.setDate(end.getDate() + profile.trial_days)
          const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Teste ({daysLeft > 0 ? `${daysLeft}d restantes` : 'Expirado'})</Badge>
        }
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Teste</Badge>
      }
      case 'disabled': return <Badge variant="destructive">Desabilitado</Badge>
      case 'expired': return <Badge variant="destructive">Expirado</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getEmailStatusBadge = (userId: string) => {
    const authUser = getAuthUser(userId)
    if (!authUser) return <Badge variant="secondary">—</Badge>
    return authUser.email_confirmed_at
      ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Confirmado</Badge>
      : <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pendente</Badge>
  }

  const filtered = profiles.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      (p.display_name || '').toLowerCase().includes(s) ||
      (p.email || '').toLowerCase().includes(s) ||
      (p.phone || '').toLowerCase().includes(s)
    )
  })

  // Stats
  const totalUsers = profiles.filter(p => !p.is_super_admin).length
  const activeUsers = profiles.filter(p => !p.is_super_admin && (p.account_status === 'active' || p.is_permanent)).length
  const pendingUsers = profiles.filter(p => p.account_status === 'pending').length
  const trialUsers = profiles.filter(p => p.account_status === 'trial').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10">
            <Crown className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">Gerencie todas as contas do Maintly</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalUsers}</p>
            <p className="text-xs text-muted-foreground">Total Contas</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{activeUsers}</p>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{pendingUsers}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{trialUsers}</p>
            <p className="text-xs text-muted-foreground">Em Teste</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table - Desktop */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando contas...</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((profile) => (
                  <TableRow key={profile.id} className="border-border/30 hover:bg-muted/30">
                    <TableCell className="font-medium">{profile.display_name || '—'}</TableCell>
                    <TableCell>{profile.email || '—'}</TableCell>
                    <TableCell>{getEmailStatusBadge(profile.user_id)}</TableCell>
                    <TableCell>{profile.phone || '—'}</TableCell>
                    <TableCell>{getStatusBadge(profile)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      {!profile.is_super_admin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setPasswordDialog({ open: true, userId: profile.user_id, email: profile.email || '' }); setNewPassword("") }}>
                              <Key className="h-4 w-4 mr-2" /> Alterar senha
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTrialDialog({ open: true, userId: profile.user_id, email: profile.email || '' })}>
                              <Clock className="h-4 w-4 mr-2" /> Configurar período teste
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleActivatePermanent(profile.user_id)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Ativar permanente
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {profile.account_status === 'disabled' ? (
                              <DropdownMenuItem onClick={() => handleEnable(profile.user_id)}>
                                <Shield className="h-4 w-4 mr-2" /> Reabilitar conta
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleDisable(profile.user_id)} className="text-destructive">
                                <XCircle className="h-4 w-4 mr-2" /> Desabilitar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, userId: profile.user_id, email: profile.email || '' })} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir conta
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((profile) => (
              <Card key={profile.id} className="glass-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{profile.display_name || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{profile.email || '—'}</span>
                      </div>
                      {profile.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{profile.phone}</span>
                        </div>
                      )}
                    </div>
                    {!profile.is_super_admin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setPasswordDialog({ open: true, userId: profile.user_id, email: profile.email || '' }); setNewPassword("") }}>
                            <Key className="h-4 w-4 mr-2" /> Alterar senha
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTrialDialog({ open: true, userId: profile.user_id, email: profile.email || '' })}>
                            <Clock className="h-4 w-4 mr-2" /> Período teste
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleActivatePermanent(profile.user_id)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Ativar permanente
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {profile.account_status === 'disabled' ? (
                            <DropdownMenuItem onClick={() => handleEnable(profile.user_id)}>
                              <Shield className="h-4 w-4 mr-2" /> Reabilitar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleDisable(profile.user_id)} className="text-destructive">
                              <XCircle className="h-4 w-4 mr-2" /> Desabilitar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, userId: profile.user_id, email: profile.email || '' })} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(profile)}
                    {getEmailStatusBadge(profile.user_id)}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma conta encontrada.
            </div>
          )}
        </>
      )}

      {/* Change Password Dialog */}
      <Dialog open={passwordDialog.open} onOpenChange={(open) => setPasswordDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>Alterar a senha do usuário {passwordDialog.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nova Senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialog({ open: false, userId: "", email: "" })}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={actionLoading}>
              {actionLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trial Period Dialog */}
      <Dialog open={trialDialog.open} onOpenChange={(open) => setTrialDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Período de Teste</DialogTitle>
            <DialogDescription>Definir período de teste para {trialDialog.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Dias de teste</Label>
              <Input type="number" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} min="1" placeholder="30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrialDialog({ open: false, userId: "", email: "" })}>Cancelar</Button>
            <Button onClick={handleSetTrial} disabled={actionLoading}>
              {actionLoading ? "Salvando..." : "Configurar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir conta
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta <strong>{deleteDialog.email}</strong>? Esta ação é irreversível e todos os dados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {actionLoading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
