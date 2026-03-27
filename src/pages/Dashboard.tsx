import { useState, useEffect, useMemo } from "react"
import { StatCard } from "@/components/dashboard/StatCard"
import { ChartCard } from "@/components/dashboard/ChartCard"
import { DashboardReportExport } from "@/components/dashboard/DashboardReportExport"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LabelList } from "recharts"
import {
  Clock, Users, Wrench, TrendingUp, Plus, Calendar, KeyRound, ArrowRight, Filter, UserCog, FileDown, X, Search
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { usePlanLimits } from "@/hooks/usePlanLimits"
import { TablePagination } from "@/components/TablePagination"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DashboardStats {
  totalManutencoes: number
  totalClientes: number
  manutencoesPendentes: number
  totalSenhas: number
  totalHoras: number
}

interface ManutencaoRecente {
  id: string
  created_at: string
  status: string
  clientes?: { nome_cliente: string }
  tipos_manutencao?: { nome_tipo_manutencao: string }
  equipes?: { nome_equipe: string }
  empresas_terceiras?: { nome_empresa: string }
  tempo_total?: number
  data_inicio: string
  hora_inicio?: string
  hora_fim?: string
  cliente_id: string
  equipe_id: string | null
  tipo_manutencao_id: string
  empresa_terceira_id: string
  descricao?: string
}

function formatMinutesToHM(totalMin: number): string {
  if (totalMin === 0) return '0h'
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h > 0 ? `${h}h` : ''}${m > 0 ? `${m}m` : ''}`
}

function getEffectiveMinutes(m: any): number {
  let t = m.tempo_total || 0
  if (t === 0 && m.hora_inicio && m.hora_fim) {
    const [hi, mi] = m.hora_inicio.split(':').map(Number)
    const [hf, mf] = m.hora_fim.split(':').map(Number)
    t = Math.max(0, (hf * 60 + mf) - (hi * 60 + mi))
  }
  return t
}

export default function Dashboard() {
  const { user } = useAuth()
  const { isSuperAdmin } = usePermissions()
  const navigate = useNavigate()
  const planLimits = usePlanLimits()
  const [stats, setStats] = useState<DashboardStats>({
    totalManutencoes: 0, totalClientes: 0, manutencoesPendentes: 0, totalSenhas: 0, totalHoras: 0
  })
  const [recentManutencoes, setRecentManutencoes] = useState<ManutencaoRecente[]>([])
  const [allManutencoes, setAllManutencoes] = useState<ManutencaoRecente[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [tipoData, setTipoData] = useState<any[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [teamData, setTeamData] = useState<any[]>([])
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [clienteChartData, setClienteChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [clientes, setClientes] = useState<{id: string, nome_cliente: string, logo_url?: string | null, empresa_terceira_id?: string}[]>([])
  const [equipes, setEquipes] = useState<{id: string, nome_equipe: string}[]>([])
  const [tipos, setTipos] = useState<{id: string, nome_tipo_manutencao: string}[]>([])
  const [empresas, setEmpresas] = useState<{id: string, nome_empresa: string}[]>([])
  const [filterCliente, setFilterCliente] = useState("todos")
  const [filterEquipe, setFilterEquipe] = useState("todos")
  const [filterTipo, setFilterTipo] = useState("todos")
  const [filterEmpresa, setFilterEmpresa] = useState("todos")
  const [filterStatus, setFilterStatus] = useState("todos")
  const [filterDataInicio, setFilterDataInicio] = useState("")
  const [filterDataFim, setFilterDataFim] = useState("")
  const [searchCliente, setSearchCliente] = useState("")
  const [searchEquipe, setSearchEquipe] = useState("")
  const [searchTipo, setSearchTipo] = useState("")
  const [searchEmpresa, setSearchEmpresa] = useState("")
  const [reportOpen, setReportOpen] = useState(false)
  const [reportFilterDataInicio, setReportFilterDataInicio] = useState("")
  const [reportFilterDataFim, setReportFilterDataFim] = useState("")

  // Maintenance table pagination
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState(10)

  const currentYear = new Date().getFullYear()
  const canGenerateDashboardReport = planLimits.relatoriosAvancados || isSuperAdmin
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))']
  const getSortDate = (m: ManutencaoRecente) => new Date(`${m.data_inicio}T00:00:00`).getTime() || new Date(m.created_at).getTime()

  // Auto-select empresa when cliente is selected
  useEffect(() => {
    if (filterCliente !== "todos") {
      const selectedClientes = [clientes.find(c => c.id === filterCliente)].filter(Boolean)
      if (selectedClientes.length === 1 && selectedClientes[0]?.empresa_terceira_id) {
        setFilterEmpresa(selectedClientes[0].empresa_terceira_id)
      }
    }
  }, [filterCliente, clientes])

  // Check if empresa should be locked
  const isEmpresaLocked = useMemo(() => {
    if (filterCliente === "todos") return false
    const cli = clientes.find(c => c.id === filterCliente)
    return !!cli?.empresa_terceira_id
  }, [filterCliente, clientes])

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      try {
        const [mc, cc, pc, sc, cd, clientesRes, equipesRes, tiposRes, empresasRes] = await Promise.all([
          supabase.from('manutencoes').select('id', { count: 'exact', head: true }),
          supabase.from('clientes').select('id', { count: 'exact', head: true }),
          supabase.from('manutencoes').select('id', { count: 'exact', head: true }).eq('status', 'Em andamento'),
          supabase.from('cofre_senhas').select('id', { count: 'exact', head: true }),
          supabase.from('manutencoes').select(`*,tipos_manutencao(nome_tipo_manutencao),equipes(nome_equipe),clientes(nome_cliente),empresas_terceiras(nome_empresa)`),
          supabase.from('clientes').select('id, nome_cliente, logo_url, empresa_terceira_id'),
          supabase.from('equipes').select('id, nome_equipe'),
          supabase.from('tipos_manutencao').select('id, nome_tipo_manutencao'),
          supabase.from('empresas_terceiras').select('id, nome_empresa'),
        ])

        const totalHorasMin = (cd.data || []).reduce((sum, m) => sum + getEffectiveMinutes(m), 0)

        setStats({
          totalManutencoes: mc.count || 0,
          totalClientes: cc.count || 0,
          manutencoesPendentes: pc.count || 0,
          totalSenhas: sc.count || 0,
          totalHoras: totalHorasMin,
        })
        setRecentManutencoes(
          [...(cd.data || [])].sort((a, b) => getSortDate(b as ManutencaoRecente) - getSortDate(a as ManutencaoRecente)).slice(0, 5)
        )
        setAllManutencoes(cd.data || [])
        setClientes(clientesRes.data || [])
        setEquipes(equipesRes.data || [])
        setTipos(tiposRes.data || [])
        setEmpresas(empresasRes.data || [])
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  // Filtered data for table
  const filteredManutencoes = useMemo(() => {
    return allManutencoes.filter(m => {
      if (filterCliente !== "todos" && m.cliente_id !== filterCliente) return false
      if (filterEquipe !== "todos" && m.equipe_id !== filterEquipe) return false
      if (filterTipo !== "todos" && m.tipo_manutencao_id !== filterTipo) return false
      if (filterEmpresa !== "todos" && m.empresa_terceira_id !== filterEmpresa) return false
      if (filterStatus !== "todos" && m.status !== filterStatus) return false
      if (filterDataInicio && m.data_inicio < filterDataInicio) return false
      if (filterDataFim && m.data_inicio > filterDataFim) return false
      return true
    }).sort((a, b) => getSortDate(b as ManutencaoRecente) - getSortDate(a as ManutencaoRecente))
  }, [allManutencoes, filterCliente, filterEquipe, filterTipo, filterEmpresa, filterStatus, filterDataInicio, filterDataFim])

  // Recompute charts when filters change
  useEffect(() => {
    const filtered = filteredManutencoes

    const hasFilters = filterCliente !== "todos" || filterEquipe !== "todos" || filterTipo !== "todos" || filterEmpresa !== "todos" || filterStatus !== "todos" || filterDataInicio || filterDataFim

    if (hasFilters) {
      const totalMin = filtered.reduce((sum, m) => sum + getEffectiveMinutes(m), 0)
      const uniqueClientes = new Set(filtered.map(m => m.cliente_id))
      const pendentes = filtered.filter(m => m.status === 'Em andamento')
      setStats(prev => ({
        ...prev,
        totalManutencoes: filtered.length,
        totalClientes: uniqueClientes.size,
        manutencoesPendentes: pendentes.length,
        totalHoras: totalMin,
      }))
    } else {
      const totalMin = allManutencoes.reduce((sum, m) => sum + getEffectiveMinutes(m), 0)
      setStats(prev => ({
        ...prev,
        totalManutencoes: allManutencoes.length,
        manutencoesPendentes: allManutencoes.filter(m => m.status === 'Em andamento').length,
        totalHoras: totalMin,
      }))
    }

    setRecentManutencoes(
      [...filtered].sort((a, b) => getSortDate(b as ManutencaoRecente) - getSortDate(a as ManutencaoRecente)).slice(0, 5)
    )

    // Monthly chart
    const filterYear = filterDataInicio ? new Date(filterDataInicio).getFullYear() : (filterDataFim ? new Date(filterDataFim).getFullYear() : currentYear)
    const visaoMensal = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(filterYear, i)
      const monthLabel = monthDate.toLocaleDateString('pt-BR', { month: 'short' }) + '/' + String(filterYear).slice(2)
      const monthItems = filtered.filter(m => {
        const d = new Date(m.data_inicio)
        return d.getMonth() === i && d.getFullYear() === filterYear
      })
      const totalMin = monthItems.reduce((s, m) => s + getEffectiveMinutes(m), 0)
      return { name: monthLabel, manutenções: monthItems.length, horas: formatMinutesToHM(totalMin) }
    })
    setChartData(visaoMensal)

    // Type breakdown
    const tipoMap: Record<string, number> = {}
    filtered.forEach(m => {
      const name = (m as any).tipos_manutencao?.nome_tipo_manutencao || 'Sem tipo'
      tipoMap[name] = (tipoMap[name] || 0) + 1
    })
    setTipoData(Object.entries(tipoMap).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] })))

    // Status distribution
    const statusMap: Record<string, number> = {}
    filtered.forEach(m => {
      const s = m.status || 'Em andamento'
      statusMap[s] = (statusMap[s] || 0) + 1
    })
    const statusColors: Record<string, string> = { 'Finalizado': 'hsl(142, 76%, 36%)', 'Em andamento': 'hsl(38, 92%, 50%)', 'Cancelado': 'hsl(0, 84%, 60%)' }
    setStatusData(Object.entries(statusMap).map(([name, value]) => ({ name, value, color: statusColors[name] || 'hsl(215, 16%, 47%)' })))

    // Team breakdown
    const teamMap: Record<string, number> = {}
    filtered.forEach(m => {
      const name = (m as any).equipes?.nome_equipe || 'Sem equipe'
      const mins = getEffectiveMinutes(m)
      teamMap[name] = (teamMap[name] || 0) + mins
    })
    setTeamData(Object.entries(teamMap).map(([name, value], i) => ({ name, horas: formatMinutesToHM(value), horasMin: value, fill: COLORS[i % COLORS.length] })))

    // Weekly trend (last 8 weeks)
    const weeks: any[] = []
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (w * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const count = filtered.filter(m => {
        const d = new Date(m.data_inicio)
        return d >= weekStart && d < weekEnd
      }).length
      weeks.push({ name: `S${8 - w}`, value: count })
    }
    setWeeklyData(weeks)

    // Client chart data (hours + maintenances per client)
    const cliData = clientes.map(cli => {
      const cliManutencoes = filtered.filter(m => m.cliente_id === cli.id)
      const totalMin = cliManutencoes.reduce((s, m) => s + getEffectiveMinutes(m), 0)
      return { name: cli.nome_cliente, manutenções: cliManutencoes.length, horas: formatMinutesToHM(totalMin), horasMin: totalMin }
    }).filter(e => e.manutenções > 0)
    setClienteChartData(cliData)

    setTablePage(1)
  }, [filteredManutencoes, allManutencoes, clientes, filterCliente, filterEquipe, filterTipo, filterEmpresa, filterStatus, filterDataInicio, filterDataFim])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Finalizado': return 'bg-success/15 text-success border border-success/20'
      case 'Em andamento': return 'bg-warning/15 text-warning border border-warning/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const clearFilters = () => {
    setFilterCliente("todos"); setFilterEquipe("todos"); setFilterTipo("todos")
    setFilterEmpresa("todos"); setFilterStatus("todos")
    setFilterDataInicio(""); setFilterDataFim("")
  }

  const hasActiveFilters = filterCliente !== "todos" || filterEquipe !== "todos" || filterTipo !== "todos" || filterEmpresa !== "todos" || filterStatus !== "todos" || filterDataInicio || filterDataFim

  // Table pagination
  const paginatedManutencoes = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize
    return filteredManutencoes.slice(start, start + tablePageSize)
  }, [filteredManutencoes, tablePage, tablePageSize])

  const totalTablePages = Math.ceil(filteredManutencoes.length / tablePageSize)

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Dashboard</h1>
          <p className="page-subtitle">Visão geral do sistema — {currentYear}</p>
        </div>
        <div className="flex items-center gap-2">
          {canGenerateDashboardReport && (
            <Button 
              variant="outline"
              className="rounded-xl h-11 px-4"
              onClick={() => setReportOpen(true)}
            >
              <FileDown className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Relatório</span>
            </Button>
          )}
          <Button 
            className="gradient-primary border-0 shadow-lg shadow-primary/25 rounded-xl h-11 px-5"
            onClick={() => navigate('/manutencoes')}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nova Manutenção</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros</span>
              {hasActiveFilters && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Ativos</span>
              )}
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" /> Limpar
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {/* Cliente FIRST */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Select value={filterCliente} onValueChange={v => { setFilterCliente(v); if (v === "todos") setFilterEmpresa("todos") }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Cliente" /></SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input className="w-full pl-7 pr-2 py-1.5 text-sm border border-border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary" placeholder="Buscar..." value={searchCliente} onChange={e => setSearchCliente(e.target.value)} onClick={e => e.stopPropagation()} />
                    </div>
                  </div>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {clientes.filter(c => !searchCliente || c.nome_cliente?.toLowerCase().includes(searchCliente.toLowerCase())).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Empresa */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Empresa</Label>
              <Select value={filterEmpresa} onValueChange={setFilterEmpresa} disabled={isEmpresaLocked}>
                <SelectTrigger className={`h-9 ${isEmpresaLocked ? 'opacity-60' : ''}`}><SelectValue placeholder="Empresa" /></SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input className="w-full pl-7 pr-2 py-1.5 text-sm border border-border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary" placeholder="Buscar..." value={searchEmpresa} onChange={e => setSearchEmpresa(e.target.value)} onClick={e => e.stopPropagation()} />
                    </div>
                  </div>
                  <SelectItem value="todos">Todas as empresas</SelectItem>
                  {empresas.filter(e => !searchEmpresa || e.nome_empresa?.toLowerCase().includes(searchEmpresa.toLowerCase())).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome_empresa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEmpresaLocked && <p className="text-[10px] text-muted-foreground">Selecionada pelo cliente</p>}
            </div>
            {/* Equipe */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Equipe</Label>
              <Select value={filterEquipe} onValueChange={setFilterEquipe}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Equipe" /></SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input className="w-full pl-7 pr-2 py-1.5 text-sm border border-border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary" placeholder="Buscar..." value={searchEquipe} onChange={e => setSearchEquipe(e.target.value)} onClick={e => e.stopPropagation()} />
                    </div>
                  </div>
                  <SelectItem value="todos">Todas as equipes</SelectItem>
                  {equipes.filter(e => !searchEquipe || e.nome_equipe?.toLowerCase().includes(searchEquipe.toLowerCase())).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome_equipe}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Tipo */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input className="w-full pl-7 pr-2 py-1.5 text-sm border border-border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary" placeholder="Buscar..." value={searchTipo} onChange={e => setSearchTipo(e.target.value)} onClick={e => e.stopPropagation()} />
                    </div>
                  </div>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {tipos.filter(t => !searchTipo || t.nome_tipo_manutencao?.toLowerCase().includes(searchTipo.toLowerCase())).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome_tipo_manutencao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Datas */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Data Início</Label>
              <Input type="date" className="h-9" value={filterDataInicio} onChange={e => setFilterDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Data Fim</Label>
              <Input type="date" className="h-9" value={filterDataFim} onChange={e => setFilterDataFim(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard title="Manutenções" value={stats.totalManutencoes} description="Total cadastrado" icon={Wrench} gradient="primary" />
        <StatCard title="Clientes" value={stats.totalClientes} description="Ativos no sistema" icon={Users} gradient="success" />
        <StatCard title="Pendentes" value={stats.manutencoesPendentes} description="Em andamento" icon={Clock} gradient="warm" />
        <StatCard title="Horas" value={formatMinutesToHM(stats.totalHoras)} description="Total acumulado" icon={Calendar} gradient="primary" />
        <StatCard title="Senhas" value={stats.totalSenhas} description="No cofre" icon={KeyRound} gradient="danger" />
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <ChartCard title="Visão Mensal" description={`Manutenções e horas — ${filterDataInicio ? new Date(filterDataInicio).getFullYear() : currentYear}`} icon={Calendar}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="manutenções" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="horas" fill="hsl(142, 76%, 36%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Recent */}
        <Card className="glass-card border-0 lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base font-display font-semibold">Recentes</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/manutencoes')} className="text-xs text-primary">
                Ver tudo <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentManutencoes.length > 0 ? (
              <div className="space-y-2.5">
                {recentManutencoes.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{(m as any).clientes?.nome_cliente || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground truncate">{(m as any).tipos_manutencao?.nome_tipo_manutencao || 'N/A'}</p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", getStatusColor(m.status))}>
                        {m.status}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(m.data_inicio).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wrench className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma manutenção ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tipoData.length > 0 && (
          <ChartCard title="Por Tipo" description="Distribuição de manutenções" icon={Wrench}>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={tipoData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value" label={false}>
                    {tipoData.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 px-2">
                {tipoData.map((entry: any, index: number) => (
                  <div key={index} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="truncate max-w-[100px]">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        )}

        {statusData.length > 0 && (
          <ChartCard title="Por Status" description="Status das manutenções" icon={Clock}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                  {statusData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        <ChartCard title="Tendência Semanal" description="Últimas 8 semanas" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Manutenções" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Client Hours Chart */}
      {clienteChartData.length > 0 && (
        <ChartCard title="Total de Horas e Manutenções por Cliente" description="Visão consolidada por cliente" icon={Users}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clienteChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="manutenções" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="manutenções" position="top" style={{ fontSize: 9, fill: 'hsl(var(--primary))' }} />
              </Bar>
              <Bar dataKey="horas" fill="hsl(38, 92%, 50%)" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="horas" position="top" style={{ fontSize: 9, fill: 'hsl(38, 92%, 50%)' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Team Hours + Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {teamData.length > 0 && (
          <ChartCard title="Horas por Equipe" description="Distribuição de horas" icon={UserCog}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={teamData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} formatter={(value: any, name: any, props: any) => [props.payload.horas, 'Horas']} />
                <Bar dataKey="horasMin" radius={[0, 6, 6, 0]} name="Horas">
                  {teamData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="horas" position="right" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        <Card className="glass-card border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base font-display font-semibold">Ações Rápidas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Nova Manutenção", icon: Plus, url: "/manutencoes", gradient: "gradient-primary" },
                { label: "Clientes", icon: Users, url: "/clientes", gradient: "gradient-success" },
                { label: "Cofre de Senhas", icon: KeyRound, url: "/cofre", gradient: "gradient-warm" },
                { label: "Equipes", icon: Users, url: "/equipes", gradient: "gradient-danger" },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.url)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl text-primary-foreground text-xs font-medium",
                    "transition-all duration-200 hover:scale-105 hover:shadow-lg",
                    action.gradient
                  )}
                >
                  <action.icon className="h-5 w-5" />
                  {action.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Table */}
      {filteredManutencoes.length > 0 && (
        <Card className="glass-card border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wrench className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-display font-semibold">Manutenções</CardTitle>
                  <p className="text-xs text-muted-foreground">{filteredManutencoes.length} registros</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Por página:</Label>
                <Select value={String(tablePageSize)} onValueChange={v => { setTablePageSize(Number(v)); setTablePage(1) }}>
                  <SelectTrigger className="h-7 w-[70px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Tempo</TableHead>
                      <TableHead className="text-xs">Descrição</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedManutencoes.map(m => {
                      const mins = getEffectiveMinutes(m)
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs">{(m as any).tipos_manutencao?.nome_tipo_manutencao || '—'}</TableCell>
                          <TableCell className="text-xs">{(m as any).clientes?.nome_cliente || '—'}</TableCell>
                          <TableCell className="text-xs">{new Date(m.data_inicio).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="text-xs font-medium">{formatMinutesToHM(mins)}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{m.descricao || '—'}</TableCell>
                          <TableCell>
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", getStatusColor(m.status))}>
                              {m.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
            {/* Total row */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <p className="text-xs font-semibold">
                Total: {filteredManutencoes.length} manutenções — {formatMinutesToHM(filteredManutencoes.reduce((s, m) => s + getEffectiveMinutes(m), 0))}
              </p>
              {totalTablePages > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={tablePage === 1} onClick={() => setTablePage(p => p - 1)}>Anterior</Button>
                  <span className="text-xs text-muted-foreground">{tablePage}/{totalTablePages}</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={tablePage === totalTablePages} onClick={() => setTablePage(p => p + 1)}>Próximo</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <DashboardReportExport
        open={reportOpen}
        onOpenChange={setReportOpen}
        data={{ chartData, tipoData, statusData, teamData, weeklyData, stats }}
        filters={{
          clientes,
          equipes,
          tipos,
          empresas,
          filterCliente,
          filterEquipe,
          filterTipo,
          filterEmpresa,
          filterStatus,
          filterDataInicio: reportFilterDataInicio,
          filterDataFim: reportFilterDataFim,
          onFilterChange: (key, value) => {
            if (key === 'cliente') setFilterCliente(value)
            else if (key === 'equipe') setFilterEquipe(value)
            else if (key === 'tipo') setFilterTipo(value)
            else if (key === 'empresa') setFilterEmpresa(value)
            else if (key === 'status') setFilterStatus(value)
            else if (key === 'dataInicio') setReportFilterDataInicio(value)
            else if (key === 'dataFim') setReportFilterDataFim(value)
          }
        }}
        allManutencoes={allManutencoes}
        currentYear={currentYear}
      />
    </div>
  )
}
