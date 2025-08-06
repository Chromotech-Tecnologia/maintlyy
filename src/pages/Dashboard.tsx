import { useState, useEffect } from "react"
import { StatCard } from "@/components/dashboard/StatCard"
import { ChartCard } from "@/components/dashboard/ChartCard"
import { FilterBar } from "@/components/dashboard/FilterBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"
import { 
  Clock, 
  Users, 
  Wrench, 
  TrendingUp, 
  Plus,
  Calendar,
  DollarSign,
  KeyRound,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"

interface DashboardStats {
  totalManutencoes: number
  totalClientes: number
  manutencoesPendentes: number
  totalSenhas: number
}

interface ChartData {
  visaoMensal: Array<{ name: string; value: number }>
  tipoManutencao: Array<{ name: string; value: number; color: string }>
  totalHoras: Array<{ name: string; horas: number }>
  valorCliente: Array<{ name: string; valor: number }>
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
    totalManutencoes: 0,
    totalClientes: 0,
    manutencoesPendentes: 0,
    totalSenhas: 0
  })
  const [recentManutencoes, setRecentManutencoes] = useState<ManutencaoRecente[]>([])
  const [chartData, setChartData] = useState<ChartData>({
    visaoMensal: [],
    tipoManutencao: [],
    totalHoras: [],
    valorCliente: []
  })
  const [filters, setFilters] = useState<any>({})
  const [dropdownData, setDropdownData] = useState<any>({
    clientes: [],
    empresas: [],
    equipes: [],
    tipos: []
  })
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      const [
        manutencaoCount,
        clienteCount,
        pendentesCount,
        senhaCount,
        recentData
      ] = await Promise.all([
        supabase
          .from('manutencoes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('clientes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('manutencoes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'Em andamento'),
        supabase
          .from('cofre_senhas')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('manutencoes')
          .select(`
            id,
            created_at,
            status,
            tempo_total,
            clientes(nome_cliente),
            tipos_manutencao(nome_tipo_manutencao)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3)
      ])

      setStats({
        totalManutencoes: manutencaoCount.count || 0,
        totalClientes: clienteCount.count || 0,
        manutencoesPendentes: pendentesCount.count || 0,
        totalSenhas: senhaCount.count || 0
      })

      setRecentManutencoes(recentData.data || [])

      // Buscar dados para gráficos
      const [dropdownResult, chartResult] = await Promise.all([
        Promise.all([
          supabase.from('clientes').select('id, nome_cliente').eq('user_id', user.id),
          supabase.from('empresas_terceiras').select('id, nome_empresa').eq('user_id', user.id),
          supabase.from('equipes').select('id, nome_equipe').eq('user_id', user.id),
          supabase.from('tipos_manutencao').select('id, nome_tipo_manutencao').eq('user_id', user.id)
        ]),
        supabase
          .from('manutencoes')
          .select(`
            *,
            clientes(nome_cliente),
            tipos_manutencao(nome_tipo_manutencao)
          `)
          .eq('user_id', user.id)
      ])

      setDropdownData({
        clientes: dropdownResult[0].data || [],
        empresas: dropdownResult[1].data || [],
        equipes: dropdownResult[2].data || [],
        tipos: dropdownResult[3].data || []
      })

      // Processar dados para gráficos
      const manutencoes = chartResult.data || []
      
      const visaoMensal = Array.from({ length: 12 }, (_, i) => {
        const month = new Date(2024, i).toLocaleDateString('pt-BR', { month: 'short' })
        const count = manutencoes.filter(m => new Date(m.data_inicio).getMonth() === i).length
        return { name: month, value: count }
      })

      const tipoData = dropdownData.tipos.map((tipo: any, index: number) => ({
        name: tipo.nome_tipo_manutencao,
        value: manutencoes.filter(m => m.tipo_manutencao_id === tipo.id).length,
        color: `hsl(${index * 60}, 70%, 50%)`
      }))

      setChartData({
        visaoMensal,
        tipoManutencao: tipoData,
        totalHoras: [],
        valorCliente: []
      })

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Finalizado':
        return 'bg-success/20 text-success'
      case 'Em andamento':
        return 'bg-warning/20 text-warning'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de manutenções
          </p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90"
          onClick={() => navigate('/manutencoes')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Manutenção
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Manutenções"
          value={stats.totalManutencoes.toString()}
          description="Manutenções cadastradas"
          icon={Wrench}
        />
        <StatCard
          title="Clientes Ativos"
          value={stats.totalClientes.toString()}
          description="Clientes cadastrados"
          icon={Users}
        />
        <StatCard
          title="Manutenções Pendentes"
          value={stats.manutencoesPendentes.toString()}
          description="Aguardando finalização"
          icon={Clock}
        />
        <StatCard
          title="Senhas no Cofre"
          value={stats.totalSenhas.toString()}
          description="Senhas armazenadas"
          icon={KeyRound}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Maintenances */}
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Manutenções Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentManutencoes.length > 0 ? (
              <div className="space-y-4">
                {recentManutencoes.map((manutencao) => (
                  <div key={manutencao.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">
                        {manutencao.clientes?.nome_cliente || 'Cliente não informado'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {manutencao.tipos_manutencao?.nome_tipo_manutencao || 'Tipo não informado'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(manutencao.status)}`}>
                        {manutencao.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(manutencao.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma manutenção cadastrada ainda
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/manutencoes')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Registrar Nova Manutenção
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/clientes')}
              >
                <Users className="mr-2 h-4 w-4" />
                Gerenciar Clientes
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/cofre')}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Acessar Cofre de Senhas
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/equipes')}
              >
                <Users className="mr-2 h-4 w-4" />
                Gerenciar Equipes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}