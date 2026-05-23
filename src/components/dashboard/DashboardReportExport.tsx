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
            <Button onClick={handleExport} disabled={exporting} className="h-9">
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              {exporting ? "Gerando..." : "Gerar Relatório (PDF)"}
            </Button>
            <Button variant="outline" size="sm" className="h-9 ml-auto" onClick={() => setShowHistory(true)}>
              <History className="h-4 w-4 mr-2" /> Histórico
            </Button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="overflow-x-auto">
          <div ref={reportRef} className="bg-white text-gray-900 p-4 sm:p-8 rounded-xl" style={{ minWidth: 700 }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {selectedCliente?.logo_url && (
                  <img src={selectedCliente.logo_url} alt={selectedCliente.nome_cliente} className="w-16 h-16 object-contain" crossOrigin="anonymous" />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {selectedCliente ? selectedCliente.nome_cliente : "Relatório Geral"}
                  </h1>
                  <p className="text-sm text-gray-500">Dashboard de Manutenção — {periodoLabel()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{empresaHeaderLabel()}</p>
                </div>
              </div>
              <div className="text-right">
                <img src="/lovable-uploads/d0885aef-121a-4a46-81cf-7d5f3c5199cc.png" alt="Maintly" className="h-10 ml-auto mb-1" />
                <p className="text-[10px] text-gray-400">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            <Separator className="mb-6 bg-gray-200" />

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Manutenções", value: data.stats.totalManutencoes, color: "#3b82f6" },
                { label: "Pendentes", value: data.stats.manutencoesPendentes, color: "#f59e0b" },
                { label: "Total Horas", value: (() => { const h = Math.floor(data.stats.totalHoras / 60); const m = data.stats.totalHoras % 60; return `${h}h${m > 0 ? `${m}m` : ''}`; })(), color: "#22c55e" },
                { label: "Clientes", value: data.stats.totalClientes, color: "#8b5cf6" },
              ].map((kpi, i) => (
                <div key={i} className="p-4 rounded-xl border border-gray-100" style={{ background: `linear-gradient(135deg, ${kpi.color}08, ${kpi.color}15)` }}>
                  <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                  <p className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Resumo Mensal - full width */}
            <div className="mb-8">
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 Resumo Mensal</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.chartData}>
                    <defs>
                      <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip formatter={(value: any, name: any, props: any) => name === 'horas' ? [(() => { const mins = props?.payload?.horasMin ?? Math.round(Number(value) * 60); const h = Math.floor(mins / 60); const m = mins % 60; return `${h > 0 ? h + 'h' : ''}${m > 0 ? m + 'm' : (h === 0 ? '0h' : '')}`; })(), 'horas'] : [value, name]} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="manutenções" fill="url(#barGrad1)" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="manutenções" position="top" style={{ fontSize: 9, fill: '#3b82f6' }} />
                    </Bar>
                    <Bar dataKey="horas" fill="url(#barGrad2)" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="horasMin" position="top" formatter={(v: any) => { const mins = Number(v) || 0; const h = Math.floor(mins / 60); const m = mins % 60; return `${h > 0 ? h + 'h' : ''}${m > 0 ? m + 'm' : (h === 0 ? '' : '')}`; }} style={{ fontSize: 9, fill: '#22c55e' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tendência Semanal + Por Tipo side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 Tendência Semanal</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.weeklyData}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip formatter={(value: any, _name: any, props: any) => [`${value} • ${(() => { const mins = props?.payload?.horasMin || 0; const h = Math.floor(mins/60); const m = mins%60; return `${h>0?h+'h':''}${m>0?m+'m':(h===0?'0h':'')}`; })()}`, 'Manutenções']} />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#areaGrad)" strokeWidth={2.5} name="Manutenções">
                      <LabelList position="top" content={(props: any) => {
                        const { x, y, index } = props
                        const d = data.weeklyData[index]
                        if (!d) return null
                        const mins = d.horasMin || 0
                        const h = Math.floor(mins/60); const m = mins%60
                        const hLabel = `${h>0?h+'h':''}${m>0?m+'m':(h===0?'0h':'')}`
                        return (
                          <text x={x} y={(y || 0) - 6} textAnchor="middle" style={{ fontSize: 9, fill: '#3b82f6' }}>
                            {`${d.value} • ${hLabel}`}
                          </text>
                        )
                      }} />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {data.tipoData.length > 0 && (
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">🔧 Por Tipo</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data.tipoData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={4} dataKey="value" label={({ name, value, payload }: any) => { const mins = payload?.horasMin || 0; const h = Math.floor(mins/60); const m = mins%60; const hLabel = `${h>0?h+'h':''}${m>0?m+'m':(h===0?'0h':'')}`; return `${name}: ${value} • ${hLabel}`; }}>
                        {data.tipoData.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, _name: any, props: any) => [`${value} • ${(() => { const mins = props?.payload?.horasMin || 0; const h = Math.floor(mins/60); const m = mins%60; return `${h>0?h+'h':''}${m>0?m+'m':(h===0?'0h':'')}`; })()}`, props?.payload?.name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>





            {/* Detailed Analytical Table */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">📋 Relatório Analítico Detalhado</h3>
              {(analyticDataInicio || analyticDataFim) && (
                <p className="text-[10px] text-gray-400 mb-2">
                  Período: {analyticDataInicio ? new Date(analyticDataInicio).toLocaleDateString('pt-BR') : '—'} a {analyticDataFim ? new Date(analyticDataFim).toLocaleDateString('pt-BR') : '—'}
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-2 border border-gray-200 font-semibold">Tipo de Manutenção</th>
                      <th className="text-center p-2 border border-gray-200 font-semibold">Mês</th>
                      <th className="text-center p-2 border border-gray-200 font-semibold">Ano</th>
                      <th className="text-center p-2 border border-gray-200 font-semibold">Data</th>
                      <th className="text-center p-2 border border-gray-200 font-semibold">Tempo Dedicado</th>
                      <th className="text-left p-2 border border-gray-200 font-semibold">Descrição</th>
                      <th className="text-center p-2 border border-gray-200 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticalData.length > 0 ? analyticalData.map((m: any, i: number) => {
                      const d = new Date(m.data_inicio)
                      const MAX_MIN = 60 * 24 * 30
                      let tempoMin = m.tempo_total || 0
                      if ((tempoMin <= 0 || tempoMin > MAX_MIN) && m.hora_inicio && m.hora_fim) {
                        const [hi, mi] = m.hora_inicio.split(':').map(Number)
                        const [hf, mf] = m.hora_fim.split(':').map(Number)
                        const r = (hf * 60 + mf) - (hi * 60 + mi)
                        tempoMin = r >= 0 ? r : r + 24 * 60
                      }
                      if (tempoMin < 0 || tempoMin > MAX_MIN) tempoMin = 0
                      const horas = Math.floor(tempoMin / 60)
                      const mins = tempoMin % 60
                      const tempoLabel = tempoMin === 0 ? '0h' : `${horas > 0 ? `${horas}h` : ''}${mins > 0 ? `${mins}m` : ''}`
                      return (
                        <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="p-2 border border-gray-200">{m.tipos_manutencao?.nome_tipo_manutencao || '—'}</td>
                          <td className="p-2 border border-gray-200 text-center">{MONTHS_PT[d.getMonth()]}</td>
                          <td className="p-2 border border-gray-200 text-center">{d.getFullYear()}</td>
                          <td className="p-2 border border-gray-200 text-center">{d.toLocaleDateString('pt-BR')}</td>
                          <td className="p-2 border border-gray-200 text-center">{tempoLabel}</td>
                          <td className="p-2 border border-gray-200 whitespace-pre-wrap break-words">{m.descricao || '—'}</td>
                          <td className="p-2 border border-gray-200 text-center">{m.status || 'Em andamento'}</td>
                        </tr>
                      )
                    }) : (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-gray-400 border border-gray-200">Nenhuma manutenção encontrada para o período selecionado</td>
                      </tr>
                    )}
                    {analyticalData.length > 0 && (() => {
                      const totalMin = analyticalData.reduce((s: number, m: any) => {
                        const MAX_MIN = 60 * 24 * 30
                        let t = m.tempo_total || 0
                        if ((t <= 0 || t > MAX_MIN) && m.hora_inicio && m.hora_fim) {
                          const [hi, mi] = m.hora_inicio.split(':').map(Number)
                          const [hf, mf] = m.hora_fim.split(':').map(Number)
                          const r = (hf * 60 + mf) - (hi * 60 + mi)
                          t = r >= 0 ? r : r + 24 * 60
                        }
                        if (t < 0 || t > MAX_MIN) t = 0
                        return s + t
                      }, 0)
                      const totalH = Math.floor(totalMin / 60)
                      const totalM = totalMin % 60
                      return (
                        <tr className="bg-gray-100 font-bold">
                          <td className="p-2 border border-gray-200">Total: {analyticalData.length}</td>
                          <td colSpan={3} className="p-2 border border-gray-200"></td>
                          <td className="p-2 border border-gray-200 text-center">
                            {totalH}h{totalM > 0 ? `${totalM}m` : ''}
                          </td>
                          <td colSpan={2} className="p-2 border border-gray-200"></td>
                        </tr>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <Separator className="mb-4 bg-gray-200" />
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <div className="flex items-center gap-2">
                <img src="/lovable-uploads/90637fdc-0828-4765-9f53-c726c82d9dac.png" alt="Maintly" className="h-5" />
                <span>
                  <a href="https://maintly.chromotech.com.br" className="text-blue-500 hover:underline font-medium">Maintly©</a>
                  {" — Um produto "}
                  <a href="https://chromotech.com.br" className="text-blue-500 hover:underline font-medium">Chromotech®</a>
                </span>
              </div>
              <span>Gerado em {new Date().toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
