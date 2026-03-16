import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { usePlanLimits } from "@/hooks/usePlanLimits"
import { usePermissions } from "@/hooks/usePermissions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Edit, Globe, Activity, Clock, RefreshCw, Settings, Wifi, WifiOff, Zap, AlertTriangle } from "lucide-react"

interface MonitoredUrl {
  id: string
  url: string
  nome: string
  cliente_id: string | null
  empresa_terceira_id: string | null
  check_interval_minutes: number
  ativo: boolean
  created_at: string
}

interface CheckLog {
  id: string
  monitored_url_id: string
  status_code: number | null
  response_time_ms: number | null
  is_online: boolean
  error_message: string | null
  screenshot_url: string | null
  checked_at: string
}

interface MonitorSchedule {
  id: string
  report_type: string
  frequency_minutes: number
  report_time: string
  email_destinatario: string
  ativo: boolean
}

const emptyUrl = { url: "", nome: "", check_interval_minutes: 60, ativo: true, cliente_id: "", empresa_terceira_id: "" }

export default function MonitoramentoSites() {
  const { user } = useAuth()
  const { isAdmin, canCreateSystem, canEditSystem, canDeleteSystem } = usePermissions()
  const planLimits = usePlanLimits()

  const [urls, setUrls] = useState<MonitoredUrl[]>([])
  const [logs, setLogs] = useState<Record<string, CheckLog[]>>({})
  const [latestLogs, setLatestLogs] = useState<Record<string, CheckLog>>({})
  const [schedules, setSchedules] = useState<MonitorSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUrl, setEditingUrl] = useState<MonitoredUrl | null>(null)
  const [form, setForm] = useState(emptyUrl)
  const [saving, setSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; nome: string }>({ open: false, id: "", nome: "" })
  const [checking, setChecking] = useState(false)

  // Schedule form
  const [scheduleDialog, setScheduleDialog] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ report_type: "daily", frequency_minutes: 60, report_time: "08:00", email_destinatario: "", ativo: true })
  const [editingSchedule, setEditingSchedule] = useState<MonitorSchedule | null>(null)

  // Clientes & Empresas for selects
  const [clientes, setClientes] = useState<any[]>([])
  const [empresas, setEmpresas] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      fetchAll()
    }
  }, [user])

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([fetchUrls(), fetchSchedules(), fetchClientes(), fetchEmpresas()])
    setLoading(false)
  }

  const fetchUrls = async () => {
    const { data } = await supabase
      .from('monitored_urls')
      .select('*')
      .order('created_at', { ascending: false })
    const urlList = (data || []) as MonitoredUrl[]
    setUrls(urlList)

    // Fetch latest log for each
    const latestMap: Record<string, CheckLog> = {}
    for (const u of urlList) {
      const { data: log } = await supabase
        .from('url_check_logs')
        .select('*')
        .eq('monitored_url_id', u.id)
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (log) latestMap[u.id] = log as CheckLog
    }
    setLatestLogs(latestMap)
  }

  const fetchSchedules = async () => {
    if (!user) return
    const { data } = await supabase
      .from('monitor_schedules')
      .select('*')
      .eq('user_id', user.id)
    setSchedules((data || []) as MonitorSchedule[])
  }

  const fetchClientes = async () => {
    const { data } = await supabase.from('clientes').select('id, nome_cliente')
    setClientes(data || [])
  }

  const fetchEmpresas = async () => {
    const { data } = await supabase.from('empresas_terceiras').select('id, nome_empresa').eq('ativo', true)
    setEmpresas(data || [])
  }

  const fetchHistory = async (urlId: string) => {
    const { data } = await supabase
      .from('url_check_logs')
      .select('*')
      .eq('monitored_url_id', urlId)
      .order('checked_at', { ascending: false })
      .limit(50)
    setLogs(prev => ({ ...prev, [urlId]: (data || []) as CheckLog[] }))
  }

  const openCreate = () => {
    if (!isAdmin && !canCreateSystem('monitoramento')) { toast.error("Sem permissão"); return }
    if (!planLimits.canCreateUrl) { toast.error("Limite de URLs monitoradas atingido no seu plano"); return }
    setEditingUrl(null)
    setForm(emptyUrl)
    setDialogOpen(true)
  }

  const openEdit = (u: MonitoredUrl) => {
    if (!isAdmin && !canEdit('monitoramento')) { toast.error("Sem permissão"); return }
    setEditingUrl(u)
    setForm({
      url: u.url,
      nome: u.nome,
      check_interval_minutes: u.check_interval_minutes,
      ativo: u.ativo,
      cliente_id: u.cliente_id || "",
      empresa_terceira_id: u.empresa_terceira_id || "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!user) return
    if (!form.url.trim() || !form.nome.trim()) { toast.error("URL e nome são obrigatórios"); return }
    setSaving(true)

    const payload = {
      url: form.url.trim(),
      nome: form.nome.trim(),
      check_interval_minutes: form.check_interval_minutes,
      ativo: form.ativo,
      cliente_id: form.cliente_id || null,
      empresa_terceira_id: form.empresa_terceira_id || null,
      user_id: user.id,
    }

    let error
    if (editingUrl) {
      ({ error } = await supabase.from('monitored_urls').update(payload).eq('id', editingUrl.id))
    } else {
      ({ error } = await supabase.from('monitored_urls').insert(payload))
    }

    if (error) { toast.error("Erro ao salvar: " + error.message) }
    else {
      toast.success(editingUrl ? "URL atualizada!" : "URL adicionada!")
      setDialogOpen(false)
      fetchUrls()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('monitored_urls').delete().eq('id', deleteDialog.id)
    if (error) toast.error("Erro ao excluir")
    else { toast.success("URL removida!"); fetchUrls() }
    setDeleteDialog({ open: false, id: "", nome: "" })
  }

  const runManualCheck = async () => {
    if (!user) return
    setChecking(true)
    try {
      const { data, error } = await supabase.functions.invoke('check-urls', {
        body: {}
      })
      if (error) throw error
      toast.success(`Verificação concluída! ${data?.checked || 0} sites verificados.`)
      await fetchUrls()
    } catch (err: any) {
      toast.error("Erro ao verificar: " + (err.message || "Erro desconhecido"))
    }
    setChecking(false)
  }

  const handleSaveSchedule = async () => {
    if (!user) return
    if (!scheduleForm.email_destinatario.trim()) { toast.error("Email é obrigatório"); return }
    const payload = { ...scheduleForm, user_id: user.id }
    let error
    if (editingSchedule) {
      ({ error } = await supabase.from('monitor_schedules').update(payload).eq('id', editingSchedule.id))
    } else {
      ({ error } = await supabase.from('monitor_schedules').insert(payload))
    }
    if (error) toast.error("Erro: " + error.message)
    else {
      toast.success("Agendamento salvo!")
      setScheduleDialog(false)
      setEditingSchedule(null)
      fetchSchedules()
    }
  }

  const deleteSchedule = async (id: string) => {
    await supabase.from('monitor_schedules').delete().eq('id', id)
    fetchSchedules()
  }

  const getSpeedBadge = (ms: number | null) => {
    if (ms === null) return <Badge variant="outline" className="text-xs">-</Badge>
    if (ms < 500) return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-300 text-xs"><Zap className="h-3 w-3 mr-1" />{ms}ms</Badge>
    if (ms < 2000) return <Badge className="bg-amber-500/20 text-amber-700 border-amber-300 text-xs"><Clock className="h-3 w-3 mr-1" />{ms}ms</Badge>
    return <Badge className="bg-red-500/20 text-red-700 border-red-300 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />{ms}ms</Badge>
  }

  const getStatusBadge = (isOnline: boolean | undefined) => {
    if (isOnline === undefined) return <Badge variant="outline" className="text-xs">Sem dados</Badge>
    return isOnline
      ? <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-300"><Wifi className="h-3 w-3 mr-1" />Online</Badge>
      : <Badge className="bg-red-500/20 text-red-700 border-red-300"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>
  }

  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)

  const onlineCount = urls.filter(u => latestLogs[u.id]?.is_online).length
  const offlineCount = urls.filter(u => latestLogs[u.id] && !latestLogs[u.id].is_online).length
  const avgResponseTime = (() => {
    const times = Object.values(latestLogs).filter(l => l.response_time_ms).map(l => l.response_time_ms!)
    return times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
  })()

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Monitoramento de Sites</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitore a disponibilidade e performance dos seus sites</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runManualCheck} disabled={checking} size="sm">
            <RefreshCw className={`h-4 w-4 mr-1 ${checking ? 'animate-spin' : ''}`} />
            {checking ? "Verificando..." : "Verificar Agora"}
          </Button>
          {(isAdmin || canCreate('monitoramento')) && (
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nova URL
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{urls.length}</p>
              <p className="text-xs text-muted-foreground">Sites</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Wifi className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{onlineCount}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <WifiOff className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{offlineCount}</p>
              <p className="text-xs text-muted-foreground">Offline</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgResponseTime}ms</p>
              <p className="text-xs text-muted-foreground">Média</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sites" className="w-full">
        <TabsList>
          <TabsTrigger value="sites">Sites Monitorados</TabsTrigger>
          <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
          {selectedUrl && <TabsTrigger value="historico">Histórico</TabsTrigger>}
        </TabsList>

        <TabsContent value="sites" className="mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : urls.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Nenhum site monitorado</h3>
                <p className="text-muted-foreground text-sm mb-4">Adicione URLs para começar a monitorar</p>
                {(isAdmin || canCreate('monitoramento')) && (
                  <Button onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar URL
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {urls.map((u) => {
                const log = latestLogs[u.id]
                return (
                  <Card key={u.id} className={`glass-card transition-all ${!u.ativo ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${log ? (log.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500') : 'bg-muted'}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold truncate">{u.nome}</span>
                              {!u.ativo && <Badge variant="secondary" className="text-[10px]">Pausado</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{u.url}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Intervalo: {u.check_interval_minutes}min
                              {log && ` · Último check: ${new Date(log.checked_at).toLocaleString('pt-BR')}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(log?.is_online)}
                          {getSpeedBadge(log?.response_time_ms ?? null)}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedUrl(u.id); fetchHistory(u.id) }}>
                            <Clock className="h-4 w-4" />
                          </Button>
                          {(isAdmin || canEdit('monitoramento')) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {(isAdmin || canDelete('monitoramento')) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteDialog({ open: true, id: u.id, nome: u.nome })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {log?.error_message && (
                        <p className="text-xs text-red-500 mt-2 bg-red-50 dark:bg-red-950/30 p-2 rounded">⚠️ {log.error_message}</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="agendamentos" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Agendamentos de Relatórios</h3>
            <Button size="sm" onClick={() => { setEditingSchedule(null); setScheduleForm({ report_type: "daily", frequency_minutes: 60, report_time: "08:00", email_destinatario: user?.email || "", ativo: true }); setScheduleDialog(true) }}>
              <Plus className="h-4 w-4 mr-1" /> Novo Agendamento
            </Button>
          </div>
          {schedules.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-6 text-center text-muted-foreground">
                <Settings className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum agendamento configurado</p>
                <p className="text-xs mt-1">Configure para receber relatórios por email</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {schedules.map(s => (
                <Card key={s.id} className="glass-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={s.report_type === 'alert' ? 'destructive' : 'default'} className="text-xs">
                          {s.report_type === 'alert' ? '🚨 Alerta NOK' : '📊 Relatório Completo'}
                        </Badge>
                        {!s.ativo && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                      </div>
                      <p className="text-sm mt-1">
                        {s.report_type === 'daily' ? `Envio diário às ${s.report_time}` : `Check a cada ${s.frequency_minutes}min`}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.email_destinatario}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        setEditingSchedule(s)
                        setScheduleForm({ report_type: s.report_type, frequency_minutes: s.frequency_minutes, report_time: s.report_time, email_destinatario: s.email_destinatario, ativo: s.ativo })
                        setScheduleDialog(true)
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => deleteSchedule(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          {selectedUrl && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Histórico - {urls.find(u => u.id === selectedUrl)?.nome}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Tempo</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(logs[selectedUrl] || []).map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">{new Date(log.checked_at).toLocaleString('pt-BR')}</TableCell>
                          <TableCell>{getStatusBadge(log.is_online)}</TableCell>
                          <TableCell className="text-xs">{log.status_code || '-'}</TableCell>
                          <TableCell>{getSpeedBadge(log.response_time_ms)}</TableCell>
                          <TableCell className="text-xs text-red-500 max-w-[200px] truncate">{log.error_message || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {(!logs[selectedUrl] || logs[selectedUrl].length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum registro</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* URL Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUrl ? "Editar URL" : "Nova URL Monitorada"}</DialogTitle>
            <DialogDescription>Configure a URL para monitoramento de disponibilidade</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Meu Site" />
            </div>
            <div>
              <Label>URL</Label>
              <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://exemplo.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Intervalo (min)</Label>
                <Select value={String(form.check_interval_minutes)} onValueChange={v => setForm(f => ({ ...f, check_interval_minutes: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent portal={false}>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                    <SelectItem value="360">6 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Empresa</Label>
                <Select value={form.empresa_terceira_id} onValueChange={v => setForm(f => ({ ...f, empresa_terceira_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent portal={false}>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_empresa}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={v => setForm(f => ({ ...f, cliente_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="">Nenhum</SelectItem>
                  {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editingUrl ? "Atualizar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
            <DialogDescription>Configure como e quando receber relatórios</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={scheduleForm.report_type} onValueChange={v => setScheduleForm(f => ({ ...f, report_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="daily">📊 Relatório Completo (todos os sites)</SelectItem>
                  <SelectItem value="alert">🚨 Alerta Emergencial (apenas offline)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scheduleForm.report_type === 'daily' ? (
              <div>
                <Label>Horário de envio</Label>
                <Input type="time" value={scheduleForm.report_time} onChange={e => setScheduleForm(f => ({ ...f, report_time: e.target.value }))} />
              </div>
            ) : (
              <div>
                <Label>Frequência de verificação</Label>
                <Select value={String(scheduleForm.frequency_minutes)} onValueChange={v => setScheduleForm(f => ({ ...f, frequency_minutes: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent portal={false}>
                    <SelectItem value="5">A cada 5 min</SelectItem>
                    <SelectItem value="15">A cada 15 min</SelectItem>
                    <SelectItem value="30">A cada 30 min</SelectItem>
                    <SelectItem value="60">A cada 1 hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Email destinatário</Label>
              <Input type="email" value={scheduleForm.email_destinatario} onChange={e => setScheduleForm(f => ({ ...f, email_destinatario: e.target.value }))} placeholder="email@exemplo.com" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={scheduleForm.ativo} onCheckedChange={v => setScheduleForm(f => ({ ...f, ativo: v }))} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveSchedule}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete URL Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={open => setDeleteDialog(d => ({ ...d, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir URL monitorada</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir "{deleteDialog.nome}"? Todo o histórico será removido.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
