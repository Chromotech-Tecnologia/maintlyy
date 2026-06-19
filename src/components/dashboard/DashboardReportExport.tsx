import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/multi-select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { FileDown, Loader2, History, Image as ImageIcon, Link2 } from "lucide-react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { ReportHistory } from "./ReportHistory"
import { ReportContent, buildAnalyticalRows, type ReportPayload } from "./ReportContent"
import { formatLocalDateBR } from "@/lib/dateUtils"

interface ReportData {
  chartData: any[]
  tipoData: any[]
  statusData: any[]
  teamData: any[]
  weeklyData: any[]
  stats: {
    totalManutencoes: number
    totalClientes: number
    manutencoesPendentes: number
    totalHoras: number
    totalSenhas: number
  }
}

interface ReportFilters {
  clientes: { id: string; nome_cliente: string; logo_url?: string | null; empresa_terceira_id?: string }[]
  equipes: { id: string; nome_equipe: string }[]
  tipos: { id: string; nome_tipo_manutencao: string }[]
  empresas: { id: string; nome_empresa: string }[]
  filterCliente: string[]
  filterEquipe: string[]
  filterTipo: string[]
  filterEmpresa: string[]
  filterStatus: string[]
  filterDataInicio: string
  filterDataFim: string
  onFilterChange: (key: string, value: string | string[]) => void
}

interface DashboardReportExportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: ReportData
  filters: ReportFilters
  allManutencoes: any[]
  currentYear: number
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export function DashboardReportExport({ open, onOpenChange, data, filters, allManutencoes, currentYear }: DashboardReportExportProps) {
  const reportRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const [exporting, setExporting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  

  // Separate date filters for analytical
  const [analyticDataInicio, setAnalyticDataInicio] = useState("")
  const [analyticDataFim, setAnalyticDataFim] = useState("")

  const selectedCliente = filters.filterCliente.length === 1
    ? filters.clientes.find(c => c.id === filters.filterCliente[0])
    : undefined

  // Empresa filter logic — based on currently selected clients
  const relatedEmpresaIds = filters.filterCliente.length > 0
    ? Array.from(new Set(
        filters.clientes
          .filter(c => filters.filterCliente.includes(c.id))
          .map(c => c.empresa_terceira_id)
          .filter(Boolean) as string[]
      ))
    : null
  const empresaOptions = relatedEmpresaIds
    ? filters.empresas.filter(e => relatedEmpresaIds.includes(e.id))
    : filters.empresas
  const isEmpresaLocked = !!(relatedEmpresaIds && relatedEmpresaIds.length === 1)

  // Build empresa names for header
  const empresaHeaderLabel = () => {
    if (filters.filterEmpresa.length === 0) {
      return empresaOptions.map(e => e.nome_empresa).join(", ") || "Todas as empresas"
    }
    return filters.empresas
      .filter(e => filters.filterEmpresa.includes(e.id))
      .map(e => e.nome_empresa)
      .join(", ") || "Empresa"
  }

  // Build filtered analytical data from allManutencoes
  const getAnalyticalData = useCallback(() => {
    return allManutencoes.filter(m => {
      if (filters.filterCliente.length > 0 && !filters.filterCliente.includes(m.cliente_id)) return false
      if (filters.filterEquipe.length > 0 && !filters.filterEquipe.includes(m.equipe_id)) return false
      if (filters.filterTipo.length > 0 && !filters.filterTipo.includes(m.tipo_manutencao_id)) return false
      if (filters.filterEmpresa.length > 0 && !filters.filterEmpresa.includes(m.empresa_terceira_id)) return false
      if (filters.filterStatus.length > 0 && !filters.filterStatus.includes(m.status || 'Em andamento')) return false
      // Use analytical date filters
      if (analyticDataInicio && m.data_inicio < analyticDataInicio) return false
      if (analyticDataFim && m.data_inicio > analyticDataFim) return false
      return true
    }).sort((a: any, b: any) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
  }, [allManutencoes, filters, analyticDataInicio, analyticDataFim])

  const periodoLabel = () => {
    if (filters.filterDataInicio && filters.filterDataFim) {
      return `${formatLocalDateBR(filters.filterDataInicio)} a ${formatLocalDateBR(filters.filterDataFim)}`
    }
    return `Ano ${currentYear}`
  }

  const analyticalRaw = getAnalyticalData()
  const analyticalRows = buildAnalyticalRows(analyticalRaw)
  // Compute KPIs from analytical data so cards and table always match
  const analyticTotalMin = analyticalRows.reduce((s, r) => s + r.tempoMin, 0)
  const analyticPendentes = analyticalRaw.filter((m: any) => (m.status || 'Em andamento') === 'Em andamento').length
  const analyticClientes = new Set(analyticalRaw.map((m: any) => m.cliente_id)).size

  const payload: ReportPayload = {
    title: selectedCliente ? selectedCliente.nome_cliente : "Relatório Geral",
    empresaLabel: empresaHeaderLabel(),
    periodoLabel: periodoLabel(),
    clienteLogoUrl: selectedCliente?.logo_url || null,
    generatedAt: new Date().toLocaleString('pt-BR'),
    stats: {
      totalManutencoes: analyticalRows.length,
      manutencoesPendentes: analyticPendentes,
      totalHoras: analyticTotalMin,
      totalClientes: analyticClientes,
    },
    chartData: data.chartData,
    weeklyData: data.weeklyData,
    tipoData: data.tipoData,
    analyticalData: analyticalRows,
    analyticPeriodo: { inicio: analyticDataInicio, fim: analyticDataFim },
    showClienteColumn: filters.filterCliente.length !== 1,
  }

  const saveReport = useCallback(async (format: 'pdf' | 'png' | 'link') => {
    if (!user) return null
    const filtersJson = {
      cliente: filters.filterCliente,
      equipe: filters.filterEquipe,
      tipo: filters.filterTipo,
      empresa: filters.filterEmpresa,
      status: filters.filterStatus,
      dataInicio: filters.filterDataInicio,
      dataFim: filters.filterDataFim,
    }
    const reportHtml = reportRef.current?.innerHTML || ''
    const { data: inserted, error } = await supabase
      .from('generated_reports')
      .insert({
        user_id: user.id,
        title: payload.title,
        filters: filtersJson,
        report_html: reportHtml,
        report_data: payload as any,
        format,
      } as any)
      .select('public_id')
      .single()
    if (error) throw error
    return inserted as { public_id: string }
  }, [user, filters, payload])

  const handleExportPdf = useCallback(async () => {
    if (!reportRef.current || !user) return
    setExporting(true)
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
      await saveReport('pdf')
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      if (pdfHeight <= pdf.internal.pageSize.getHeight()) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      } else {
        let position = 0
        const pageHeight = pdf.internal.pageSize.getHeight()
        while (position < pdfHeight) {
          if (position > 0) pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, pdfHeight)
          position += pageHeight
        }
      }
      pdf.save(`relatorio_dashboard_${new Date().toISOString().split('T')[0]}.pdf`)
      toast({ title: "PDF baixado!", description: "Relatório salvo no histórico." })
    } catch (e) {
      console.error(e)
      toast({ title: "Erro", description: "Falha ao gerar PDF.", variant: "destructive" })
    } finally { setExporting(false) }
  }, [user, saveReport, toast])

  const handleExportPng = useCallback(async () => {
    if (!reportRef.current || !user) return
    setExporting(true)
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
      await saveReport('png')
      const link = document.createElement('a')
      link.download = `relatorio_dashboard_${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast({ title: "Imagem baixada!", description: "Relatório salvo no histórico." })
    } catch (e) {
      console.error(e)
      toast({ title: "Erro", description: "Falha ao gerar imagem.", variant: "destructive" })
    } finally { setExporting(false) }
  }, [user, saveReport, toast])

  const handleCopyPublicLink = useCallback(async () => {
    if (!user) return
    setExporting(true)
    try {
      const inserted = await saveReport('link')
      if (!inserted?.public_id) throw new Error("sem public_id")
      const url = `${window.location.origin}/relatorio-publico/${inserted.public_id}`
      await navigator.clipboard.writeText(url)
      toast({ title: "Link público copiado!", description: url })
    } catch (e) {
      console.error(e)
      toast({ title: "Erro", description: "Falha ao gerar link público.", variant: "destructive" })
    } finally { setExporting(false) }
  }, [user, saveReport, toast])

  if (showHistory) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico de Relatórios
            </DialogTitle>
          </DialogHeader>
          <Button variant="ghost" size="sm" className="w-fit mb-2" onClick={() => setShowHistory(false)}>
            ← Voltar para geração
          </Button>
          <ReportHistory />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Exportar Relatório de Manutenção
          </DialogTitle>
        </DialogHeader>

        {/* Export Controls */}
        <div className="space-y-4 pb-4 border-b border-border">
          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cliente</Label>
              <MultiSelect
                options={filters.clientes.map(c => ({ value: c.id, label: c.nome_cliente }))}
                value={filters.filterCliente}
                onChange={v => {
                  filters.onFilterChange('cliente', v)
                  const ids = Array.from(new Set(
                    filters.clientes
                      .filter(c => v.includes(c.id))
                      .map(c => c.empresa_terceira_id)
                      .filter(Boolean) as string[]
                  ))
                  if (v.length > 0 && ids.length === 1) {
                    filters.onFilterChange('empresa', ids)
                  } else {
                    filters.onFilterChange('empresa', [])
                  }
                }}
                allLabel="Todos os clientes"
                placeholder="Cliente"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Empresa</Label>
              <MultiSelect
                options={empresaOptions.map(e => ({ value: e.id, label: e.nome_empresa }))}
                value={filters.filterEmpresa}
                onChange={v => filters.onFilterChange('empresa', v)}
                allLabel={relatedEmpresaIds ? "Todas as empresas relacionadas" : "Todas as empresas"}
                placeholder="Empresa"
                disabled={isEmpresaLocked}
                triggerClassName={isEmpresaLocked ? 'opacity-60' : ''}
              />
              {isEmpresaLocked && <p className="text-[10px] text-muted-foreground">Selecionada pelo cliente</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <MultiSelect
                options={[
                  { value: 'Em andamento', label: 'Em andamento' },
                  { value: 'Finalizado', label: 'Finalizado' },
                  { value: 'Cancelado', label: 'Cancelado' },
                ]}
                value={filters.filterStatus}
                onChange={v => filters.onFilterChange('status', v)}
                allLabel="Todos"
                placeholder="Status"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <MultiSelect
                options={filters.tipos.map(t => ({ value: t.id, label: t.nome_tipo_manutencao }))}
                value={filters.filterTipo}
                onChange={v => filters.onFilterChange('tipo', v)}
                allLabel="Todos"
                placeholder="Tipo"
              />
            </div>
          </div>

          {/* Date filters for charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">📊 Gráficos — Início</Label>
              <Input type="date" className="h-9" value={filters.filterDataInicio} onChange={e => filters.onFilterChange('dataInicio', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">📊 Gráficos — Fim</Label>
              <Input type="date" className="h-9" value={filters.filterDataFim} onChange={e => filters.onFilterChange('dataFim', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">📋 Analítico — Início</Label>
              <Input type="date" className="h-9" value={analyticDataInicio} onChange={e => setAnalyticDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">📋 Analítico — Fim</Label>
              <Input type="date" className="h-9" value={analyticDataFim} onChange={e => setAnalyticDataFim(e.target.value)} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleExportPdf} disabled={exporting} className="h-9">
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              Baixar PDF
            </Button>
            <Button onClick={handleExportPng} disabled={exporting} variant="secondary" className="h-9">
              <ImageIcon className="h-4 w-4 mr-2" />
              Baixar Imagem
            </Button>
            <Button onClick={handleCopyPublicLink} disabled={exporting} variant="outline" className="h-9">
              <Link2 className="h-4 w-4 mr-2" />
              Copiar Link Público
            </Button>
            <Button variant="ghost" size="sm" className="h-9 ml-auto" onClick={() => setShowHistory(true)}>
              <History className="h-4 w-4 mr-2" /> Histórico
            </Button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="overflow-x-auto">
          <ReportContent ref={reportRef} payload={payload} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

