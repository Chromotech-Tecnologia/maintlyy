import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Clock, Calendar, Eye, Search, Filter, X } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { ExcelImport } from "@/components/ExcelImport"

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
}

interface FormData {
  empresa_terceira_id: string
  cliente_id: string
  tipo_manutencao_id: string
  equipe_id: string
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
  
  const [formData, setFormData] = useState<FormData>({
    empresa_terceira_id: "",
    cliente_id: "",
    tipo_manutencao_id: "",
    equipe_id: "",
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
            equipes(nome_equipe)
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
      const tempo_total = calculateTempo(
        formData.data_inicio,
        formData.hora_inicio,
        formData.data_fim,
        formData.hora_fim
      )

      const data = {
        ...formData,
        user_id: user.id,
        equipe_id: formData.equipe_id || null,
        tempo_total
      }

      if (editingId) {
        const { error } = await supabase
          .from('manutencoes')
          .update(data)
          .eq('id', editingId)
        
        if (error) throw error
        toast.success("Manutenção atualizada!")
      } else {
        const { error } = await supabase
          .from('manutencoes')
          .insert([data])
        
        if (error) throw error
        toast.success("Manutenção criada!")
      }

      setOpen(false)
      setEditingId(null)
      setFormData({
        empresa_terceira_id: "",
        cliente_id: "",
        tipo_manutencao_id: "",
        equipe_id: "",
        data_inicio: "",
        hora_inicio: "",
        data_fim: "",
        hora_fim: "",
        descricao: "",
        solicitante: "",
        status: "Em andamento",
        responsavel: ""
      })
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleEdit = (manutencao: Manutencao) => {
    setFormData({
      empresa_terceira_id: manutencao.empresa_terceira_id,
      cliente_id: manutencao.cliente_id,
      tipo_manutencao_id: manutencao.tipo_manutencao_id,
      equipe_id: manutencao.equipe_id || "",
      data_inicio: manutencao.data_inicio,
      hora_inicio: manutencao.hora_inicio,
      data_fim: manutencao.data_fim || "",
      hora_fim: manutencao.hora_fim || "",
      descricao: manutencao.descricao || "",
      solicitante: manutencao.solicitante || "",
      status: manutencao.status,
      responsavel: manutencao.responsavel || ""
    })
    setEditingId(manutencao.id)
    setOpen(true)
  }

  const handleView = (manutencao: Manutencao) => {
    setViewingManutencao(manutencao)
    setViewDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('manutencoes')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      toast.success("Manutenção excluída!")
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const formatTempo = (minutos?: number) => {
    if (!minutos) return "-"
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return `${horas}h ${mins}m`
  }

  // Filtered data
  const manutencoesFiltradas = manutencoes.filter(m => {
    const searchLower = searchTerm.toLowerCase()
    const matchSearch = !searchTerm || 
      m.clientes?.nome_cliente?.toLowerCase().includes(searchLower) ||
      m.empresas_terceiras?.nome_empresa?.toLowerCase().includes(searchLower) ||
      m.tipos_manutencao?.nome_tipo_manutencao?.toLowerCase().includes(searchLower) ||
      m.equipes?.nome_equipe?.toLowerCase().includes(searchLower) ||
      m.descricao?.toLowerCase().includes(searchLower) ||
      m.solicitante?.toLowerCase().includes(searchLower) ||
      m.responsavel?.toLowerCase().includes(searchLower) ||
      m.status?.toLowerCase().includes(searchLower)
    
    const matchCliente = !filtroCliente || m.cliente_id === filtroCliente
    const matchEmpresa = !filtroEmpresa || m.empresa_terceira_id === filtroEmpresa
    const matchTipo = !filtroTipo || m.tipo_manutencao_id === filtroTipo
    const matchEquipe = !filtroEquipe || m.equipe_id === filtroEquipe
    const matchStatus = !filtroStatus || m.status === filtroStatus
    const matchDataInicio = !filtroDataInicio || m.data_inicio >= filtroDataInicio
    const matchDataFim = !filtroDataFim || m.data_inicio <= filtroDataFim

    return matchSearch && matchCliente && matchEmpresa && matchTipo && matchEquipe && matchStatus && matchDataInicio && matchDataFim
  })

  const hasActiveFilters = filtroCliente || filtroEmpresa || filtroTipo || filtroEquipe || filtroStatus || filtroDataInicio || filtroDataFim

  const clearFilters = () => {
    setFiltroCliente("")
    setFiltroEmpresa("")
    setFiltroTipo("")
    setFiltroEquipe("")
    setFiltroStatus("")
    setFiltroDataInicio("")
    setFiltroDataFim("")
    setSearchTerm("")
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
      </div>
    )
  }

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
                <Button className="gradient-primary border-0 shadow-lg shadow-primary/25 rounded-xl h-11 px-5">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Nova Manutenção</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Nova"} Manutenção</DialogTitle>
              <DialogDescription>
                Preencha os dados da manutenção
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select 
                    value={formData.cliente_id} 
                    onValueChange={(value) => {
                      const clienteSelecionado = clientes.find((c: any) => c.id === value)
                      setFormData({
                        ...formData, 
                        cliente_id: value,
                        empresa_terceira_id: clienteSelecionado?.empresa_terceira_id || ""
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente: any) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome_cliente || "Sem nome"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Empresa *</Label>
                  <Select 
                    value={formData.empresa_terceira_id} 
                    onValueChange={(value) => setFormData({...formData, empresa_terceira_id: value})}
                    disabled={true}
                  >
                    <SelectTrigger className="opacity-60">
                      <SelectValue placeholder={
                        formData.empresa_terceira_id 
                          ? empresas.find((e: any) => e.id === formData.empresa_terceira_id)?.nome_empresa || "Empresa selecionada"
                          : "Selecione um cliente primeiro"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.map((empresa: any) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.nome_empresa}
                        </SelectItem>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map((tipo: any) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nome_tipo_manutencao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Equipe</Label>
                  <Select value={formData.equipe_id} onValueChange={(value) => setFormData({...formData, equipe_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {equipes.map((equipe: any) => (
                        <SelectItem key={equipe.id} value={equipe.id}>
                          {equipe.nome_equipe}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <Input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Início *</Label>
                  <Input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({...formData, data_fim: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Fim</Label>
                  <Input
                    type="time"
                    value={formData.hora_fim}
                    onChange={(e) => setFormData({...formData, hora_fim: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Solicitante</Label>
                  <Input
                    value={formData.solicitante}
                    onChange={(e) => setFormData({...formData, solicitante: e.target.value})}
                    placeholder="Nome do solicitante"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Input
                    value={formData.responsavel}
                    onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                    placeholder="Nome do responsável"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData(prev => ({...prev, status: value}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                    <SelectItem value="Finalizado">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Descreva a manutenção realizada..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, empresa, tipo, descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="sm:w-auto"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-2 bg-primary-foreground text-primary rounded-full h-5 w-5 flex items-center justify-center text-xs">
                !
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <Card className="border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Cliente</Label>
                  <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {clientes.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Empresa</Label>
                  <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {empresas.map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>{e.nome_empresa}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {tipos.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome_tipo_manutencao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Equipe</Label>
                  <Select value={filtroEquipe} onValueChange={setFiltroEquipe}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {equipes.map((eq: any) => (
                        <SelectItem key={eq.id} value={eq.id}>{eq.nome_equipe}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="Em andamento">Em andamento</SelectItem>
                      <SelectItem value="Finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data Início (de)</Label>
                  <Input type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data Início (até)</Label>
                  <Input type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} className="h-9" />
                </div>
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive">
                      <X className="mr-1 h-4 w-4" />
                      Limpar filtros
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Manutenção</DialogTitle>
          </DialogHeader>
          {viewingManutencao && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{viewingManutencao.clientes?.nome_cliente || "Sem nome"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Empresa</Label>
                  <p>{viewingManutencao.empresas_terceiras?.nome_empresa}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p>{viewingManutencao.tipos_manutencao?.nome_tipo_manutencao}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Equipe</Label>
                  <p>{viewingManutencao.equipes?.nome_equipe || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Data/Hora Início</Label>
                  <p>{new Date(viewingManutencao.data_inicio).toLocaleDateString()} {viewingManutencao.hora_inicio}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data/Hora Fim</Label>
                  <p>{viewingManutencao.data_fim ? `${new Date(viewingManutencao.data_fim).toLocaleDateString()} ${viewingManutencao.hora_fim || ''}` : '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tempo Total</Label>
                  <p>{formatTempo(viewingManutencao.tempo_total)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant={viewingManutencao.status === "Finalizado" ? "default" : "secondary"}>
                    {viewingManutencao.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Solicitante</Label>
                  <p>{viewingManutencao.solicitante || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Responsável</Label>
                  <p>{viewingManutencao.responsavel || "-"}</p>
                </div>
              </div>
              {viewingManutencao.descricao && (
                <div>
                  <Label className="text-muted-foreground">Descrição</Label>
                  <p className="whitespace-pre-wrap">{viewingManutencao.descricao}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de Manutenções</CardTitle>
          <CardDescription>
            {manutencoesFiltradas.length} de {manutencoes.length} manutenções
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manutencoesFiltradas.map((manutencao) => (
                  <TableRow key={manutencao.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{manutencao.clientes?.nome_cliente || "Sem nome"}</div>
                        <div className="text-sm text-muted-foreground">{manutencao.empresas_terceiras?.nome_empresa}</div>
                      </div>
                    </TableCell>
                    <TableCell>{manutencao.tipos_manutencao?.nome_tipo_manutencao}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(manutencao.data_inicio).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {manutencao.hora_inicio}
                      </div>
                    </TableCell>
                    <TableCell>{formatTempo(manutencao.tempo_total)}</TableCell>
                    <TableCell>
                      <Badge variant={manutencao.status === "Finalizado" ? "default" : "secondary"}>
                        {manutencao.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{manutencao.equipes?.nome_equipe || "-"}</TableCell>
                    <TableCell>
                      <div className="max-w-40 truncate" title={manutencao.descricao || ""}>
                        {manutencao.descricao || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(isAdmin || canViewDetailsSystem('manutencoes')) && (
                          <Button size="sm" variant="ghost" onClick={() => handleView(manutencao)} title="Ver detalhes">
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        {(isAdmin || canEditSystem('manutencoes')) && (
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(manutencao)} title="Editar">
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        {(isAdmin || canDeleteSystem('manutencoes')) && (
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(manutencao.id)} title="Excluir">
                            <Trash2 className="h-3 w-3" />
                          </Button>
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
            {manutencoesFiltradas.map((manutencao) => (
              <Card key={manutencao.id} className="border shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{manutencao.clientes?.nome_cliente || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{manutencao.empresas_terceiras?.nome_empresa}</p>
                    </div>
                    <Badge variant={manutencao.status === "Finalizado" ? "default" : "secondary"} className="text-xs">
                      {manutencao.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Tipo:</span>
                      <p className="text-xs">{manutencao.tipos_manutencao?.nome_tipo_manutencao}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Equipe:</span>
                      <p className="text-xs">{manutencao.equipes?.nome_equipe || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Data:</span>
                      <p className="text-xs">{new Date(manutencao.data_inicio).toLocaleDateString()} {manutencao.hora_inicio}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Tempo:</span>
                      <p className="text-xs">{formatTempo(manutencao.tempo_total)}</p>
                    </div>
                  </div>
                  {manutencao.descricao && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{manutencao.descricao}</p>
                  )}
                  <div className="flex gap-1 pt-1">
                    {(isAdmin || canViewDetailsSystem('manutencoes')) && (
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => handleView(manutencao)}>
                        <Eye className="h-3 w-3 mr-1" /> Ver
                      </Button>
                    )}
                    {(isAdmin || canEditSystem('manutencoes')) && (
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => handleEdit(manutencao)}>
                        <Edit className="h-3 w-3 mr-1" /> Editar
                      </Button>
                    )}
                    {(isAdmin || canDeleteSystem('manutencoes')) && (
                      <Button size="sm" variant="outline" className="h-8 text-xs text-destructive" onClick={() => handleDelete(manutencao.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {manutencoesFiltradas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma manutenção encontrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
