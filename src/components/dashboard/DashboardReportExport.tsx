import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  filterCliente: string
  filterEquipe: string
  filterTipo: string
  filterEmpresa: string
  filterStatus: string
  filterDataInicio: string
  filterDataFim: string
  onFilterChange: (key: string, value: string) => void
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

  const selectedCliente = filters.clientes.find(c => c.id === filters.filterCliente)

  // Build empresa names for header
  const empresaHeaderLabel = () => {
    if (filters.filterEmpresa === "todos") {
      return filters.empresas.map(e => e.nome_empresa).join(", ") || "Todas as empresas"
    }
    const found = filters.empresas.find(e => e.id === filters.filterEmpresa)
    return found?.nome_empresa || "Empresa"
  }

  // Build filtered analytical data from allManutencoes
  const getAnalyticalData = useCallback(() => {
    return allManutencoes.filter(m => {
      if (filters.filterCliente !== "todos" && m.cliente_id !== filters.filterCliente) return false
      if (filters.filterEquipe !== "todos" && m.equipe_id !== filters.filterEquipe) return false
      if (filters.filterTipo !== "todos" && m.tipo_manutencao_id !== filters.filterTipo) return false
      if (filters.filterEmpresa !== "todos" && m.empresa_terceira_id !== filters.filterEmpresa) return false
      if (filters.filterStatus !== "todos" && m.status !== filters.filterStatus) return false
      // Use analytical date filters
      if (analyticDataInicio && m.data_inicio < analyticDataInicio) return false
      if (analyticDataFim && m.data_inicio > analyticDataFim) return false
      return true
    }).sort((a: any, b: any) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
  }, [allManutencoes, filters, analyticDataInicio, analyticDataFim])

  const periodoLabel = () => {
    if (filters.filterDataInicio && filters.filterDataFim) {
      return `${new Date(filters.filterDataInicio).toLocaleDateString('pt-BR')} a ${new Date(filters.filterDataFim).toLocaleDateString('pt-BR')}`
    }
    return `Ano ${currentYear}`
  }

  const analyticalRaw = getAnalyticalData()

  const payload: ReportPayload = {
    title: selectedCliente ? selectedCliente.nome_cliente : "Relatório Geral",
    empresaLabel: empresaHeaderLabel(),
    periodoLabel: periodoLabel(),
    clienteLogoUrl: selectedCliente?.logo_url || null,
    generatedAt: new Date().toLocaleString('pt-BR'),
    stats: {
      totalManutencoes: data.stats.totalManutencoes,
      manutencoesPendentes: data.stats.manutencoesPendentes,
      totalHoras: data.stats.totalHoras,
      totalClientes: data.stats.totalClientes,
    },
    chartData: data.chartData,
    weeklyData: data.weeklyData,
    tipoData: data.tipoData,
    analyticalData: buildAnalyticalRows(analyticalRaw),
    analyticPeriodo: { inicio: analyticDataInicio, fim: analyticDataFim },
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
              <Select value={filters.filterCliente} onValueChange={v => {
                filters.onFilterChange('cliente', v)
                if (v !== 'todos') {
                  const cli = filters.clientes.find(c => c.id === v)
                  if (cli?.empresa_terceira_id) filters.onFilterChange('empresa', cli.empresa_terceira_id)
                } else {
                  filters.onFilterChange('empresa', 'todos')
                }
              }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {filters.clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Empresa</Label>
              <Select value={filters.filterEmpresa} onValueChange={v => filters.onFilterChange('empresa', v)} disabled={filters.filterCliente !== 'todos' && !!filters.clientes.find(c => c.id === filters.filterCliente)?.empresa_terceira_id}>
                <SelectTrigger className={`h-9 ${filters.filterCliente !== 'todos' ? 'opacity-60' : ''}`}><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as empresas</SelectItem>
                  {filters.empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_empresa}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={filters.filterStatus} onValueChange={v => filters.onFilterChange('status', v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={filters.filterTipo} onValueChange={v => filters.onFilterChange('tipo', v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {filters.tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome_tipo_manutencao}</SelectItem>)}
                </SelectContent>
              </Select>
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

