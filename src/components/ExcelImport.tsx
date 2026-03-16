import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Upload, Download, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface ExcelImportProps {
  onImportComplete: () => void
}

interface ManutencaoImport {
  cliente_nome: string
  empresa_terceira_nome?: string
  tipo_manutencao_nome: string
  equipe_nome?: string
  data_inicio: string
  hora_inicio: string
  data_fim?: string
  hora_fim?: string
  descricao?: string
  status?: string
  responsavel?: string
  solicitante?: string
}

function parseExcelDate(value: any): string | null {
  if (!value) return null
  // Excel serial date number
  if (typeof value === 'number' && value > 1 && value < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const date = new Date(excelEpoch.getTime() + value * 86400000)
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof value === 'string') {
    // Already yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    // dd/mm/yyyy
    const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`
  }
  return String(value)
}

function parseExcelTime(value: any): string | null {
  if (!value) return null
  // Excel fractional day (e.g., 0.5 = 12:00)
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60)
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const m = String(totalMinutes % 60).padStart(2, '0')
    return `${h}:${m}`
  }
  if (typeof value === 'string') {
    // HH:MM or HH:MM:SS
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) return value.substring(0, 5)
  }
  return String(value)
}

export function ExcelImport({ onImportComplete }: ExcelImportProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importErrors, setImportErrors] = useState<string[]>([])

  const downloadTemplate = () => {
    const template = [
      {
        cliente_nome: 'Cliente Exemplo',
        empresa_terceira_nome: 'Empresa (opcional)',
        tipo_manutencao_nome: 'Manutenção Preventiva',
        equipe_nome: 'Equipe A (opcional)',
        data_inicio: '2024-01-15',
        hora_inicio: '09:00',
        data_fim: '2024-01-15',
        hora_fim: '17:00',
        descricao: 'Descrição da manutenção',
        status: 'Finalizado',
        responsavel: 'João Silva',
        solicitante: 'Maria Santos'
      }
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(template)
    
    // Definir larguras das colunas
    const colWidths = [
      { wch: 20 }, // cliente_nome
      { wch: 20 }, // empresa_terceira_nome
      { wch: 20 }, // tipo_manutencao_nome
      { wch: 15 }, // equipe_nome
      { wch: 12 }, // data_inicio
      { wch: 10 }, // hora_inicio
      { wch: 12 }, // data_fim
      { wch: 10 }, // hora_fim
      { wch: 30 }, // descricao
      { wch: 15 }, // status
      { wch: 15 }, // responsavel
      { wch: 15 }, // solicitante
    ]
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Modelo Manutenções')
    XLSX.writeFile(wb, 'modelo_manutencoes.xlsx')
    toast.success('Modelo baixado com sucesso!')
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          selectedFile.type === 'application/vnd.ms-excel') {
        setFile(selectedFile)
        setImportErrors([])
      } else {
        toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
      }
    }
  }

  const processImport = async () => {
    if (!file || !user) return

    setImporting(true)
    setProgress(0)
    setImportErrors([])

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ManutencaoImport[]

      setProgress(10)

      if (jsonData.length === 0) {
        throw new Error('Arquivo vazio ou formato inválido')
      }

      // Buscar dados necessários
      const [clientesResult, empresasResult, tiposResult, equipesResult] = await Promise.all([
        supabase.from('clientes').select('id, nome_cliente').eq('user_id', user.id),
        supabase.from('empresas_terceiras').select('id, nome_empresa').eq('user_id', user.id),
        supabase.from('tipos_manutencao').select('id, nome_tipo_manutencao').eq('user_id', user.id),
        supabase.from('equipes').select('id, nome_equipe').eq('user_id', user.id)
      ])

      const clientes = clientesResult.data || []
      const empresas = empresasResult.data || []
      const tipos = tiposResult.data || []
      const equipes = equipesResult.data || []

      setProgress(30)

      const manutencoes = []
      const errors = []

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        try {
          // Buscar cliente
          const cliente = clientes.find(c => 
            c.nome_cliente.toLowerCase() === row.cliente_nome?.toLowerCase()
          )
          if (!cliente) {
            errors.push(`Linha ${i + 2}: Cliente "${row.cliente_nome}" não encontrado`)
            continue
          }

          // Buscar empresa terceira (opcional)
          let empresa_terceira_id = null
          if (row.empresa_terceira_nome) {
            const empresa = empresas.find(e => 
              e.nome_empresa.toLowerCase() === row.empresa_terceira_nome?.toLowerCase()
            )
            if (!empresa) {
              errors.push(`Linha ${i + 2}: Empresa "${row.empresa_terceira_nome}" não encontrada`)
              continue
            }
            empresa_terceira_id = empresa.id
          }

          // Buscar tipo de manutenção
          const tipo = tipos.find(t => 
            t.nome_tipo_manutencao.toLowerCase() === row.tipo_manutencao_nome?.toLowerCase()
          )
          if (!tipo) {
            errors.push(`Linha ${i + 2}: Tipo de manutenção "${row.tipo_manutencao_nome}" não encontrado`)
            continue
          }

          // Buscar equipe (opcional)
          let equipe_id = null
          if (row.equipe_nome) {
            const equipe = equipes.find(e => 
              e.nome_equipe.toLowerCase() === row.equipe_nome?.toLowerCase()
            )
            if (!equipe) {
              errors.push(`Linha ${i + 2}: Equipe "${row.equipe_nome}" não encontrada`)
              continue
            }
            equipe_id = equipe.id
          }

          // Parse datas e horas (suporta serial Excel e strings)
          const dataInicio = parseExcelDate(row.data_inicio)
          const horaInicio = parseExcelTime(row.hora_inicio)
          const dataFim = parseExcelDate(row.data_fim)
          const horaFim = parseExcelTime(row.hora_fim)

          if (!dataInicio || !/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)) {
            errors.push(`Linha ${i + 2}: Data início inválida "${row.data_inicio}". Use o formato AAAA-MM-DD ou DD/MM/AAAA.`)
            continue
          }
          if (!horaInicio || !/^\d{1,2}:\d{2}/.test(horaInicio)) {
            errors.push(`Linha ${i + 2}: Hora início inválida "${row.hora_inicio}". Use o formato HH:MM.`)
            continue
          }

          // Calcular tempo total se ambas as datas/horas estiverem presentes
          let tempo_total = null
          if (dataInicio && horaInicio && dataFim && horaFim) {
            const inicio = new Date(`${dataInicio}T${horaInicio}`)
            const fim = new Date(`${dataFim}T${horaFim}`)
            tempo_total = Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60))
          }

          // Normalizar status para valores aceitos pelo banco
          const rawStatus = row.status || (row as any).Status || ''
          let normalizedStatus = 'Em andamento'
          if (typeof rawStatus === 'string') {
            const lower = rawStatus.trim().toLowerCase()
            if (lower === 'finalizado') normalizedStatus = 'Finalizado'
            else if (lower === 'em andamento') normalizedStatus = 'Em andamento'
          }

          // Suportar coluna "descrição" com acento
          const descricao = row.descricao || (row as any)['descrição'] || (row as any)['descricão'] || null

          manutencoes.push({
            user_id: user.id,
            cliente_id: cliente.id,
            empresa_terceira_id,
            tipo_manutencao_id: tipo.id,
            equipe_id,
            data_inicio: dataInicio,
            hora_inicio: horaInicio,
            data_fim: dataFim || null,
            hora_fim: horaFim || null,
            descricao: descricao,
            status: normalizedStatus,
            responsavel: row.responsavel || null,
            solicitante: row.solicitante || null,
            tempo_total
          })

        } catch (error) {
          errors.push(`Linha ${i + 2}: Erro ao processar dados - ${error}`)
        }

        setProgress(30 + (i / jsonData.length) * 50)
      }

      if (errors.length > 0) {
        console.error('Erros encontrados:', errors)
        setImportErrors(errors)
      }

      if (manutencoes.length === 0) {
        throw new Error('Nenhuma manutenção válida para importar')
      }

      setProgress(80)

      // Inserir manutenções no banco
      const { error } = await supabase
        .from('manutencoes')
        .insert(manutencoes)

      if (error) throw error

      setProgress(100)

      toast.success(`${manutencoes.length} manutenção(ões) importada(s) com sucesso!`)
      if (errors.length > 0) {
        toast.warning(`${errors.length} linha(s) foram ignoradas devido a erros`)
      }

      setOpen(false)
      setFile(null)
      onImportComplete()

    } catch (error: any) {
      console.error('Erro na importação:', error)
      toast.error(`Erro na importação: ${error.message}`)
    } finally {
      setImporting(false)
      setProgress(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Manutenções</DialogTitle>
          <DialogDescription>
            Importe múltiplas manutenções através de um arquivo Excel
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">1. Baixar Modelo</CardTitle>
              <CardDescription className="text-xs">
                Baixe o modelo Excel com a estrutura correta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadTemplate}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar Modelo
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">2. Selecionar Arquivo</CardTitle>
              <CardDescription className="text-xs">
                Selecione o arquivo Excel preenchido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={importing}
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  Arquivo selecionado: {file.name}
                </p>
              )}
            </CardContent>
          </Card>

          {importErrors.length > 0 && (
            <Card className="border-destructive">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive">
                  {importErrors.length} erro(s) encontrado(s)
                </CardTitle>
                <CardDescription className="text-xs">
                  Corrija os dados na planilha e tente novamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importErrors.map((err, idx) => (
                    <p key={idx} className="text-xs text-destructive">{err}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {importing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Importando...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={importing}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={processImport}
              disabled={!file || importing}
              className="flex-1"
            >
              <Upload className="mr-2 h-4 w-4" />
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}