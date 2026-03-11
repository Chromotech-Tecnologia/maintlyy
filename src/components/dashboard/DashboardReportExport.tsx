import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { FileDown, Image, FileText, Loader2 } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

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
  clientes: { id: string; nome_cliente: string; logo_url?: string | null }[]
  equipes: { id: string; nome_equipe: string }[]
  tipos: { id: string; nome_tipo_manutencao: string }[]
  filterCliente: string
  filterEquipe: string
  filterTipo: string
  filterDataInicio: string
  filterDataFim: string
  onFilterChange: (key: string, value: string) => void
}

interface DashboardReportExportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: ReportData
  filters: ReportFilters
  currentYear: number
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export function DashboardReportExport({ open, onOpenChange, data, filters, currentYear }: DashboardReportExportProps) {
  const reportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [format, setFormat] = useState<'pdf' | 'png'>('pdf')

  const selectedCliente = filters.clientes.find(c => c.id === filters.filterCliente)

  const handleExport = useCallback(async () => {
    if (!reportRef.current) return
    setExporting(true)

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      if (format === 'png') {
        const link = document.createElement('a')
        link.download = `relatorio_dashboard_${new Date().toISOString().split('T')[0]}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      } else {
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
      }
    } catch (error) {
      console.error('Erro ao exportar:', error)
    } finally {
      setExporting(false)
    }
  }, [format])

  const periodoLabel = () => {
    if (filters.filterDataInicio && filters.filterDataFim) {
      return `${new Date(filters.filterDataInicio).toLocaleDateString('pt-BR')} a ${new Date(filters.filterDataFim).toLocaleDateString('pt-BR')}`
    }
    return `Ano ${currentYear}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Exportar Relatório do Dashboard
          </DialogTitle>
        </DialogHeader>

        {/* Export Controls */}
        <div className="flex flex-wrap items-end gap-4 pb-4 border-b border-border">
          <div className="space-y-1.5">
            <Label className="text-xs">Cliente</Label>
            <Select value={filters.filterCliente} onValueChange={v => filters.onFilterChange('cliente', v)}>
              <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clientes</SelectItem>
                {filters.clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Equipe</Label>
            <Select value={filters.filterEquipe} onValueChange={v => filters.onFilterChange('equipe', v)}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {filters.equipes.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_equipe}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select value={filters.filterTipo} onValueChange={v => filters.onFilterChange('tipo', v)}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {filters.tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome_tipo_manutencao}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data Início</Label>
            <Input type="date" className="h-9 w-40" value={filters.filterDataInicio} onChange={e => filters.onFilterChange('dataInicio', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data Fim</Label>
            <Input type="date" className="h-9 w-40" value={filters.filterDataFim} onChange={e => filters.onFilterChange('dataFim', e.target.value)} />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Select value={format} onValueChange={(v: 'pdf' | 'png') => setFormat(v)}>
              <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf"><span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> PDF</span></SelectItem>
                <SelectItem value="png"><span className="flex items-center gap-1.5"><Image className="h-3.5 w-3.5" /> Imagem</span></SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} disabled={exporting} className="h-9">
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              {exporting ? "Exportando..." : "Exportar"}
            </Button>
          </div>
        </div>

        {/* Report Preview */}
        <div ref={reportRef} className="bg-white text-gray-900 p-8 rounded-xl" style={{ minWidth: 800 }}>
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
              </div>
            </div>
            <div className="text-right">
              <img src="/lovable-uploads/d0885aef-121a-4a46-81cf-7d5f3c5199cc.png" alt="Maintly" className="h-10 ml-auto mb-1" />
              <p className="text-[10px] text-gray-400">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <Separator className="mb-6 bg-gray-200" />

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Manutenções", value: data.stats.totalManutencoes, color: "#3b82f6" },
              { label: "Pendentes", value: data.stats.manutencoesPendentes, color: "#f59e0b" },
              { label: "Total Horas", value: data.stats.totalHoras, color: "#22c55e" },
              { label: "Clientes", value: data.stats.totalClientes, color: "#8b5cf6" },
            ].map((kpi, i) => (
              <div key={i} className="p-4 rounded-xl border border-gray-100" style={{ background: `linear-gradient(135deg, ${kpi.color}08, ${kpi.color}15)` }}>
                <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                <p className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 Visão Mensal — {currentYear}</h3>
              <ResponsiveContainer width="100%" height={240}>
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
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="manutenções" fill="url(#barGrad1)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="horas" fill="url(#barGrad2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 Tendência Semanal</h3>
              <ResponsiveContainer width="100%" height={240}>
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
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#areaGrad)" strokeWidth={2.5} name="Manutenções" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {data.tipoData.length > 0 && (
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">🔧 Por Tipo</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.tipoData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                      {data.tipoData.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.statusData.length > 0 && (
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">⏱️ Por Status</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                      {data.statusData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.teamData.length > 0 && (
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">👥 Horas por Equipe</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.teamData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#6b7280' }} width={80} />
                    <Tooltip />
                    <Bar dataKey="horas" radius={[0, 6, 6, 0]} name="Horas">
                      {data.teamData.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Analytical Table */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 Resumo Analítico</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2 border border-gray-200 font-semibold">Mês</th>
                  <th className="text-center p-2 border border-gray-200 font-semibold">Manutenções</th>
                  <th className="text-center p-2 border border-gray-200 font-semibold">Horas</th>
                </tr>
              </thead>
              <tbody>
                {data.chartData.filter(d => d.manutenções > 0 || d.horas > 0).map((d, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-2 border border-gray-200 capitalize">{d.name}</td>
                    <td className="p-2 border border-gray-200 text-center font-medium">{d.manutenções}</td>
                    <td className="p-2 border border-gray-200 text-center font-medium">{d.horas}h</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td className="p-2 border border-gray-200">Total</td>
                  <td className="p-2 border border-gray-200 text-center">{data.chartData.reduce((s, d) => s + d.manutenções, 0)}</td>
                  <td className="p-2 border border-gray-200 text-center">{data.chartData.reduce((s, d) => s + d.horas, 0)}h</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <Separator className="mb-4 bg-gray-200" />
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <div className="flex items-center gap-2">
              <img src="/lovable-uploads/90637fdc-0828-4765-9f53-c726c82d9dac.png" alt="Maintly" className="h-5" />
              <span>
                <a href="https://maintly.chromotech.com.br" className="text-blue-500 hover:underline font-medium">Maintly</a>
                {" — Um produto "}
                <a href="https://chromotech.com.br" className="text-blue-500 hover:underline font-medium">Chromotech</a>
              </span>
            </div>
            <span>Gerado em {new Date().toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
