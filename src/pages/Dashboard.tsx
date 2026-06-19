import { useState, useEffect, useMemo } from "react"
import { StatCard } from "@/components/dashboard/StatCard"
import { ChartCard } from "@/components/dashboard/ChartCard"
import { DashboardReportExport } from "@/components/dashboard/DashboardReportExport"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/multi-select"
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
import { fetchAllInBatches } from "@/lib/fetchAll"
import { parseLocalDate, formatLocalDateBR } from "@/lib/dateUtils"

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

const MAX_REASONABLE_MINUTES = 60 * 24 * 30 // 30 dias
function getEffectiveMinutes(m: any): number {
  let t = m.tempo_total || 0
  // Recalcula a partir dos horários quando o tempo armazenado é inválido
  // (zero, negativo ou absurdo por erro de digitação na data)
  if ((t <= 0 || t > MAX_REASONABLE_MINUTES) && m.hora_inicio && m.hora_fim) {
    const [hi, mi] = m.hora_inicio.split(':').map(Number)
    const [hf, mf] = m.hora_fim.split(':').map(Number)
    const recalc = (hf * 60 + mf) - (hi * 60 + mi)
    t = recalc >= 0 ? recalc : recalc + 24 * 60
  }
  if (t < 0 || t > MAX_REASONABLE_MINUTES) t = 0
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
  const [filterCliente, setFilterCliente] = useState<string[]>([])
  const [filterEquipe, setFilterEquipe] = useState<string[]>([])
  const [filterTipo, setFilterTipo] = useState<string[]>([])
  const [filterEmpresa, setFilterEmpresa] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterDataInicio, setFilterDataInicio] = useState("")
  const [filterDataFim, setFilterDataFim] = useState("")
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

  // Auto-select empresa when a single cliente is selected
  useEffect(() => {
    if (filterCliente.length === 1) {
      const cli = clientes.find(c => c.id === filterCliente[0])
      if (cli?.empresa_terceira_id) {
        setFilterEmpresa([cli.empresa_terceira_id])
      }
    }
  }, [filterCliente, clientes])

  // Check if empresa should be locked (single cliente with empresa)
  const isEmpresaLocked = useMemo(() => {
    if (filterCliente.length !== 1) return false
    const cli = clientes.find(c => c.id === filterCliente[0])
    return !!cli?.empresa_terceira_id
  }, [filterCliente, clientes])

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      try {
        const [mc, cc, pc, sc, cdData, clientesRes, equipesRes, tiposRes, empresasRes] = await Promise.all([
          supabase.from('manutencoes').select('id', { count: 'exact', head: true }),
          supabase.from('clientes').select('id', { count: 'exact', head: true }),
          supabase.from('manutencoes').select('id', { count: 'exact', head: true }).eq('status', 'Em andamento'),
          supabase.from('cofre_senhas').select('id', { count: 'exact', head: true }),
          fetchAllInBatches<any>(() => supabase.from('manutencoes').select(`*,tipos_manutencao(nome_tipo_manutencao),equipes(nome_equipe),clientes(nome_cliente),empresas_terceiras(nome_empresa)`)),
          supabase.from('clientes').select('id, nome_cliente, logo_url, empresa_terceira_id'),
          supabase.from('equipes').select('id, nome_equipe'),
          supabase.from('tipos_manutencao').select('id, nome_tipo_manutencao'),
          supabase.from('empresas_terceiras').select('id, nome_empresa'),
        ])
        const cd = { data: cdData }

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
      if (filterCliente.length > 0 && !filterCliente.includes(m.cliente_id)) return false
      if (filterEquipe.length > 0 && !filterEquipe.includes(m.equipe_id)) return false
      if (filterTipo.length > 0 && !filterTipo.includes(m.tipo_manutencao_id)) return false
      if (filterEmpresa.length > 0 && !filterEmpresa.includes(m.empresa_terceira_id)) return false
      if (filterStatus.length > 0 && !filterStatus.includes(m.status || 'Em andamento')) return false
      if (filterDataInicio && m.data_inicio < filterDataInicio) return false
      if (filterDataFim && m.data_inicio > filterDataFim) return false
      return true
    }).sort((a, b) => getSortDate(b as ManutencaoRecente) - getSortDate(a as ManutencaoRecente))
  }, [allManutencoes, filterCliente, filterEquipe, filterTipo, filterEmpresa, filterStatus, filterDataInicio, filterDataFim])

  // Recompute charts when filters change
  useEffect(() => {
    const filtered = filteredManutencoes

    const hasFilters = filterCliente.length > 0 || filterEquipe.length > 0 || filterTipo.length > 0 || filterEmpresa.length > 0 || filterStatus.length > 0 || filterDataInicio || filterDataFim

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

    // Monthly chart — supports multi-year ranges (scrollable when > 12 months)
    let startYear: number, startMonth: number, monthCount: number
    if (filterDataInicio && filterDataFim) {
      const di = parseLocalDate(filterDataInicio)
      const df = parseLocalDate(filterDataFim)
      startYear = di.getFullYear(); startMonth = di.getMonth()
      monthCount = (df.getFullYear() - di.getFullYear()) * 12 + (df.getMonth() - di.getMonth()) + 1
      if (monthCount < 1) monthCount = 1
    } else {
      const filterYear = filterDataInicio ? parseLocalDate(filterDataInicio).getFullYear() : (filterDataFim ? parseLocalDate(filterDataFim).getFullYear() : currentYear)
      startYear = filterYear; startMonth = 0; monthCount = 12
    }
    const visaoMensal = Array.from({ length: monthCount }, (_, i) => {
      const mIdx = (startMonth + i) % 12
      const yOff = Math.floor((startMonth + i) / 12)
      const y = startYear + yOff
      const monthDate = new Date(y, mIdx)
      const monthLabel = monthDate.toLocaleDateString('pt-BR', { month: 'short' }) + '/' + String(y).slice(2)
      const monthItems = filtered.filter(m => {
        const d = parseLocalDate(m.data_inicio)
        return d.getMonth() === mIdx && d.getFullYear() === y
      })
      const totalMin = monthItems.reduce((s, m) => s + getEffectiveMinutes(m), 0)
      return { name: monthLabel, manutenções: monthItems.length, horas: Math.round((totalMin / 60) * 10) / 10, horasMin: totalMin }
    })
    setChartData(visaoMensal)

    // Type breakdown (count + hours)
    const tipoMap: Record<string, { count: number; mins: number }> = {}
    filtered.forEach(m => {
      const name = (m as any).tipos_manutencao?.nome_tipo_manutencao || 'Sem tipo'
      if (!tipoMap[name]) tipoMap[name] = { count: 0, mins: 0 }
      tipoMap[name].count += 1
      tipoMap[name].mins += getEffectiveMinutes(m)
    })
    setTipoData(Object.entries(tipoMap).map(([name, v], i) => ({ name, value: v.count, horasMin: v.mins, color: COLORS[i % COLORS.length] })))

    // Status distribution (count + hours)
    const statusMap: Record<string, { count: number; mins: number }> = {}
    filtered.forEach(m => {
      const s = m.status || 'Em andamento'
      if (!statusMap[s]) statusMap[s] = { count: 0, mins: 0 }
      statusMap[s].count += 1
      statusMap[s].mins += getEffectiveMinutes(m)
    })
    const statusColors: Record<string, string> = { 'Finalizado': 'hsl(142, 76%, 36%)', 'Em andamento': 'hsl(38, 92%, 50%)', 'Cancelado': 'hsl(0, 84%, 60%)' }
    setStatusData(Object.entries(statusMap).map(([name, v]) => ({ name, value: v.count, horasMin: v.mins, color: statusColors[name] || 'hsl(215, 16%, 47%)' })))

    // Team breakdown (hours + count)
    const teamMap: Record<string, { mins: number; count: number }> = {}
    filtered.forEach(m => {
      const name = (m as any).equipes?.nome_equipe || 'Sem equipe'
      if (!teamMap[name]) teamMap[name] = { mins: 0, count: 0 }
      teamMap[name].mins += getEffectiveMinutes(m)
      teamMap[name].count += 1
    })
    setTeamData(Object.entries(teamMap).map(([name, v], i) => ({ name, horas: formatMinutesToHM(v.mins), horasMin: v.mins, manutenções: v.count, fill: COLORS[i % COLORS.length] })))

    // Weekly trend (last 8 weeks) — count + hours
    const weeks: any[] = []
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (w * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const wkItems = filtered.filter(m => {
        const d = parseLocalDate(m.data_inicio)
        return d >= weekStart && d < weekEnd
      })
      const wkMin = wkItems.reduce((s, m) => s + getEffectiveMinutes(m), 0)
      weeks.push({ name: `S${8 - w}`, value: wkItems.length, horasMin: wkMin })
    }
    setWeeklyData(weeks)

    // Client chart data (hours + maintenances per client)
    const cliData = clientes.map(cli => {
      const cliManutencoes = filtered.filter(m => m.cliente_id === cli.id)
      const totalMin = cliManutencoes.reduce((s, m) => s + getEffectiveMinutes(m), 0)
      return { name: cli.nome_cliente, manutenções: cliManutencoes.length, horas: Math.round((totalMin / 60) * 10) / 10, horasMin: totalMin }
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
    setFilterCliente([]); setFilterEquipe([]); setFilterTipo([])
    setFilterEmpresa([]); setFilterStatus([])
    setFilterDataInicio(""); setFilterDataFim("")
  }

  const hasActiveFilters = filterCliente.length > 0 || filterEquipe.length > 0 || filterTipo.length > 0 || filterEmpresa.length > 0 || filterStatus.length > 0 || filterDataInicio || filterDataFim

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
            {/* Cliente */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <MultiSelect
                options={clientes.map(c => ({ value: c.id, label: c.nome_cliente }))}
                value={filterCliente}
                onChange={v => { setFilterCliente(v); if (v.length === 0) setFilterEmpresa([]) }}
                allLabel="Todos os clientes"
                placeholder="Cliente"
              />
            </div>
            {/* Empresa */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Empresa</Label>
              <MultiSelect
                options={empresas.map(e => ({ value: e.id, label: e.nome_empresa }))}
                value={filterEmpresa}
                onChange={setFilterEmpresa}
                allLabel="Todas as empresas"
                placeholder="Empresa"
                disabled={isEmpresaLocked}
                triggerClassName={isEmpresaLocked ? 'opacity-60' : ''}
              />
              {isEmpresaLocked && <p className="text-[10px] text-muted-foreground">Selecionada pelo cliente</p>}
            </div>
            {/* Equipe */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Equipe</Label>
              <MultiSelect
                options={equipes.map(e => ({ value: e.id, label: e.nome_equipe }))}
                value={filterEquipe}
                onChange={setFilterEquipe}
                allLabel="Todas as equipes"
                placeholder="Equipe"
              />
            </div>
            {/* Tipo */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <MultiSelect
                options={tipos.map(t => ({ value: t.id, label: t.nome_tipo_manutencao }))}
                value={filterTipo}
                onChange={setFilterTipo}
                allLabel="Todos os tipos"
                placeholder="Tipo"
              />
            </div>
            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <MultiSelect
                options={[
                  { value: 'Em andamento', label: 'Em andamento' },
                  { value: 'Finalizado', label: 'Finalizado' },
                  { value: 'Cancelado', label: 'Cancelado' },
                ]}
                value={filterStatus}
                onChange={setFilterStatus}
                allLabel="Todos"
                placeholder="Status"
              />
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
          <ChartCard title="Visão Mensal" description={`Manutenções e horas${chartData.length > 12 ? ` — ${chartData.length} meses` : ` — ${filterDataInicio ? parseLocalDate(filterDataInicio).getFullYear() : currentYear}`}`} icon={Calendar}>
            <div className="overflow-x-auto">
              <div style={{ minWidth: chartData.length > 12 ? chartData.length * 70 : '100%', width: chartData.length > 12 ? chartData.length * 70 : '100%' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} formatter={(value: any, name: any, props: any) => name === 'horas' ? [formatMinutesToHM(props?.payload?.horasMin ?? Math.round(Number(value) * 60)), 'horas'] : [value, name]} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="manutenções" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="manutenções" position="top" style={{ fontSize: 10, fill: 'hsl(var(--primary))' }} />
                    </Bar>
                    <Bar dataKey="horas" fill="hsl(142, 76%, 36%)" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="horasMin" position="top" formatter={(v: any) => formatMinutesToHM(Number(v) || 0)} style={{ fontSize: 10, fill: 'hsl(142, 76%, 36%)' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
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
                        {formatLocalDateBR(m.data_inicio)}
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
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} formatter={(value: any, _name: any, props: any) => [`${value} (${formatMinutesToHM(props?.payload?.horasMin || 0)})`, props?.payload?.name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 px-2">
                {tipoData.map((entry: any, index: number) => (
                  <div key={index} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="truncate max-w-[140px]">{entry.name} ({entry.value} • {formatMinutesToHM(entry.horasMin || 0)})</span>
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
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" label={(e: any) => `${e.value} • ${formatMinutesToHM(e.horasMin || 0)}`} labelLine={false} style={{ fontSize: 10 }}>
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
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} formatter={(value: any, _name: any, props: any) => [`${value} • ${formatMinutesToHM(props?.payload?.horasMin || 0)}`, 'Manutenções']} />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Manutenções">
                <LabelList position="top" content={(props: any) => {
                  const { x, y, index } = props
                  const d = weeklyData[index]
                  if (!d) return null
                  return (
                    <text x={x} y={(y || 0) - 6} textAnchor="middle" style={{ fontSize: 9, fill: 'hsl(var(--primary))' }}>
                      {`${d.value} • ${formatMinutesToHM(d.horasMin || 0)}`}
                    </text>
                  )
                }} />
              </Area>
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
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} formatter={(value: any, name: any, props: any) => name === 'horas' ? [formatMinutesToHM(props?.payload?.horasMin ?? Math.round(Number(value) * 60)), 'horas'] : [value, name]} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="manutenções" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="manutenções" position="top" style={{ fontSize: 9, fill: 'hsl(var(--primary))' }} />
              </Bar>
              <Bar dataKey="horas" fill="hsl(38, 92%, 50%)" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="horasMin" position="top" formatter={(v: any) => formatMinutesToHM(Number(v) || 0)} style={{ fontSize: 9, fill: 'hsl(38, 92%, 50%)' }} />
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
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} formatter={(_value: any, _name: any, props: any) => [`${props.payload.manutenções} manut. • ${props.payload.horas}`, 'Total']} />
                <Bar dataKey="horasMin" radius={[0, 6, 6, 0]} name="Horas">
                  {teamData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                  <LabelList position="right" content={(props: any) => {
                    const { x, y, width, height, index } = props
                    const d = teamData[index]
                    if (!d) return null
                    return (
                      <text x={(x || 0) + (width || 0) + 6} y={(y || 0) + (height || 0) / 2 + 3} style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}>
                        {`${d.manutenções} • ${d.horas}`}
                      </text>
                    )
                  }} />
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
                          <TableCell className="text-xs">{formatLocalDateBR(m.data_inicio)}</TableCell>
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
