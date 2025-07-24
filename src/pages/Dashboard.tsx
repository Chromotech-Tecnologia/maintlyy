import { StatCard } from "@/components/dashboard/StatCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Clock, 
  Users, 
  Wrench, 
  TrendingUp, 
  Plus,
  Calendar,
  DollarSign
} from "lucide-react"

export default function Dashboard() {
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
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Nova Manutenção
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Horas Trabalhadas (Mês)"
          value="124.5h"
          description="Total de horas no mês atual"
          icon={Clock}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Clientes Ativos"
          value="18"
          description="Clientes com contratos vigentes"
          icon={Users}
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard
          title="Manutenções Pendentes"
          value="7"
          description="Aguardando finalização"
          icon={Wrench}
        />
        <StatCard
          title="Receita Mensal"
          value="R$ 15.240"
          description="Valor faturado no mês"
          icon={DollarSign}
          trend={{ value: 8, isPositive: true }}
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
            <div className="space-y-4">
              {[
                {
                  client: "Empresa ABC Ltda",
                  type: "Manutenção Preventiva",
                  status: "Em Andamento",
                  hours: "2.5h"
                },
                {
                  client: "Tech Solutions",
                  type: "Suporte Técnico",
                  status: "Finalizado",
                  hours: "1.5h"
                },
                {
                  client: "Digital Corp",
                  type: "Instalação",
                  status: "Pendente",
                  hours: "4.0h"
                }
              ].map((maintenance, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{maintenance.client}</p>
                    <p className="text-xs text-muted-foreground">{maintenance.type}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      maintenance.status === 'Finalizado' 
                        ? 'bg-success/20 text-success'
                        : maintenance.status === 'Em Andamento'
                        ? 'bg-warning/20 text-warning'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {maintenance.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">{maintenance.hours}</p>
                  </div>
                </div>
              ))}
            </div>
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
                onClick={() => window.location.href = '/manutencoes'}
              >
                <Plus className="mr-2 h-4 w-4" />
                Registrar Nova Manutenção
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.href = '/clientes'}
              >
                <Users className="mr-2 h-4 w-4" />
                Gerenciar Clientes
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.location.href = '/cofre'}
              >
                <Clock className="mr-2 h-4 w-4" />
                Acessar Cofre de Senhas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}