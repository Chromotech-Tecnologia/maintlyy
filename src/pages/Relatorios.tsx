import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { FileBarChart, Download, CheckSquare, Filter } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SecurityTokenDialog } from "@/components/SecurityTokenDialog"

type ReportType = 'manutencoes_cliente' | 'manutencoes_tipo' | 'horas_resumo' | 'senhas_inventario'

interface ReportConfig {
  label: string
  description: string
  fields: { key: string; label: string; default: boolean }[]
}

const REPORT_CONFIGS: Record<ReportType, ReportConfig> = {
  manutencoes_cliente: {
    label: "Manutenções por Cliente",
    description: "Lista de manutenções agrupadas por cliente",
    fields: [
      { key: 'cliente', label: 'Cliente', default: true },
      { key: 'empresa', label: 'Empresa', default: true },
      { key: 'tipo', label: 'Tipo de Manutenção', default: true },
      { key: 'data_inicio', label: 'Data Início', default: true },
      { key: 'data_fim', label: 'Data Fim', default: true },
      { key: 'status', label: 'Status', default: true },
      { key: 'responsavel', label: 'Responsável', default: false },
      { key: 'solicitante', label: 'Solicitante', default: false },
      { key: 'equipe', label: 'Equipe', default: false },
      { key: 'tempo_total', label: 'Tempo Total (min)', default: true },
      { key: 'descricao', label: 'Descrição', default: false },
    ]
  },
  manutencoes_tipo: {
    label: "Manutenções por Tipo",
    description: "Relatório agrupado por tipo de manutenção",
    fields: [
      { key: 'tipo', label: 'Tipo de Manutenção', default: true },
      { key: 'cliente', label: 'Cliente', default: true },
      { key: 'data_inicio', label: 'Data Início', default: true },
      { key: 'status', label: 'Status', default: true },
      { key: 'responsavel', label: 'Responsável', default: false },
      { key: 'equipe', label: 'Equipe', default: false },
      { key: 'tempo_total', label: 'Tempo Total (min)', default: true },
    ]
  },
  horas_resumo: {
    label: "Resumo de Horas",
    description: "Total de horas por cliente/equipe/tipo",
    fields: [
      { key: 'cliente', label: 'Cliente', default: true },
      { key: 'equipe', label: 'Equipe', default: true },
      { key: 'tipo', label: 'Tipo', default: true },
      { key: 'total_horas', label: 'Total Horas', default: true },
      { key: 'total_manutencoes', label: 'Qtd Manutenções', default: true },
    ]
  },
  senhas_inventario: {
    label: "Inventário de Senhas",
    description: "Lista de acessos cadastrados no cofre",
    fields: [
      { key: 'nome_acesso', label: 'Nome do Acesso', default: true },
      { key: 'login', label: 'Login', default: true },
      { key: 'url', label: 'URL', default: true },
      { key: 'grupo', label: 'Grupo', default: true },
      { key: 'cliente', label: 'Cliente', default: true },
      { key: 'empresa', label: 'Empresa', default: false },
      { key: 'descricao', label: 'Descrição', default: false },
    ]
  },
}

export default function Relatorios() {
  const { user } = useAuth()
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
  const [filterDataInicio, setFilterDataInicio] = useState("")
  const [filterDataFim, setFilterDataFim] = useState("")
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (selectedReport) {
      const defaults = new Set(
        REPORT_CONFIGS[selectedReport].fields.filter(f => f.default).map(f => f.key)
      )
      setSelectedFields(defaults)
    }
  }, [selectedReport])

  const toggleField = (key: string) => {
    const next = new Set(selectedFields)
    next.has(key) ? next.delete(key) : next.add(key)
    setSelectedFields(next)
  }

  const exportReport = async (format: 'csv' | 'txt') => {
    if (!user || !selectedReport) return
    if (selectedFields.size === 0) { toast.error("Selecione pelo menos um campo"); return }

    setExporting(true)
    try {
      let content = ""
      const timestamp = new Date().toLocaleDateString('pt-BR')
      const config = REPORT_CONFIGS[selectedReport]

      if (selectedReport === 'senhas_inventario') {
        const { data, error } = await supabase.from('cofre_senhas')
          .select('nome_acesso, login, url_acesso, grupo, descricao, clientes(nome_cliente), empresas_terceiras(nome_empresa)')
          .order('nome_acesso')
        if (error) throw error

        const headers = config.fields.filter(f => selectedFields.has(f.key)).map(f => f.label)
        const rows = (data || []).map(s => {
          const row: string[] = []
          if (selectedFields.has('nome_acesso')) row.push(s.nome_acesso || '')
          if (selectedFields.has('login')) row.push(s.login || '')
          if (selectedFields.has('url')) row.push(s.url_acesso || '')
          if (selectedFields.has('grupo')) row.push(s.grupo || '')
          if (selectedFields.has('cliente')) row.push((s as any).clientes?.nome_cliente || '')
          if (selectedFields.has('empresa')) row.push((s as any).empresas_terceiras?.nome_empresa || '')
          if (selectedFields.has('descricao')) row.push(s.descricao || '')
          return row
        })

        if (format === 'csv') {
          content = headers.join(',') + '\n' + rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')).join('\n')
        } else {
          content = `=== ${config.label} === ${timestamp}\n\n`
          rows.forEach(r => { content += r.join(' | ') + '\n' })
        }
      } else {
        let query = supabase.from('manutencoes')
          .select('*, clientes(nome_cliente), tipos_manutencao(nome_tipo_manutencao), equipes(nome_equipe), empresas_terceiras(nome_empresa)')
          .eq('user_id', user.id)
          .order('data_inicio', { ascending: false })

        if (filterDataInicio) query = query.gte('data_inicio', filterDataInicio)
        if (filterDataFim) query = query.lte('data_inicio', filterDataFim)

        const { data, error } = await query
        if (error) throw error

        if (selectedReport === 'horas_resumo') {
          // Aggregate data
          const aggMap: Record<string, { horas: number; count: number; cliente: string; equipe: string; tipo: string }> = {}
          ;(data || []).forEach(m => {
            const key = `${(m as any).clientes?.nome_cliente || 'N/A'}|${(m as any).equipes?.nome_equipe || 'N/A'}|${(m as any).tipos_manutencao?.nome_tipo_manutencao || 'N/A'}`
            if (!aggMap[key]) aggMap[key] = { horas: 0, count: 0, cliente: (m as any).clientes?.nome_cliente || '', equipe: (m as any).equipes?.nome_equipe || '', tipo: (m as any).tipos_manutencao?.nome_tipo_manutencao || '' }
            aggMap[key].horas += Math.round((m.tempo_total || 0) / 60)
            aggMap[key].count += 1
          })

          const headers = config.fields.filter(f => selectedFields.has(f.key)).map(f => f.label)
          const rows = Object.values(aggMap).map(a => {
            const row: string[] = []
            if (selectedFields.has('cliente')) row.push(a.cliente)
            if (selectedFields.has('equipe')) row.push(a.equipe)
            if (selectedFields.has('tipo')) row.push(a.tipo)
            if (selectedFields.has('total_horas')) row.push(String(a.horas))
            if (selectedFields.has('total_manutencoes')) row.push(String(a.count))
            return row
          })

          if (format === 'csv') {
            content = headers.join(',') + '\n' + rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
          } else {
            content = `=== ${config.label} === ${timestamp}\n\n`
            content += headers.join(' | ') + '\n' + '-'.repeat(60) + '\n'
            rows.forEach(r => { content += r.join(' | ') + '\n' })
          }
        } else {
          const headers = config.fields.filter(f => selectedFields.has(f.key)).map(f => f.label)
          const rows = (data || []).map(m => {
            const row: string[] = []
            if (selectedFields.has('cliente')) row.push((m as any).clientes?.nome_cliente || '')
            if (selectedFields.has('empresa')) row.push((m as any).empresas_terceiras?.nome_empresa || '')
            if (selectedFields.has('tipo')) row.push((m as any).tipos_manutencao?.nome_tipo_manutencao || '')
            if (selectedFields.has('data_inicio')) row.push(m.data_inicio ? new Date(m.data_inicio).toLocaleDateString('pt-BR') : '')
            if (selectedFields.has('data_fim')) row.push(m.data_fim ? new Date(m.data_fim).toLocaleDateString('pt-BR') : '')
            if (selectedFields.has('status')) row.push(m.status || '')
            if (selectedFields.has('responsavel')) row.push(m.responsavel || '')
            if (selectedFields.has('solicitante')) row.push(m.solicitante || '')
            if (selectedFields.has('equipe')) row.push((m as any).equipes?.nome_equipe || '')
            if (selectedFields.has('tempo_total')) row.push(String(m.tempo_total || 0))
            if (selectedFields.has('descricao')) row.push(m.descricao || '')
            return row
          })

          if (format === 'csv') {
            content = headers.join(',') + '\n' + rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')).join('\n')
          } else {
            content = `=== ${config.label} === ${timestamp}\n\n`
            content += headers.join(' | ') + '\n' + '-'.repeat(80) + '\n'
            rows.forEach(r => { content += r.join(' | ') + '\n' })
          }
        }
      }

      content += `\n\nGerado por Maintly - https://maintly.chromotech.com.br/`

      const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio_${selectedReport}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Relatório exportado com sucesso!")
    } catch (error) {
      console.error('Erro ao exportar:', error)
      toast.error("Erro ao exportar relatório")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-full overflow-x-hidden">
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Relatórios</h1>
          <p className="page-subtitle">Exporte relatórios personalizados do sistema</p>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.entries(REPORT_CONFIGS) as [ReportType, ReportConfig][]).map(([key, config]) => (
          <Card
            key={key}
            className={`glass-card cursor-pointer transition-all ${selectedReport === key ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}
            onClick={() => setSelectedReport(key)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileBarChart className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-sm font-semibold">{config.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">{config.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Config Section */}
      {selectedReport && (
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Configurar: {REPORT_CONFIGS[selectedReport].label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fields */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Campos do relatório:</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {REPORT_CONFIGS[selectedReport].fields.map(field => (
                  <label key={field.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox
                      checked={selectedFields.has(field.key)}
                      onCheckedChange={() => toggleField(field.key)}
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Date Filters (for non-password reports) */}
            {selectedReport !== 'senhas_inventario' && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Filtrar por período:</Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                  <div>
                    <Label className="text-xs text-muted-foreground">Data início</Label>
                    <Input type="date" value={filterDataInicio} onChange={e => setFilterDataInicio(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data fim</Label>
                    <Input type="date" value={filterDataFim} onChange={e => setFilterDataFim(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Export Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={() => exportReport('csv')} disabled={exporting || selectedFields.size === 0} className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 mr-2" />
                {exporting ? "Exportando..." : "Exportar CSV"}
              </Button>
              <Button onClick={() => exportReport('txt')} variant="outline" disabled={exporting || selectedFields.size === 0} className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 mr-2" />
                {exporting ? "Exportando..." : "Exportar TXT"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
