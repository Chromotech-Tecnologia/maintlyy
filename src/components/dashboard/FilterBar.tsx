import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays, Filter, X } from "lucide-react"
import { useState } from "react"

interface FilterBarProps {
  clientes: Array<{ id: string; nome_cliente: string }>
  empresas: Array<{ id: string; nome_empresa: string }>
  equipes: Array<{ id: string; nome_equipe: string }>
  tipos: Array<{ id: string; nome_tipo_manutencao: string }>
  filters: {
    cliente_id?: string
    empresa_terceira_id?: string
    equipe_id?: string
    tipo_manutencao_id?: string
    data_inicio?: string
    data_fim?: string
  }
  onFiltersChange: (filters: any) => void
}

export function FilterBar({ 
  clientes, 
  empresas, 
  equipes, 
  tipos, 
  filters, 
  onFiltersChange 
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === "all" ? undefined : value
    })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters = Object.values(filters).some(value => value)

  return (
    <Card className="border-0 shadow-elegant">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Label className="font-medium">Filtros</Label>
            {hasActiveFilters && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                Ativos
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Recolher" : "Expandir"}
            </Button>
          </div>
        </div>

        <div className={`grid gap-4 transition-all duration-300 ${
          isExpanded ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        }`}>
          <div className="space-y-2">
            <Label className="text-xs">Cliente</Label>
            <Select
              value={filters.cliente_id || "all"}
              onValueChange={(value) => handleFilterChange("cliente_id", value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome_cliente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Empresa</Label>
            <Select
              value={filters.empresa_terceira_id || "all"}
              onValueChange={(value) => handleFilterChange("empresa_terceira_id", value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nome_empresa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Equipe</Label>
            <Select
              value={filters.equipe_id || "all"}
              onValueChange={(value) => handleFilterChange("equipe_id", value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as equipes</SelectItem>
                {equipes.map((equipe) => (
                  <SelectItem key={equipe.id} value={equipe.id}>
                    {equipe.nome_equipe}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Tipo</Label>
            <Select
              value={filters.tipo_manutencao_id || "all"}
              onValueChange={(value) => handleFilterChange("tipo_manutencao_id", value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {tipos.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.id}>
                    {tipo.nome_tipo_manutencao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isExpanded && (
            <>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Data Início
                </Label>
                <Input
                  type="date"
                  value={filters.data_inicio || ""}
                  onChange={(e) => handleFilterChange("data_inicio", e.target.value)}
                  className="h-8"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Data Fim
                </Label>
                <Input
                  type="date"
                  value={filters.data_fim || ""}
                  onChange={(e) => handleFilterChange("data_fim", e.target.value)}
                  className="h-8"
                />
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}