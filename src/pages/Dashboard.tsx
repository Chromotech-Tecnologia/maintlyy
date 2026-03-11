import { useState, useEffect } from "react"
import { StatCard } from "@/components/dashboard/StatCard"
import { ChartCard } from "@/components/dashboard/ChartCard"
import { DashboardReportExport } from "@/components/dashboard/DashboardReportExport"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts"
import { 
  Clock, Users, Wrench, TrendingUp, Plus, Calendar, KeyRound, ArrowRight, Filter, UserCog, FileDown, X, Search
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

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
  tempo_total?: number
  data_inicio: string
  cliente_id: string
  equipe_id: string | null
  tipo_manutencao_id: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
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
  const [loading, setLoading] = useState(true)

  // Filters
  const [clientes, setClientes] = useState<{id: string, nome_cliente: string}[]>([])
  const [equipes, setEquipes] = useState<{id: string, nome_equipe: string}[]>([])
  const [tipos, setTipos] = useState<{id: string, nome_tipo_manutencao: string}[]>([])
  const [filterCliente, setFilterCliente] = useState("todos")
  const [filterEquipe, setFilterEquipe] = useState("todos")
  const [filterTipo, setFilterTipo] = useState("todos")
  const [filterDataInicio, setFilterDataInicio] = useState("")
  const [filterDataFim, setFilterDataFim] = useState("")
  const [searchCliente, setSearchCliente] = useState("")
  const [searchEquipe, setSearchEquipe] = useState("")
  const [searchTipo, setSearchTipo] = useState("")
  const [reportOpen, setReportOpen] = useState(false)
  const [reportFilterDataInicio, setReportFilterDataInicio] = useState("")
  const [reportFilterDataFim, setReportFilterDataFim] = useState("")

  const currentYear = new Date().getFullYear()
  const COLORS = ['hsl(221, 83%, 53%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(280, 67%, 55%)', 'hsl(190, 80%, 45%)']

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      try {
        const [mc, cc, pc, sc, rd, cd, clientesRes, equipesRes, tiposRes] = await Promise.all([
          supabase.from('manutencoes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('manutencoes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'Em andamento'),
          supabase.from('cofre_senhas').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('manutencoes').select(`id,created_at,status,tempo_total,data_inicio,cliente_id,equipe_id,tipo_manutencao_id,clientes(nome_cliente),tipos_manutencao(nome_tipo_manutencao),equipes(nome_equipe)`).eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('manutencoes').select(`*,tipos_manutencao(nome_tipo_manutencao),equipes(nome_equipe),clientes(nome_cliente)`).eq('user_id', user.id),
          supabase.from('clientes').select('id, nome_cliente, logo_url').eq('user_id', user.id),
          supabase.from('equipes').select('id, nome_equipe').eq('user_id', user.id),
          supabase.from('tipos_manutencao').select('id, nome_tipo_manutencao').eq('user_id', user.id),
        ])

        const totalHoras = (cd.data || []).reduce((sum, m) => sum + (m.tempo_total || 0), 0)

        setStats({
          totalManutencoes: mc.count || 0,
          totalClientes: cc.count || 0,
          manutencoesPendentes: pc.count || 0,
          totalSenhas: sc.count || 0,
          totalHoras: Math.round(totalHoras / 60),
        })
        setRecentManutencoes(rd.data || [])
        setAllManutencoes(cd.data || [])
        setClientes(clientesRes.data || [])
        setEquipes(equipesRes.data || [])
        setTipos(tiposRes.data || [])
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  // Recompute charts when filters change
  useEffect(() => {
    const filtered = allManutencoes.filter(m => {
      if (filterCliente !== "todos" && m.cliente_id !== filterCliente) return false
      if (filterEquipe !== "todos" && m.equipe_id !== filterEquipe) return false
      if (filterTipo !== "todos" && m.tipo_manutencao_id !== filterTipo) return false
      if (filterDataInicio && m.data_inicio < filterDataInicio) return false
      if (filterDataFim && m.data_inicio > filterDataFim) return false
      return true
    })

    const hasFilters = filterCliente !== "todos" || filterEquipe !== "todos" || filterTipo !== "todos" || filterDataInicio || filterDataFim

    // Recompute stats from filtered data
    if (hasFilters) {
      const totalHoras = filtered.reduce((sum, m) => sum + (m.tempo_total || 0), 0)
      const uniqueClientes = new Set(filtered.map(m => m.cliente_id))
      const pendentes = filtered.filter(m => m.status === 'Em andamento')
      setStats(prev => ({
        ...prev,
        totalManutencoes: filtered.length,
        totalClientes: uniqueClientes.size,
        manutencoesPendentes: pendentes.length,
        totalHoras: Math.round(totalHoras / 60),
      }))
    } else {
      // Reset to original counts from DB
      const totalHoras = allManutencoes.reduce((sum, m) => sum + (m.tempo_total || 0), 0)
      setStats(prev => ({
        ...prev,
        totalManutencoes: allManutencoes.length,
        manutencoesPendentes: allManutencoes.filter(m => m.status === 'Em andamento').length,
        totalHoras: Math.round(totalHoras / 60),
      }))
    }

    // Update recent list from filtered
    setRecentManutencoes(
      [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
    )

    // Monthly chart
    const visaoMensal = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(currentYear, i).toLocaleDateString('pt-BR', { month: 'short' })
      const monthItems = filtered.filter(m => {
        const d = new Date(m.data_inicio)
        return d.getMonth() === i && d.getFullYear() === currentYear
      })
      return { name: month, manutenções: monthItems.length, horas: Math.round(monthItems.reduce((s, m) => s + (m.tempo_total || 0), 0) / 60) }
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
      teamMap[name] = (teamMap[name] || 0) + Math.round((m.tempo_total || 0) / 60)
    })
    setTeamData(Object.entries(teamMap).map(([name, value], i) => ({ name, horas: value, fill: COLORS[i % COLORS.length] })))

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
  }, [allManutencoes, filterCliente, filterEquipe, filterTipo, filterDataInicio, filterDataFim])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Finalizado': return 'bg-success/15 text-success border border-success/20'
      case 'Em andamento': return 'bg-warning/15 text-warning border border-warning/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

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
          <Button 
            variant="outline"
            className="rounded-xl h-11 px-4"
            onClick={() => setReportOpen(true)}
          >
            <FileDown className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Relatório</span>
          </Button>
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
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={filterCliente} onValueChange={setFilterCliente}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clientes</SelectItem>
                {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterEquipe} onValueChange={setFilterEquipe}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Equipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as equipes</SelectItem>
                {equipes.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_equipe}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome_tipo_manutencao}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard title="Manutenções" value={stats.totalManutencoes} description="Total cadastrado" icon={Wrench} gradient="primary" />
        <StatCard title="Clientes" value={stats.totalClientes} description="Ativos no sistema" icon={Users} gradient="success" />
        <StatCard title="Pendentes" value={stats.manutencoesPendentes} description="Em andamento" icon={Clock} gradient="warm" />
        <StatCard title="Horas" value={stats.totalHoras} description="Total acumulado" icon={Calendar} gradient="primary" />
        <StatCard title="Senhas" value={stats.totalSenhas} description="No cofre" icon={KeyRound} gradient="danger" />
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <ChartCard title="Visão Mensal" description={`Manutenções e horas — ${currentYear}`} icon={Calendar}>
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
                      <p className="font-medium text-sm truncate">{m.clientes?.nome_cliente || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.tipos_manutencao?.nome_tipo_manutencao || 'N/A'}</p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", getStatusColor(m.status))}>
                        {m.status}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(m.created_at).toLocaleDateString('pt-BR')}
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
        {/* Type Pie */}
        {tipoData.length > 0 && (
          <ChartCard title="Por Tipo" description="Distribuição de manutenções" icon={Wrench}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tipoData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                  {tipoData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Status Donut */}
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

        {/* Weekly Trend */}
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

      {/* Team Hours + Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {teamData.length > 0 && (
          <ChartCard title="Horas por Equipe" description="Distribuição de horas" icon={UserCog}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={teamData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="horas" radius={[0, 6, 6, 0]} name="Horas">
                  {teamData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
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

      <DashboardReportExport
        open={reportOpen}
        onOpenChange={setReportOpen}
        data={{ chartData, tipoData, statusData, teamData, weeklyData, stats }}
        filters={{
          clientes,
          equipes,
          tipos,
          filterCliente,
          filterEquipe,
          filterTipo,
          filterDataInicio: reportFilterDataInicio,
          filterDataFim: reportFilterDataFim,
          onFilterChange: (key, value) => {
            if (key === 'cliente') setFilterCliente(value)
            else if (key === 'equipe') setFilterEquipe(value)
            else if (key === 'tipo') setFilterTipo(value)
            else if (key === 'dataInicio') setReportFilterDataInicio(value)
            else if (key === 'dataFim') setReportFilterDataFim(value)
          }
        }}
        currentYear={currentYear}
      />
    </div>
  )
}
