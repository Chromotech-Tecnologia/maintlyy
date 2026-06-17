import { forwardRef } from "react"
import { Separator } from "@/components/ui/separator"
import { parseLocalDate, formatLocalDateBR } from "@/lib/dateUtils"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LabelList
} from "recharts"

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export interface ReportAnalyticalRow {
  id: string
  tipo: string
  mes: string
  ano: number
  data: string
  tempoMin: number
  descricao: string
  status: string
}

export interface ReportPayload {
  title: string
  empresaLabel: string
  periodoLabel: string
  clienteLogoUrl?: string | null
  generatedAt: string
  stats: {
    totalManutencoes: number
    manutencoesPendentes: number
    totalHoras: number
    totalClientes: number
  }
  chartData: any[]
  weeklyData: any[]
  tipoData: any[]
  analyticalData: ReportAnalyticalRow[]
  analyticPeriodo?: { inicio?: string; fim?: string }
}

const fmtHM = (mins: number) => {
  const m = Math.max(0, Number(mins) || 0)
  const h = Math.floor(m / 60); const r = m % 60
  return m === 0 ? '0h' : `${h > 0 ? h + 'h' : ''}${r > 0 ? r + 'm' : ''}`
}

export function buildAnalyticalRows(items: any[]): ReportAnalyticalRow[] {
  const MAX_MIN = 60 * 24 * 30
  return items.map((m: any) => {
    let t = m.tempo_total || 0
    if ((t <= 0 || t > MAX_MIN) && m.hora_inicio && m.hora_fim) {
      const [hi, mi] = m.hora_inicio.split(':').map(Number)
      const [hf, mf] = m.hora_fim.split(':').map(Number)
      const r = (hf * 60 + mf) - (hi * 60 + mi)
      t = r >= 0 ? r : r + 24 * 60
    }
    if (t < 0 || t > MAX_MIN) t = 0
    const d = parseLocalDate(m.data_inicio)
    return {
      id: m.id,
      tipo: m.tipos_manutencao?.nome_tipo_manutencao || '—',
      mes: MONTHS_PT[d.getMonth()],
      ano: d.getFullYear(),
      data: d.toLocaleDateString('pt-BR'),
      tempoMin: t,
      descricao: m.descricao || '—',
      status: m.status || 'Em andamento',
    }
  })
}

export const ReportContent = forwardRef<HTMLDivElement, { payload: ReportPayload }>(({ payload }, ref) => {
  const { stats, chartData, weeklyData, tipoData, analyticalData, analyticPeriodo } = payload
  const totalAnaliticoMin = analyticalData.reduce((s, r) => s + r.tempoMin, 0)
  const horasTotal = Math.floor(stats.totalHoras / 60)
  const minsTotal = stats.totalHoras % 60

  return (
    <div ref={ref} className="bg-white text-gray-900 p-4 sm:p-8 rounded-xl" style={{ minWidth: 700 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {payload.clienteLogoUrl && (
            <img src={payload.clienteLogoUrl} alt={payload.title} className="w-16 h-16 object-contain" crossOrigin="anonymous" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{payload.title}</h1>
            <p className="text-sm text-gray-500">Dashboard de Manutenção — {payload.periodoLabel}</p>
            <p className="text-xs text-gray-400 mt-0.5">{payload.empresaLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <img src="/lovable-uploads/d0885aef-121a-4a46-81cf-7d5f3c5199cc.png" alt="Maintly" className="h-10 ml-auto mb-1" />
          <p className="text-[10px] text-gray-400">Gerado em {payload.generatedAt}</p>
        </div>
      </div>

      <Separator className="mb-6 bg-gray-200" />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Manutenções", value: stats.totalManutencoes, color: "#3b82f6" },
          { label: "Pendentes", value: stats.manutencoesPendentes, color: "#f59e0b" },
          { label: "Total Horas", value: `${horasTotal}h${minsTotal > 0 ? `${minsTotal}m` : ''}`, color: "#22c55e" },
          { label: "Clientes", value: stats.totalClientes, color: "#8b5cf6" },
        ].map((kpi, i) => (
          <div key={i} className="p-4 rounded-xl border border-gray-100" style={{ background: `linear-gradient(135deg, ${kpi.color}08, ${kpi.color}15)` }}>
            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Resumo Mensal */}
      <div className="mb-8">
        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 Resumo Mensal</h3>
          <div className="overflow-x-auto">
            <div style={{ minWidth: chartData.length > 12 ? chartData.length * 70 : '100%', width: chartData.length > 12 ? chartData.length * 70 : '100%' }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="rcBarGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="rcBarGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <Tooltip formatter={(value: any, name: any, props: any) => name === 'horas' ? [fmtHM(props?.payload?.horasMin ?? Math.round(Number(value) * 60)), 'horas'] : [value, name]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="manutenções" fill="url(#rcBarGrad1)" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="manutenções" position="top" style={{ fontSize: 9, fill: '#3b82f6' }} />
                  </Bar>
                  <Bar dataKey="horas" fill="url(#rcBarGrad2)" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="horasMin" position="top" formatter={(v: any) => fmtHM(Number(v))} style={{ fontSize: 9, fill: '#22c55e' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Tendência + Por Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 Tendência Semanal</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="rcAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip formatter={(value: any, _name: any, props: any) => [`${value} • ${fmtHM(props?.payload?.horasMin || 0)}`, 'Manutenções']} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#rcAreaGrad)" strokeWidth={2.5} name="Manutenções">
                <LabelList position="top" content={(props: any) => {
                  const { x, y, index } = props
                  const d = weeklyData[index]
                  if (!d) return null
                  return (
                    <text x={x} y={(y || 0) - 6} textAnchor="middle" style={{ fontSize: 9, fill: '#3b82f6' }}>
                      {`${d.value} • ${fmtHM(d.horasMin || 0)}`}
                    </text>
                  )
                }} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {tipoData.length > 0 && (
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">🔧 Por Tipo</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tipoData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={4} dataKey="value"
                  label={({ name, value, payload }: any) => `${name}: ${value} • ${fmtHM(payload?.horasMin || 0)}`}>
                  {tipoData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, _name: any, props: any) => [`${value} • ${fmtHM(props?.payload?.horasMin || 0)}`, props?.payload?.name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabela analítica */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">📋 Relatório Analítico Detalhado</h3>
        {(analyticPeriodo?.inicio || analyticPeriodo?.fim) && (
          <p className="text-[10px] text-gray-400 mb-2">
            Período: {analyticPeriodo?.inicio ? formatLocalDateBR(analyticPeriodo.inicio) : '—'} a {analyticPeriodo?.fim ? formatLocalDateBR(analyticPeriodo.fim) : '—'}
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
              {analyticalData.length > 0 ? analyticalData.map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-2 border border-gray-200">{m.tipo}</td>
                  <td className="p-2 border border-gray-200 text-center">{m.mes}</td>
                  <td className="p-2 border border-gray-200 text-center">{m.ano}</td>
                  <td className="p-2 border border-gray-200 text-center">{m.data}</td>
                  <td className="p-2 border border-gray-200 text-center">{fmtHM(m.tempoMin)}</td>
                  <td className="p-2 border border-gray-200 whitespace-pre-wrap break-words">{m.descricao}</td>
                  <td className="p-2 border border-gray-200 text-center">{m.status}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-400 border border-gray-200">Nenhuma manutenção encontrada para o período selecionado</td>
                </tr>
              )}
              {analyticalData.length > 0 && (
                <tr className="bg-gray-100 font-bold">
                  <td className="p-2 border border-gray-200">Total: {analyticalData.length}</td>
                  <td colSpan={3} className="p-2 border border-gray-200"></td>
                  <td className="p-2 border border-gray-200 text-center">{fmtHM(totalAnaliticoMin)}</td>
                  <td colSpan={2} className="p-2 border border-gray-200"></td>
                </tr>
              )}
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
        <span>Gerado em {payload.generatedAt}</span>
      </div>
    </div>
  )
})
ReportContent.displayName = "ReportContent"
