import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Building2, MapPin, Phone, Mail } from "lucide-react"

export default function Clientes() {
  const clientes = [
    {
      id: 1,
      nome: "Empresa ABC Ltda",
      cnpj: "12.345.678/0001-90",
      endereco: "Rua das Flores, 123 - São Paulo/SP",
      telefone: "(11) 98765-4321",
      email: "contato@empresaabc.com.br",
      status: "Ativo",
      pacote: {
        valor_mensal: 2500,
        valor_por_hora: 80,
        limite_horas: 30
      }
    },
    {
      id: 2,
      nome: "Tech Solutions",
      cnpj: "98.765.432/0001-10",
      endereco: "Av. Paulista, 1000 - São Paulo/SP", 
      telefone: "(11) 91234-5678",
      email: "admin@techsolutions.com",
      status: "Ativo",
      pacote: {
        valor_mensal: 3500,
        valor_por_hora: 100,
        limite_horas: 35
      }
    },
    {
      id: 3,
      nome: "Digital Corp",
      cnpj: "11.222.333/0001-44",
      endereco: "Rua da Tecnologia, 456 - Rio de Janeiro/RJ",
      telefone: "(21) 99876-5432",
      email: "suporte@digitalcorp.com.br",
      status: "Inativo"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e contratos de manutenção
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Clients Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {clientes.map((cliente) => (
          <Card key={cliente.id} className="border-0 shadow-elegant hover:shadow-glow transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{cliente.nome}</CardTitle>
                    <p className="text-sm text-muted-foreground">{cliente.cnpj}</p>
                  </div>
                </div>
                <Badge 
                  variant={cliente.status === 'Ativo' ? 'default' : 'secondary'}
                  className={cliente.status === 'Ativo' ? 'bg-success text-success-foreground' : ''}
                >
                  {cliente.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{cliente.endereco}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{cliente.telefone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{cliente.email}</span>
                </div>
              </div>

              {/* Package Info */}
              {cliente.pacote && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Pacote de Manutenção</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Valor Mensal:</span>
                      <p className="font-medium">R$ {cliente.pacote.valor_mensal.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Por Hora:</span>
                      <p className="font-medium">R$ {cliente.pacote.valor_por_hora}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Limite Mensal:</span>
                      <p className="font-medium">{cliente.pacote.limite_horas}h</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Editar
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}