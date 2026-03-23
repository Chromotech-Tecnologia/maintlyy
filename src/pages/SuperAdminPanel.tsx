import { useState, useEffect } from "react"
import { searchMatch } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { supabase } from "@/integrations/supabase/client"
import { Navigate } from "react-router-dom"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Crown, Search, MoreHorizontal, Key, Clock, CheckCircle2,
  XCircle, Trash2, Shield, Phone, Mail, User, AlertTriangle, Settings,
  Users, KeyRound, Building2, Wrench, ChevronDown, ChevronUp, CreditCard, Ban,
  Edit2
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlansManager } from "@/components/superadmin/PlansManager"

interface StatMetric {
  total: number
  recent: number
}

interface AdminWithStats {
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
  plan_id: string | null
  created_at: string
  sub_users: { display_name: string | null; email: string | null }[]
  stats: {
    usuarios: StatMetric
    clientes: StatMetric
    senhas: StatMetric
    manutencoes: StatMetric
    empresas: StatMetric
  }
}

export default function SuperAdminPanel() {
  const { session } = useAuth()
  const { isSuperAdmin, loading: permissionsLoading } = usePermissions()
  const [admins, setAdmins] = useState<AdminWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [defaultTrialDays, setDefaultTrialDays] = useState("7")
  const [savingSettings, setSavingSettings] = useState(false)
  const [expandedAdmin, setExpandedAdmin] = useState<string | null>(null)

  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; userId: string; email: string }>({ open: false, userId: "", email: "" })
  const [trialDialog, setTrialDialog] = useState<{ open: boolean; userId: string; email: string }>({ open: false, userId: "", email: "" })
  const [trialDays, setTrialDays] = useState("30")
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; email: string }>({ open: false, userId: "", email: "" })
  const [actionLoading, setActionLoading] = useState(false)
  const [activateDialog, setActivateDialog] = useState<{ open: boolean; userId: string; email: string }>({ open: false, userId: "", email: "" })
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [availablePlans, setAvailablePlans] = useState<{ id: string; nome: string; tipo: string; max_usuarios: number; max_equipes: number; max_manutencoes: number; max_empresas: number; max_senhas: number }[]>([])
  const [plansLoading, setPlansLoading] = useState(false)

  // Change plan dialog
  const [changePlanDialog, setChangePlanDialog] = useState<{ open: boolean; userId: string; email: string; currentPlanId: string | null }>({ open: false, userId: "", email: "", currentPlanId: null })
  const [changePlanId, setChangePlanId] = useState<string>("")
  const [changePlanLimits, setChangePlanLimits] = useState({ max_usuarios: 0, max_equipes: 0, max_manutencoes: 0, max_empresas: 0, max_senhas: 0 })
  const [changePlanLoading, setChangePlanLoading] = useState(false)

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData()
      fetchSettings()
    }
  }, [isSuperAdmin])

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'default_trial_days')
        .single()
      if (data?.value) setDefaultTrialDays(data.value)
    } catch {}
  }

  const saveDefaultTrialDays = async () => {
    setSavingSettings(true)
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: defaultTrialDays })
        .eq('key', 'default_trial_days')
      if (error) throw error
      toast.success("Configuração salva!")
    } catch {
      toast.error("Erro ao salvar configuração")
    }
    setSavingSettings(false)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { operation: 'getAdminStats' }
      })

      if (error) throw error
      setAdmins(data?.admins || [])
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

  const handleSendPasswordReset = async () => {
    try {
      setActionLoading(true)
      await callAdminOp('sendPasswordReset', passwordDialog.userId, { redirectTo: `${window.location.origin}/reset-password` })
      toast.success("Email de troca de senha enviado com sucesso!")
      setPasswordDialog({ open: false, userId: "", email: "" })
    } catch {} finally {
      setActionLoading(false)
    }
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

  const openActivateDialog = async (userId: string, email: string) => {
    setActivateDialog({ open: true, userId, email })
    setSelectedPlanId("")
    setPlansLoading(true)
    const { data } = await supabase.from('landing_plans').select('id, nome, tipo, max_usuarios, max_equipes, max_manutencoes, max_empresas, max_senhas').eq('ativo', true).order('ordem')
    setAvailablePlans((data || []) as any[])
    setPlansLoading(false)
  }

  const openChangePlanDialog = async (admin: AdminWithStats) => {
    setChangePlanDialog({ open: true, userId: admin.user_id, email: admin.email || '', currentPlanId: admin.plan_id })
    setChangePlanId(admin.plan_id || "")
    setPlansLoading(true)
    const { data } = await supabase.from('landing_plans').select('id, nome, tipo, max_usuarios, max_equipes, max_manutencoes, max_empresas, max_senhas').eq('ativo', true).order('ordem')
    const plans = (data || []) as any[]
    setAvailablePlans(plans)
    // Set current plan limits
    const currentPlan = plans.find(p => p.id === admin.plan_id)
    if (currentPlan) {
      setChangePlanLimits({
        max_usuarios: currentPlan.max_usuarios || 0,
        max_equipes: currentPlan.max_equipes || 0,
        max_manutencoes: currentPlan.max_manutencoes || 0,
        max_empresas: currentPlan.max_empresas || 0,
        max_senhas: currentPlan.max_senhas || 0,
      })
    }
    setPlansLoading(false)
  }

  const handleChangePlan = async () => {
    if (!changePlanId) { toast.error("Selecione um plano"); return }
    setChangePlanLoading(true)
    try {
      // Change the tenant's plan
      await callAdminOp('changeTenantPlan', changePlanDialog.userId, { planId: changePlanId })
      // Update the plan limits
      await callAdminOp('updatePlanLimits', changePlanDialog.userId, { planId: changePlanId, limits: changePlanLimits })
      toast.success("Plano e limites atualizados!")
      setChangePlanDialog({ open: false, userId: "", email: "", currentPlanId: null })
      fetchData()
    } catch {} finally {
      setChangePlanLoading(false)
    }
  }

  const handleActivatePermanent = async () => {
    if (!selectedPlanId) {
      toast.error("Selecione um plano")
      return
    }
    try {
      await callAdminOp('activatePermanent', activateDialog.userId, { planId: selectedPlanId })
      toast.success("Conta ativada permanentemente!")
      setActivateDialog({ open: false, userId: "", email: "" })
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

  const handleCancelPlan = async (userId: string) => {
    try {
      await callAdminOp('cancelPlan', userId)
      toast.success("Plano cancelado! O usuário só terá acesso à tela de assinaturas.")
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

  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />

  const getStatusBadge = (admin: AdminWithStats) => {
    const status = admin.account_status || 'active'
    if (admin.is_permanent) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Permanente</Badge>
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ativo</Badge>
      case 'trial': {
        if (admin.trial_start && admin.trial_days) {
          const end = new Date(admin.trial_start)
          end.setDate(end.getDate() + admin.trial_days)
          const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Teste ({daysLeft > 0 ? `${daysLeft}d` : 'Expirado'})</Badge>
        }
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Teste</Badge>
      }
      case 'cancelled': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Cancelado</Badge>
      case 'disabled': return <Badge variant="destructive">Desabilitado</Badge>
      case 'expired': return <Badge variant="destructive">Expirado</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Search also matches sub-user names/emails
  const filtered = admins.filter(a => {
    if (!search) return true
    if (searchMatch(a.display_name, search) || searchMatch(a.email, search)) return true
    return a.sub_users?.some(su => searchMatch(su.display_name, search) || searchMatch(su.email, search))
  })

  const totalAdmins = admins.length
  const activeAdmins = admins.filter(a => a.account_status === 'active' || a.is_permanent).length
  const trialAdmins = admins.filter(a => a.account_status === 'trial').length
  const disabledAdmins = admins.filter(a => a.account_status === 'disabled').length

  const StatCell = ({ metric, icon: Icon }: { metric: StatMetric; icon: any }) => (
    <div className="flex items-center justify-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-medium">{metric.total}</span>
      {metric.recent > 0 && (
        <span className="text-xs text-emerald-500">+{metric.recent}</span>
      )}
    </div>
  )

  const renderDropdown = (admin: AdminWithStats) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setPasswordDialog({ open: true, userId: admin.user_id, email: admin.email || '' })}>
          <Key className="h-4 w-4 mr-2" /> Solicitar troca de senha
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTrialDialog({ open: true, userId: admin.user_id, email: admin.email || '' })}>
          <Clock className="h-4 w-4 mr-2" /> Período teste
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openActivateDialog(admin.user_id, admin.email || '')}>
          <CheckCircle2 className="h-4 w-4 mr-2" /> Ativar permanente
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openChangePlanDialog(admin)}>
          <Edit2 className="h-4 w-4 mr-2" /> Mudar Plano / Limites
        </DropdownMenuItem>
        {(admin.is_permanent || admin.account_status === 'active') && (
          <DropdownMenuItem onClick={() => handleCancelPlan(admin.user_id)} className="text-amber-500">
            <Ban className="h-4 w-4 mr-2" /> Cancelar plano
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {admin.account_status === 'disabled' ? (
          <DropdownMenuItem onClick={() => handleEnable(admin.user_id)}>
            <Shield className="h-4 w-4 mr-2" /> Reabilitar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => handleDisable(admin.user_id)} className="text-destructive">
            <XCircle className="h-4 w-4 mr-2" /> Desabilitar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, userId: admin.user_id, email: admin.email || '' })} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Tabs */}
      <Tabs defaultValue="admins" className="space-y-6">
        <TabsList>
          <TabsTrigger value="admins" className="gap-1.5">
            <Crown className="h-4 w-4" /> Administradores
          </TabsTrigger>
          <TabsTrigger value="planos" className="gap-1.5">
            <CreditCard className="h-4 w-4" /> Planos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Painel Super Admin</h1>
            <p className="text-sm text-muted-foreground">Gerencie os administradores cadastrados no Maintly</p>
          </div>
        </div>
      </div>

      {/* Default Trial Config */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium whitespace-nowrap">Dias de teste para novos cadastros:</Label>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" value={defaultTrialDays} onChange={(e) => setDefaultTrialDays(e.target.value)} className="w-20 h-9" min="1" />
              <Button size="sm" onClick={saveDefaultTrialDays} disabled={savingSettings}>
                {savingSettings ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalAdmins}</p>
            <p className="text-xs text-muted-foreground">Administradores</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{activeAdmins}</p>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{trialAdmins}</p>
            <p className="text-xs text-muted-foreground">Em Teste</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{disabledAdmins}</p>
            <p className="text-xs text-muted-foreground">Desabilitados</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar admin ou sub-usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando administradores...</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                   <TableHead>Administrador</TableHead>
                   <TableHead>ID Tenant</TableHead>
                   <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Usuários</TableHead>
                  <TableHead className="text-center">Clientes</TableHead>
                  <TableHead className="text-center">Senhas</TableHead>
                  <TableHead className="text-center">Manutenções</TableHead>
                  <TableHead className="text-center">Empresas</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((admin) => (
                  <>
                    <TableRow key={admin.user_id} className="border-border/30 hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{admin.display_name || '—'}</span>
                          {admin.sub_users?.length > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setExpandedAdmin(expandedAdmin === admin.user_id ? null : admin.user_id)}
                            >
                              {expandedAdmin === admin.user_id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                       </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {admin.user_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>{admin.email || '—'}</TableCell>
                      <TableCell>{getStatusBadge(admin)}</TableCell>
                      <TableCell className="text-center"><StatCell metric={admin.stats.usuarios} icon={Users} /></TableCell>
                      <TableCell className="text-center"><StatCell metric={admin.stats.clientes} icon={Building2} /></TableCell>
                      <TableCell className="text-center"><StatCell metric={admin.stats.senhas} icon={KeyRound} /></TableCell>
                      <TableCell className="text-center"><StatCell metric={admin.stats.manutencoes} icon={Wrench} /></TableCell>
                      <TableCell className="text-center"><StatCell metric={admin.stats.empresas} icon={Building2} /></TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(admin.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        {renderDropdown(admin)}
                      </TableCell>
                    </TableRow>
                    {expandedAdmin === admin.user_id && admin.sub_users?.length > 0 && (
                      <TableRow key={`${admin.user_id}-subs`} className="bg-muted/20">
                        <TableCell colSpan={11}>
                          <div className="py-2 px-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Sub-usuários ({admin.sub_users.length})</p>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                              {admin.sub_users.map((su, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-background/60">
                                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate">{su.display_name || su.email || '—'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((admin) => (
              <Card key={admin.user_id} className="glass-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{admin.display_name || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{admin.email || '—'}</span>
                      </div>
                      {admin.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{admin.phone}</span>
                        </div>
                      )}
                    </div>
                    {renderDropdown(admin)}
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'usuários', metric: admin.stats.usuarios, icon: Users },
                      { label: 'clientes', metric: admin.stats.clientes, icon: Building2 },
                      { label: 'senhas', metric: admin.stats.senhas, icon: KeyRound },
                      { label: 'manutenções', metric: admin.stats.manutencoes, icon: Wrench },
                      { label: 'empresas', metric: admin.stats.empresas, icon: Building2 },
                    ].map(({ label, metric, icon: Icon }) => (
                      <div key={label} className="flex items-center gap-1 text-sm bg-muted/30 rounded-lg px-2 py-1.5">
                        <Icon className="h-3 w-3 text-primary shrink-0" />
                        <span className="font-medium">{metric.total}</span>
                        {metric.recent > 0 && <span className="text-[10px] text-emerald-500">+{metric.recent}</span>}
                        <span className="text-[10px] text-muted-foreground truncate">{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(admin)}
                    {admin.sub_users?.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setExpandedAdmin(expandedAdmin === admin.user_id ? null : admin.user_id)}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        {admin.sub_users.length} sub-usuários
                        {expandedAdmin === admin.user_id ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {format(new Date(admin.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>

                  {expandedAdmin === admin.user_id && admin.sub_users?.length > 0 && (
                    <div className="border-t border-border/50 pt-2 space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sub-usuários</p>
                      {admin.sub_users.map((su, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/30">
                          <User className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{su.display_name || su.email || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum administrador encontrado.
            </div>
          )}
        </>
      )}

        </TabsContent>

        <TabsContent value="planos">
          <PlansManager />
        </TabsContent>
      </Tabs>

      {/* Password Reset Dialog */}
      <Dialog open={passwordDialog.open} onOpenChange={(open) => setPasswordDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Troca de Senha</DialogTitle>
            <DialogDescription>Um email será enviado para <strong>{passwordDialog.email}</strong> com um link para redefinir a senha.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialog({ open: false, userId: "", email: "" })}>Cancelar</Button>
            <Button onClick={handleSendPasswordReset} disabled={actionLoading}>
              {actionLoading ? "Enviando..." : "Enviar email de troca"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trial Period Dialog */}
      <Dialog open={trialDialog.open} onOpenChange={(open) => setTrialDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
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
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir conta
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta <strong>{deleteDialog.email}</strong>? Esta ação é irreversível.
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

      {/* Activate Permanent with Plan Selection */}
      <Dialog open={activateDialog.open} onOpenChange={(open) => setActivateDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ativar Conta Permanente</DialogTitle>
            <DialogDescription>Selecione o plano para {activateDialog.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {plansLoading ? (
              <div className="text-center py-4 text-muted-foreground">Carregando planos...</div>
            ) : (
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                  <SelectContent>
                    {availablePlans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome} ({p.tipo})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialog({ open: false, userId: "", email: "" })}>Cancelar</Button>
            <Button onClick={handleActivatePermanent} disabled={actionLoading || !selectedPlanId}>
              {actionLoading ? "Ativando..." : "Ativar Permanente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanDialog.open} onOpenChange={(open) => setChangePlanDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mudar Plano e Limites</DialogTitle>
            <DialogDescription>Altere o plano e os limites para {changePlanDialog.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {plansLoading ? (
              <div className="text-center py-4 text-muted-foreground">Carregando planos...</div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select value={changePlanId} onValueChange={(v) => {
                    setChangePlanId(v)
                    const plan = availablePlans.find(p => p.id === v)
                    if (plan) {
                      setChangePlanLimits({
                        max_usuarios: plan.max_usuarios || 0,
                        max_equipes: plan.max_equipes || 0,
                        max_manutencoes: plan.max_manutencoes || 0,
                        max_empresas: plan.max_empresas || 0,
                        max_senhas: plan.max_senhas || 0,
                      })
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                    <SelectContent>
                      {availablePlans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome} ({p.tipo})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {changePlanId && (
                  <div className="space-y-3 p-4 border border-border/50 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium">Limites do Plano <span className="text-xs text-muted-foreground">(0 = ilimitado)</span></p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Máx. Usuários</Label>
                        <Input type="number" min={0} value={changePlanLimits.max_usuarios} onChange={(e) => setChangePlanLimits(p => ({ ...p, max_usuarios: parseInt(e.target.value) || 0 }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Máx. Equipes</Label>
                        <Input type="number" min={0} value={changePlanLimits.max_equipes} onChange={(e) => setChangePlanLimits(p => ({ ...p, max_equipes: parseInt(e.target.value) || 0 }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Máx. Manutenções/mês</Label>
                        <Input type="number" min={0} value={changePlanLimits.max_manutencoes} onChange={(e) => setChangePlanLimits(p => ({ ...p, max_manutencoes: parseInt(e.target.value) || 0 }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Máx. Empresas</Label>
                        <Input type="number" min={0} value={changePlanLimits.max_empresas} onChange={(e) => setChangePlanLimits(p => ({ ...p, max_empresas: parseInt(e.target.value) || 0 }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Máx. Senhas</Label>
                        <Input type="number" min={0} value={changePlanLimits.max_senhas} onChange={(e) => setChangePlanLimits(p => ({ ...p, max_senhas: parseInt(e.target.value) || 0 }))} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanDialog({ open: false, userId: "", email: "", currentPlanId: null })}>Cancelar</Button>
            <Button onClick={handleChangePlan} disabled={changePlanLoading || !changePlanId}>
              {changePlanLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
