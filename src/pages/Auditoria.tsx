import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ClipboardList, Search, X, ChevronLeft, ChevronRight, Info } from "lucide-react"
import { generateSummary, getFieldLabel } from "@/lib/auditHelpers"

interface AuditEntry {
  id: string
  user_id: string
  tenant_admin_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  resource_name: string | null
  details: any
  created_at: string
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: 'Criação', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-300' },
  update: { label: 'Edição', color: 'bg-amber-500/15 text-amber-700 border-amber-300' },
  delete: { label: 'Exclusão', color: 'bg-destructive/15 text-destructive border-destructive/30' },
}

const RESOURCE_LABELS: Record<string, string> = {
  manutencao: 'Manutenção',
  cliente: 'Cliente',
  empresa: 'Empresa',
  equipe: 'Equipe',
  cofre_senha: 'Senha',
  tipo_manutencao: 'Tipo Manutenção',
  usuario: 'Usuário',
  monitoramento: 'Monitoramento',
  permissao: 'Permissão',
  grupo_cofre: 'Grupo Cofre',
  pacote: 'Pacote',
  relatorio: 'Relatório',
  agendamento: 'Agendamento',
}

const PAGE_SIZE = 25

function AuditDetailDialog({ log, open, onOpenChange }: { log: AuditEntry | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!log || !log.details) return null
  const details = log.details
  const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: '' }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Detalhes da Auditoria
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Ação</Label>
              <div><Badge variant="outline" className={`text-xs ${actionInfo.color}`}>{actionInfo.label}</Badge></div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Recurso</Label>
              <p className="font-medium">{RESOURCE_LABELS[log.resource_type] || log.resource_type}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <p className="font-medium">{log.resource_name || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data/Hora</Label>
              <p>{new Date(log.created_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>

          {/* Detailed changes */}
          {details.tipo === 'edicao' && details.alteracoes && Object.keys(details.alteracoes).length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-semibold">Campos Alterados</Label>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs h-8">Campo</TableHead>
                      <TableHead className="text-xs h-8">Antes</TableHead>
                      <TableHead className="text-xs h-8">Depois</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(details.alteracoes).map(([field, change]: [string, any]) => (
                      <TableRow key={field}>
                        <TableCell className="text-xs font-medium py-2">{getFieldLabel(field)}</TableCell>
                        <TableCell className="text-xs text-destructive/80 py-2 break-words max-w-[150px]">{change.de}</TableCell>
                        <TableCell className="text-xs text-emerald-600 py-2 break-words max-w-[150px]">{change.para}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Created or deleted fields */}
          {(details.tipo === 'criacao' || details.tipo === 'exclusao') && details.campos && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-semibold">
                {details.tipo === 'criacao' ? 'Campos do Registro Criado' : 'Campos do Registro Excluído'}
              </Label>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs h-8">Campo</TableHead>
                      <TableHead className="text-xs h-8">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(details.campos).map(([field, value]: [string, any]) => (
                      <TableRow key={field}>
                        <TableCell className="text-xs font-medium py-2">{getFieldLabel(field)}</TableCell>
                        <TableCell className="text-xs py-2 break-words max-w-[250px]">{String(value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Fallback for old format */}
          {!details.tipo && Object.keys(details).length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-semibold">Detalhes</Label>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{JSON.stringify(details, null, 2)}</pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function Auditoria({ globalView = false }: { globalView?: boolean }) {
  const { user } = useAuth()
  const { isSuperAdmin } = usePermissions()
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Filters
  const [filterAction, setFilterAction] = useState("todos")
  const [filterResource, setFilterResource] = useState("todos")
  const [filterSearch, setFilterSearch] = useState("")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")

  // Users map for display names
  const [usersMap, setUsersMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) return
    fetchLogs()
  }, [user, page, filterAction, filterResource, filterDateFrom, filterDateTo])

  useEffect(() => {
    const loadUsers = async () => {
      const { data } = await supabase.from('user_profiles').select('user_id, display_name, email')
      const map: Record<string, string> = {}
      ;(data || []).forEach((u: any) => { map[u.user_id] = u.display_name || u.email || u.user_id })
      setUsersMap(map)
    }
    loadUsers()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    let query = (supabase.from('audit_logs' as any) as any).select('*', { count: 'exact' })

    if (filterAction !== "todos") query = query.eq('action', filterAction)
    if (filterResource !== "todos") query = query.eq('resource_type', filterResource)
    if (filterDateFrom) query = query.gte('created_at', `${filterDateFrom}T00:00:00`)
    if (filterDateTo) query = query.lte('created_at', `${filterDateTo}T23:59:59`)

    query = query.order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    const { data, count, error } = await query
    if (!error) {
      setLogs((data || []) as unknown as AuditEntry[])
      setTotal(count || 0)
    }
    setLoading(false)
  }

  const filteredLogs = filterSearch
    ? logs.filter(l =>
        (l.resource_name || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
        (usersMap[l.user_id] || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
        generateSummary(l.action, l.resource_type, l.details).toLowerCase().includes(filterSearch.toLowerCase())
      )
    : logs

  const clearFilters = () => {
    setFilterAction("todos")
    setFilterResource("todos")
    setFilterSearch("")
    setFilterDateFrom("")
    setFilterDateTo("")
    setPage(0)
  }

  const hasFilters = filterAction !== "todos" || filterResource !== "todos" || filterSearch || filterDateFrom || filterDateTo
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const openDetail = (log: AuditEntry) => {
    setSelectedLog(log)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title font-display flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            {globalView ? "Auditoria Global" : "Auditoria"}
          </h1>
          <p className="page-subtitle">
            {globalView ? "Logs de todas as operações de todos os tenants" : "Histórico de operações do seu tenant"}
          </p>
        </div>
      </div>

      {/* Detail Dialog */}
      <AuditDetailDialog log={selectedLog} open={detailOpen} onOpenChange={setDetailOpen} />

      {/* Filters */}
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros</span>
              {hasFilters && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Ativos</span>}
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" /> Limpar
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <Input className="h-9" placeholder="Nome, usuário ou resumo..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ação</Label>
              <Select value={filterAction} onValueChange={v => { setFilterAction(v); setPage(0) }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="create">Criação</SelectItem>
                  <SelectItem value="update">Edição</SelectItem>
                  <SelectItem value="delete">Exclusão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Recurso</Label>
              <Select value={filterResource} onValueChange={v => { setFilterResource(v); setPage(0) }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input type="date" className="h-9" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(0) }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input type="date" className="h-9" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(0) }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="glass-card border-0">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data/Hora</TableHead>
                  <TableHead className="text-xs">Usuário</TableHead>
                  <TableHead className="text-xs">Ação</TableHead>
                  <TableHead className="text-xs">Recurso</TableHead>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs min-w-[250px]">Resumo</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Nenhum registro de auditoria encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-muted text-muted-foreground' }
                    const summary = generateSummary(log.action, log.resource_type, log.details)
                    const hasDetails = log.details && (log.details.tipo === 'edicao' || log.details.tipo === 'criacao' || log.details.tipo === 'exclusao')
                    return (
                      <TableRow key={log.id} className={hasDetails ? 'cursor-pointer hover:bg-muted/60' : ''} onClick={() => hasDetails && openDetail(log)}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="truncate max-w-[150px] block">{usersMap[log.user_id] || log.user_id.slice(0, 8)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${actionInfo.color}`}>
                            {actionInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {RESOURCE_LABELS[log.resource_type] || log.resource_type}
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[180px]">
                          {log.resource_name || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[300px]">
                          <span className="line-clamp-2">{summary || '-'}</span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {hasDetails && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openDetail(log) }}>
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">{total} registros</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs">{page + 1} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
