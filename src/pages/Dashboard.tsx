import { useState, useEffect } from "react"
import { StatCard } from "@/components/dashboard/StatCard"
import { ChartCard } from "@/components/dashboard/ChartCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { 
  Clock, Users, Wrench, TrendingUp, Plus, Calendar, KeyRound, ArrowRight
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
}

interface ManutencaoRecente {
  id: string
  created_at: string
  status: string
  clientes?: { nome_cliente: string }
  tipos_manutencao?: { nome_tipo_manutencao: string }
  tempo_total?: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalManutencoes: 0, totalClientes: 0, manutencoesPendentes: 0, totalSenhas: 0
  })
  const [recentManutencoes, setRecentManutencoes] = useState<ManutencaoRecente[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [tipoData, setTipoData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      try {
        const [mc, cc, pc, sc, rd, cd] = await Promise.all([
          supabase.from('manutencoes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('manutencoes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'Em andamento'),
          supabase.from('cofre_senhas').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('manutencoes').select(`id,created_at,status,tempo_total,clientes(nome_cliente),tipos_manutencao(nome_tipo_manutencao)`).eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('manutencoes').select(`*,tipos_manutencao(nome_tipo_manutencao)`).eq('user_id', user.id),
        ])

        setStats({
          totalManutencoes: mc.count || 0,
          totalClientes: cc.count || 0,
          manutencoesPendentes: pc.count || 0,
          totalSenhas: sc.count || 0,
        })
        setRecentManutencoes(rd.data || [])

        // Monthly chart
        const manutencoes = cd.data || []
        const visaoMensal = Array.from({ length: 12 }, (_, i) => {
          const month = new Date(2024, i).toLocaleDateString('pt-BR', { month: 'short' })
          const count = manutencoes.filter(m => new Date(m.data_inicio).getMonth() === i).length
          return { name: month, value: count }
        })
        setChartData(visaoMensal)

        // Type breakdown
        const tipoMap: Record<string, number> = {}
        manutencoes.forEach(m => {
          const name = m.tipos_manutencao?.nome_tipo_manutencao || 'Sem tipo'
          tipoMap[name] = (tipoMap[name] || 0) + 1
        })
        const COLORS = ['hsl(221, 83%, 53%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(280, 67%, 55%)']
        setTipoData(Object.entries(tipoMap).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] })))
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

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
          <p className="page-subtitle">Visão geral do sistema</p>
        </div>
        <Button 
          className="gradient-primary border-0 shadow-lg shadow-primary/25 rounded-xl h-11 px-5"
          onClick={() => navigate('/manutencoes')}
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Nova Manutenção</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Manutenções" value={stats.totalManutencoes} description="Total cadastrado" icon={Wrench} gradient="primary" />
        <StatCard title="Clientes" value={stats.totalClientes} description="Ativos no sistema" icon={Users} gradient="success" />
        <StatCard title="Pendentes" value={stats.manutencoesPendentes} description="Em andamento" icon={Clock} gradient="warm" />
        <StatCard title="Senhas" value={stats.totalSenhas} description="No cofre" icon={KeyRound} gradient="danger" />
      </div>

      {/* Charts + Recent */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Monthly chart */}
        <ChartCard title="Visão Mensal" description="Manutenções por mês" icon={Calendar} >
          <div className="lg:col-span-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Manutenções" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Recent Maintenances */}
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

      {/* Type breakdown + Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {tipoData.length > 0 && (
          <ChartCard title="Por Tipo" description="Distribuição de manutenções" icon={Wrench}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tipoData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {tipoData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
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
                    "flex flex-col items-center gap-2 p-4 rounded-xl text-white text-xs font-medium",
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
    </div>
  )
}
