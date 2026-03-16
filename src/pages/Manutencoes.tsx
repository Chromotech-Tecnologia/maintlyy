import { useState, useEffect } from "react"
import { searchMatch } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, Clock, Calendar, Eye, Search, Filter, X, Wrench } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { ExcelImport } from "@/components/ExcelImport"
import { usePlanLimits } from "@/hooks/usePlanLimits"
import { BulkActionsBar } from "@/components/BulkActionsBar"
import { TablePagination } from "@/components/TablePagination"
import { PrerequisiteWarning } from "@/components/PrerequisiteWarning"

interface Manutencao {
  id: string
  empresa_terceira_id: string
  cliente_id: string
  tipo_manutencao_id: string
  equipe_id?: string
  data_inicio: string
  hora_inicio: string
  data_fim?: string
  hora_fim?: string
  tempo_total?: number
  descricao?: string
  solicitante?: string
  status: string
  responsavel?: string
  created_at: string
  clientes?: { nome_cliente: string }
  empresas_terceiras?: { nome_empresa: string }
  tipos_manutencao?: { nome_tipo_manutencao: string }
  equipes?: { nome_equipe: string }
  manutencao_equipes?: { equipe_id: string; equipes: { nome_equipe: string } }[]
}

interface FormData {
  empresa_terceira_id: string
  cliente_id: string
  tipo_manutencao_id: string
  equipe_ids: string[]
  data_inicio: string
  hora_inicio: string
  data_fim: string
  hora_fim: string
  descricao: string
  solicitante: string
  status: string
  responsavel: string
}

export default function Manutencoes() {
  const { user } = useAuth()
  const { isAdmin, canViewDetailsSystem, canEditSystem, canCreateSystem, canDeleteSystem } = usePermissions()
  const planLimits = usePlanLimits()
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [empresas, setEmpresas] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [tipos, setTipos] = useState<any[]>([])
  const [equipes, setEquipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingManutencao, setViewingManutencao] = useState<Manutencao | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroCliente, setFiltroCliente] = useState("")
  const [filtroEmpresa, setFiltroEmpresa] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroEquipe, setFiltroEquipe] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("")
  const [filtroDataInicio, setFiltroDataInicio] = useState("")
  const [filtroDataFim, setFiltroDataFim] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState<FormData>({
    empresa_terceira_id: "",
    cliente_id: "",
    tipo_manutencao_id: "",
    equipe_ids: [],
    data_inicio: "",
    hora_inicio: "",
    data_fim: "",
    hora_fim: "",
    descricao: "",
    solicitante: "",
    status: "Em andamento",
    responsavel: ""
  })

  const fetchData = async () => {
    if (!user) return

    try {
      const [manutResult, empresasResult, clientesResult, tiposResult, equipesResult] = await Promise.all([
        supabase
          .from('manutencoes')
          .select(`
            *,
            clientes(nome_cliente),
            empresas_terceiras(nome_empresa),
            tipos_manutencao(nome_tipo_manutencao),
            equipes(nome_equipe),
            manutencao_equipes(equipe_id, equipes(nome_equipe))
          `)
          .order('created_at', { ascending: false }),
        supabase.from('empresas_terceiras').select('*'),
        supabase.from('clientes').select('*'),
        supabase.from('tipos_manutencao').select('*'),
        supabase.from('equipes').select('*')
      ])

      if (manutResult.error) throw manutResult.error
      if (empresasResult.error) throw empresasResult.error
      if (clientesResult.error) throw clientesResult.error
      if (tiposResult.error) throw tiposResult.error
      if (equipesResult.error) throw equipesResult.error

      setManutencoes(manutResult.data || [])
      setEmpresas(empresasResult.data || [])
      setClientes(clientesResult.data || [])
      setTipos(tiposResult.data || [])
      setEquipes(equipesResult.data || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  const calculateTempo = (dataInicio: string, horaInicio: string, dataFim?: string, horaFim?: string) => {
    if (!dataFim || !horaFim) return null
    const inicio = new Date(`${dataInicio}T${horaInicio}`)
    const fim = new Date(`${dataFim}T${horaFim}`)
    return Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const tempo_total = calculateTempo(formData.data_inicio, formData.hora_inicio, formData.data_fim, formData.hora_fim)
      const { equipe_ids, ...rest } = formData
      const data = { ...rest, user_id: user.id, equipe_id: equipe_ids[0] || null, tempo_total }

      if (editingId) {
        const { error } = await supabase.from('manutencoes').update(data).eq('id', editingId)
        if (error) throw error
        const { error: deleteError } = await supabase.from('manutencao_equipes').delete().eq('manutencao_id', editingId)
        if (deleteError) console.error('Error deleting manutencao_equipes:', deleteError)
        if (equipe_ids.length > 0) {
          const { error: insertError } = await supabase.from('manutencao_equipes').insert(equipe_ids.map(eid => ({ manutencao_id: editingId, equipe_id: eid })))
          if (insertError) { console.error('Error inserting manutencao_equipes:', insertError); toast.error("Erro ao salvar equipes: " + insertError.message) }
        }
        toast.success("Manutenção atualizada!")
      } else {
        const { data: inserted, error } = await supabase.from('manutencoes').insert([data]).select('id').single()
        if (error) throw error
        if (inserted && equipe_ids.length > 0) {
          await supabase.from('manutencao_equipes').insert(equipe_ids.map(eid => ({ manutencao_id: inserted.id, equipe_id: eid })))
        }
        toast.success("Manutenção criada!")
      }

      setOpen(false)
      setEditingId(null)
      setFormData({ empresa_terceira_id: "", cliente_id: "", tipo_manutencao_id: "", equipe_ids: [], data_inicio: "", hora_inicio: "", data_fim: "", hora_fim: "", descricao: "", solicitante: "", status: "Em andamento", responsavel: "" })
      await fetchData()
    } catch (error: any) {
      console.error('handleSubmit error:', error)
      toast.error(error.message)
    }
  }

  const handleEdit = (manutencao: Manutencao) => {
    const equipeIds = (manutencao as any).manutencao_equipes?.map((me: any) => me.equipe_id) || []
    const legacyEquipeId = manutencao.equipe_id
    const finalEquipeIds = equipeIds.length > 0 ? equipeIds : (legacyEquipeId ? [legacyEquipeId] : [])
    setFormData({ empresa_terceira_id: manutencao.empresa_terceira_id, cliente_id: manutencao.cliente_id, tipo_manutencao_id: manutencao.tipo_manutencao_id, equipe_ids: finalEquipeIds, data_inicio: manutencao.data_inicio, hora_inicio: manutencao.hora_inicio, data_fim: manutencao.data_fim || "", hora_fim: manutencao.hora_fim || "", descricao: manutencao.descricao || "", solicitante: manutencao.solicitante || "", status: manutencao.status || "Em andamento", responsavel: manutencao.responsavel || "" })
    setEditingId(manutencao.id)
    setOpen(true)
  }

  const handleView = (manutencao: Manutencao) => {
    setViewingManutencao(manutencao)
    setViewDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('manutencoes').delete().eq('id', id)
      if (error) throw error
      toast.success("Manutenção excluída!")
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const getEquipeNames = (m: Manutencao) => {
    const fromJunction = (m as any).manutencao_equipes?.map((me: any) => me.equipes?.nome_equipe).filter(Boolean)
    if (fromJunction && fromJunction.length > 0) return fromJunction.join(', ')
    return m.equipes?.nome_equipe || '-'
  }

  const formatTempo = (minutos?: number | null) => {
    if (minutos === null || minutos === undefined) return "-"
    if (minutos < 0) return "-"
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return `${horas}h ${mins}m`
  }

  const getTempoDisplay = (m: any) => {
    if (m.tempo_total !== null && m.tempo_total !== undefined) return formatTempo(m.tempo_total)
    // Fallback: calculate from dates if available
    if (m.data_inicio && m.hora_inicio && m.data_fim && m.hora_fim) {
      const calc = calculateTempo(m.data_inicio, m.hora_inicio, m.data_fim, m.hora_fim)
      return formatTempo(calc)
    }
    return "-"
  }

  // Filtered data
  const manutencoesFiltradas = manutencoes.filter(m => {
    const matchSearch = !searchTerm || 
      searchMatch(m.clientes?.nome_cliente, searchTerm) ||
      searchMatch(m.empresas_terceiras?.nome_empresa, searchTerm) ||
      searchMatch(m.tipos_manutencao?.nome_tipo_manutencao, searchTerm) ||
      searchMatch(m.equipes?.nome_equipe, searchTerm) ||
      searchMatch(m.descricao, searchTerm) ||
      searchMatch(m.solicitante, searchTerm) ||
      searchMatch(m.responsavel, searchTerm) ||
      searchMatch(m.status, searchTerm)
    const matchCliente = !filtroCliente || m.cliente_id === filtroCliente
    const matchEmpresa = !filtroEmpresa || m.empresa_terceira_id === filtroEmpresa
    const matchTipo = !filtroTipo || m.tipo_manutencao_id === filtroTipo
    const matchEquipe = !filtroEquipe || m.equipe_id === filtroEquipe
    const matchStatus = !filtroStatus || m.status === filtroStatus
    const matchDataInicio = !filtroDataInicio || m.data_inicio >= filtroDataInicio
    const matchDataFim = !filtroDataFim || m.data_inicio <= filtroDataFim
    return matchSearch && matchCliente && matchEmpresa && matchTipo && matchEquipe && matchStatus && matchDataInicio && matchDataFim
  })

  // Pagination
  const totalPages = Math.ceil(manutencoesFiltradas.length / pageSize)
  const paginatedData = manutencoesFiltradas.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [searchTerm, filtroCliente, filtroEmpresa, filtroTipo, filtroEquipe, filtroStatus, filtroDataInicio, filtroDataFim, pageSize])

  const hasActiveFilters = filtroCliente || filtroEmpresa || filtroTipo || filtroEquipe || filtroStatus || filtroDataInicio || filtroDataFim

  const clearFilters = () => {
    setFiltroCliente(""); setFiltroEmpresa(""); setFiltroTipo(""); setFiltroEquipe(""); setFiltroStatus(""); setFiltroDataInicio(""); setFiltroDataFim(""); setSearchTerm("")
  }

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedData.map(m => m.id)))
    }
  }

  const selectAllFiltered = () => {
    setSelectedIds(new Set(manutencoesFiltradas.map(m => m.id)))
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.size} manutenção(ões)?`)) return
    try {
      const ids = Array.from(selectedIds)
      for (const id of ids) {
        const { error } = await supabase.from('manutencoes').delete().eq('id', id)
        if (error) throw error
      }
      toast.success(`${ids.length} manutenção(ões) excluída(s)!`)
      setSelectedIds(new Set())
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleBulkStatusChange = async (status: string) => {
    try {
      const ids = Array.from(selectedIds)
      for (const id of ids) {
        const { error } = await supabase.from('manutencoes').update({ status }).eq('id', id)
        if (error) throw error
      }
      toast.success(`${ids.length} manutenção(ões) atualizada(s) para "${status}"!`)
      setSelectedIds(new Set())
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
      </div>
    )
  }

  const missingPrereqs = [
    ...(empresas.length === 0 ? [{ label: "Empresas", route: "/empresas" }] : []),
    ...(clientes.length === 0 ? [{ label: "Clientes", route: "/clientes" }] : []),
    ...(tipos.length === 0 ? [{ label: "Tipos de Manutenção", route: "/tipos-manutencao" }] : []),
    ...(equipes.length === 0 ? [{ label: "Equipes", route: "/equipes" }] : []),
  ]
  const canCreate = missingPrereqs.length === 0

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Manutenções</h1>
          <p className="page-subtitle">Gerencie todas as manutenções</p>
        </div>
        
        <div className="flex gap-2">
          <ExcelImport onImportComplete={fetchData} />
          {(isAdmin || canCreateSystem('manutencoes')) && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={(e) => {
                    if (!canCreate) { e.preventDefault(); e.stopPropagation(); return }
                    if (!planLimits.loading && !planLimits.canCreateManutencao) {
                      e.preventDefault(); e.stopPropagation()
                      toast.error(`Limite de manutenções do mês atingido (${planLimits.currentManutencoesMes}/${planLimits.maxManutencoes}). Aguarde a virada do mês ou contrate um plano.`)
                      return
                    }
                  }}
                  className="gradient-primary border-0 shadow-lg shadow-primary/25 rounded-xl h-11 px-5"
                  disabled={!canCreate}
                  title={!canCreate ? "Cadastre os itens necessários primeiro" : undefined}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Nova Manutenção</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Nova"} Manutenção</DialogTitle>
              <DialogDescription>Preencha os dados da manutenção</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={formData.cliente_id} onValueChange={(value) => {
                    const clienteSelecionado = clientes.find((c: any) => c.id === value)
                    setFormData({ ...formData, cliente_id: value, empresa_terceira_id: clienteSelecionado?.empresa_terceira_id || "" })
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                    <SelectContent portal={false}>
                      {clientes.map((cliente: any) => (
                        <SelectItem key={cliente.id} value={cliente.id}>{cliente.nome_cliente || "Sem nome"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Empresa *</Label>
                  <Select value={formData.empresa_terceira_id} onValueChange={(value) => setFormData({...formData, empresa_terceira_id: value})} disabled={true}>
                    <SelectTrigger className="opacity-60">
                      <SelectValue placeholder={formData.empresa_terceira_id ? empresas.find((e: any) => e.id === formData.empresa_terceira_id)?.nome_empresa || "Empresa selecionada" : "Selecione um cliente primeiro"} />
                    </SelectTrigger>
                    <SelectContent portal={false}>
                      {empresas.map((empresa: any) => (
                        <SelectItem key={empresa.id} value={empresa.id}>{empresa.nome_empresa}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Definida automaticamente pelo cliente</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Manutenção *</Label>
                  <Select value={formData.tipo_manutencao_id} onValueChange={(value) => setFormData({...formData, tipo_manutencao_id: value})}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent portal={false}>
                      {tipos.map((tipo: any) => (
                        <SelectItem key={tipo.id} value={tipo.id}>{tipo.nome_tipo_manutencao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Equipes</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-background">
                    {equipes.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma equipe cadastrada</p>}
                    {equipes.map((equipe: any) => (
                      <label key={equipe.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                        <input type="checkbox" checked={formData.equipe_ids.includes(equipe.id)} onChange={(e) => {
                          if (e.target.checked) setFormData({...formData, equipe_ids: [...formData.equipe_ids, equipe.id]})
                          else setFormData({...formData, equipe_ids: formData.equipe_ids.filter(id => id !== equipe.id)})
                        }} className="rounded border-primary" />
                        {equipe.nome_equipe}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <Input type="date" value={formData.data_inicio} onChange={(e) => setFormData({...formData, data_inicio: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Hora Início *</Label>
                  <Input type="time" value={formData.hora_inicio} onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input type="date" value={formData.data_fim} onChange={(e) => setFormData({...formData, data_fim: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Hora Fim</Label>
                  <Input type="time" value={formData.hora_fim} onChange={(e) => setFormData({...formData, hora_fim: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Solicitante</Label>
                  <Input value={formData.solicitante} onChange={(e) => setFormData({...formData, solicitante: e.target.value})} placeholder="Nome do solicitante" />
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Input value={formData.responsavel} onChange={(e) => setFormData({...formData, responsavel: e.target.value})} placeholder="Nome do responsável" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({...prev, status: value}))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                  <SelectContent portal={false}>
                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                    <SelectItem value="Finalizado">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} placeholder="Descreva a manutenção realizada..." rows={3} />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingId ? "Atualizar" : "Criar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
          )}
        </div>
      </div>

      {/* Prerequisite Warning */}
      {missingPrereqs.length > 0 && (
        <PrerequisiteWarning context="uma manutenção" missingItems={missingPrereqs} />
      )}

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="search-bar flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input placeholder="Buscar por cliente, empresa, tipo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-11 bg-card/80 backdrop-blur border-border/50 rounded-xl shadow-sm" />
          </div>
          <Button variant={showFilters ? "default" : "outline"} onClick={() => setShowFilters(!showFilters)} className="h-11 rounded-xl shrink-0">
            <Filter className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Filtros</span>
            {hasActiveFilters && (<span className="ml-1 bg-primary-foreground text-primary rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold">!</span>)}
          </Button>
        </div>

        {showFilters && (
          <div className="glass-card p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</Label>
                <Select value={filtroCliente || "todos"} onValueChange={(v) => setFiltroCliente(v === "todos" ? "" : v)}>
                  <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {clientes.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Empresa</Label>
                <Select value={filtroEmpresa || "todos"} onValueChange={(v) => setFiltroEmpresa(v === "todos" ? "" : v)}>
                  <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {empresas.map((e: any) => (<SelectItem key={e.id} value={e.id}>{e.nome_empresa}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</Label>
                <Select value={filtroTipo || "todos"} onValueChange={(v) => setFiltroTipo(v === "todos" ? "" : v)}>
                  <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {tipos.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.nome_tipo_manutencao}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Equipe</Label>
                <Select value={filtroEquipe || "todos"} onValueChange={(v) => setFiltroEquipe(v === "todos" ? "" : v)}>
                  <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {equipes.map((eq: any) => (<SelectItem key={eq.id} value={eq.id}>{eq.nome_equipe}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={filtroStatus || "todos"} onValueChange={(v) => setFiltroStatus(v === "todos" ? "" : v)}>
                  <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                    <SelectItem value="Finalizado">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data de</Label>
                <Input type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} className="h-9 rounded-lg text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data até</Label>
                <Input type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} className="h-9 rounded-lg text-xs" />
              </div>
              {hasActiveFilters && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive h-9 rounded-lg text-xs">
                    <X className="mr-1 h-3.5 w-3.5" /> Limpar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes da Manutenção</DialogTitle></DialogHeader>
          {viewingManutencao && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Cliente</Label><p className="font-medium">{viewingManutencao.clientes?.nome_cliente || "Sem nome"}</p></div>
                <div><Label className="text-muted-foreground">Empresa</Label><p>{viewingManutencao.empresas_terceiras?.nome_empresa}</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Tipo</Label><p>{viewingManutencao.tipos_manutencao?.nome_tipo_manutencao}</p></div>
                <div><Label className="text-muted-foreground">Equipes</Label><p>{getEquipeNames(viewingManutencao)}</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Data/Hora Início</Label><p>{new Date(viewingManutencao.data_inicio).toLocaleDateString()} {viewingManutencao.hora_inicio}</p></div>
                <div><Label className="text-muted-foreground">Data/Hora Fim</Label><p>{viewingManutencao.data_fim ? `${new Date(viewingManutencao.data_fim).toLocaleDateString()} ${viewingManutencao.hora_fim || ''}` : '-'}</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Tempo Total</Label><p>{getTempoDisplay(viewingManutencao)}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><Badge variant={viewingManutencao.status === "Finalizado" ? "default" : "secondary"}>{viewingManutencao.status}</Badge></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Solicitante</Label><p>{viewingManutencao.solicitante || "-"}</p></div>
                <div><Label className="text-muted-foreground">Responsável</Label><p>{viewingManutencao.responsavel || "-"}</p></div>
              </div>
              {viewingManutencao.descricao && (<div><Label className="text-muted-foreground">Descrição</Label><p className="whitespace-pre-wrap">{viewingManutencao.descricao}</p></div>)}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        totalCount={manutencoesFiltradas.length}
        onSelectAll={selectAllFiltered}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkDelete={handleBulkDelete}
        onBulkStatusChange={handleBulkStatusChange}
        statusOptions={[
          { value: "Em andamento", label: "Em andamento" },
          { value: "Finalizado", label: "Finalizado" },
        ]}
        canDelete={isAdmin || canDeleteSystem('manutencoes')}
        canEdit={isAdmin || canEditSystem('manutencoes')}
      />

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {manutencoesFiltradas.length} de {manutencoes.length} manutenções
        </p>
      </div>

      {/* Desktop Table */}
      <div className="glass-card border-0 hidden md:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 bg-muted/30">
              <TableHead className="w-10">
                <Checkbox checked={paginatedData.length > 0 && paginatedData.every(m => selectedIds.has(m.id))} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead className="font-semibold text-xs">Cliente</TableHead>
              <TableHead className="font-semibold text-xs">Tipo</TableHead>
              <TableHead className="font-semibold text-xs">Data/Hora</TableHead>
              <TableHead className="font-semibold text-xs">Tempo</TableHead>
              <TableHead className="font-semibold text-xs">Status</TableHead>
              <TableHead className="font-semibold text-xs">Equipe</TableHead>
              <TableHead className="font-semibold text-xs w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((manutencao) => (
              <TableRow key={manutencao.id} className={`border-border/30 hover:bg-muted/30 transition-colors ${selectedIds.has(manutencao.id) ? 'bg-primary/5' : ''}`}>
                <TableCell>
                  <Checkbox checked={selectedIds.has(manutencao.id)} onCheckedChange={() => toggleSelect(manutencao.id)} />
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{manutencao.clientes?.nome_cliente || "N/A"}</div>
                  <div className="text-xs text-muted-foreground">{manutencao.empresas_terceiras?.nome_empresa}</div>
                </TableCell>
                <TableCell className="text-sm">{manutencao.tipos_manutencao?.nome_tipo_manutencao}</TableCell>
                <TableCell>
                  <div className="text-sm">{new Date(manutencao.data_inicio).toLocaleDateString('pt-BR')}</div>
                  <div className="text-xs text-muted-foreground">{manutencao.hora_inicio}</div>
                </TableCell>
                <TableCell className="text-sm">{getTempoDisplay(manutencao)}</TableCell>
                <TableCell>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${manutencao.status === "Finalizado" ? "bg-success/15 text-success border border-success/20" : "bg-warning/15 text-warning border border-warning/20"}`}>
                    {manutencao.status}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{getEquipeNames(manutencao)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {(isAdmin || canViewDetailsSystem('manutencoes')) && (
                      <Button size="sm" variant="ghost" onClick={() => handleView(manutencao)} className="h-8 w-8 p-0 rounded-lg"><Eye className="h-3.5 w-3.5" /></Button>
                    )}
                    {(isAdmin || canEditSystem('manutencoes')) && (
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(manutencao)} className="h-8 w-8 p-0 rounded-lg"><Edit className="h-3.5 w-3.5" /></Button>
                    )}
                    {(isAdmin || canDeleteSystem('manutencoes')) && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(manutencao.id)} className="h-8 w-8 p-0 rounded-lg text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedData.map((manutencao) => (
          <div key={manutencao.id} className={`mobile-card ${selectedIds.has(manutencao.id) ? 'ring-2 ring-primary/30' : ''}`}>
            <div className="flex items-start gap-2">
              <Checkbox checked={selectedIds.has(manutencao.id)} onCheckedChange={() => toggleSelect(manutencao.id)} className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{manutencao.clientes?.nome_cliente || "N/A"}</p>
                    <p className="text-xs text-muted-foreground truncate">{manutencao.empresas_terceiras?.nome_empresa}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${manutencao.status === "Finalizado" ? "bg-success/15 text-success border border-success/20" : "bg-warning/15 text-warning border border-warning/20"}`}>
                    {manutencao.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div><p className="mobile-card-label">Tipo</p><p className="text-xs font-medium truncate">{manutencao.tipos_manutencao?.nome_tipo_manutencao}</p></div>
                  <div><p className="mobile-card-label">Equipes</p><p className="text-xs font-medium">{getEquipeNames(manutencao)}</p></div>
                  <div><p className="mobile-card-label">Data</p><p className="text-xs font-medium">{new Date(manutencao.data_inicio).toLocaleDateString('pt-BR')} {manutencao.hora_inicio}</p></div>
                  <div><p className="mobile-card-label">Tempo</p><p className="text-xs font-medium">{getTempoDisplay(manutencao)}</p></div>
                </div>
                <div className="flex gap-2 pt-1">
                  {(isAdmin || canViewDetailsSystem('manutencoes')) && (
                    <Button size="sm" variant="outline" className="flex-1 h-8 rounded-lg text-xs" onClick={() => handleView(manutencao)}><Eye className="h-3 w-3 mr-1" />Ver</Button>
                  )}
                  {(isAdmin || canEditSystem('manutencoes')) && (
                    <Button size="sm" variant="outline" className="flex-1 h-8 rounded-lg text-xs" onClick={() => handleEdit(manutencao)}><Edit className="h-3 w-3 mr-1" />Editar</Button>
                  )}
                  {(isAdmin || canDeleteSystem('manutencoes')) && (
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-lg text-destructive" onClick={() => handleDelete(manutencao.id)}><Trash2 className="h-3 w-3" /></Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {manutencoesFiltradas.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={manutencoesFiltradas.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}
      
      {manutencoesFiltradas.length === 0 && (
        <div className="glass-card text-center py-12">
          <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-display font-semibold mb-1">Nenhuma manutenção encontrada</h3>
          <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou adicione uma nova manutenção.</p>
        </div>
      )}
    </div>
  )
}
