import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Clock, Calendar } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"

interface Manutencao {
  id: string
  empresa_terceira_id: string
  cliente_id: string
  tipo_manutencao_id: string
  equipe_id?: string
  data_inicio: string
  hora_inicio: string
  data_fim?: string
  hora_fim?: string
  tempo_total?: number
  descricao?: string
  solicitante?: string
  status: string
  responsavel?: string
  created_at: string
  clientes?: { nome_cliente: string }
  empresas_terceiras?: { nome_empresa: string }
  tipos_manutencao?: { nome_tipo_manutencao: string }
  equipes?: { nome_equipe: string }
}

interface FormData {
  empresa_terceira_id: string
  cliente_id: string
  tipo_manutencao_id: string
  equipe_id: string
  data_inicio: string
  hora_inicio: string
  data_fim: string
  hora_fim: string
  descricao: string
  solicitante: string
  status: string
  responsavel: string
}

export default function Manutencoes() {
  const { user } = useAuth()
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [empresas, setEmpresas] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [tipos, setTipos] = useState<any[]>([])
  const [equipes, setEquipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    empresa_terceira_id: "",
    cliente_id: "",
    tipo_manutencao_id: "",
    equipe_id: "",
    data_inicio: "",
    hora_inicio: "",
    data_fim: "",
    hora_fim: "",
    descricao: "",
    solicitante: "",
    status: "Em andamento",
    responsavel: ""
  })

  const fetchData = async () => {
    if (!user) return

    try {
      const [manutResult, empresasResult, clientesResult, tiposResult, equipesResult] = await Promise.all([
        supabase
          .from('manutencoes')
          .select(`
            *,
            clientes(nome_cliente),
            empresas_terceiras(nome_empresa),
            tipos_manutencao(nome_tipo_manutencao),
            equipes(nome_equipe)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('empresas_terceiras').select('*').eq('user_id', user.id),
        supabase.from('clientes').select('*').eq('user_id', user.id),
        supabase.from('tipos_manutencao').select('*').eq('user_id', user.id),
        supabase.from('equipes').select('*').eq('user_id', user.id)
      ])

      if (manutResult.error) throw manutResult.error
      if (empresasResult.error) throw empresasResult.error
      if (clientesResult.error) throw clientesResult.error
      if (tiposResult.error) throw tiposResult.error
      if (equipesResult.error) throw equipesResult.error

      setManutencoes(manutResult.data || [])
      setEmpresas(empresasResult.data || [])
      setClientes(clientesResult.data || [])
      setTipos(tiposResult.data || [])
      setEquipes(equipesResult.data || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  const calculateTempo = (dataInicio: string, horaInicio: string, dataFim?: string, horaFim?: string) => {
    if (!dataFim || !horaFim) return null
    
    const inicio = new Date(`${dataInicio}T${horaInicio}`)
    const fim = new Date(`${dataFim}T${horaFim}`)
    
    return Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60)) // minutos
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const tempo_total = calculateTempo(
        formData.data_inicio,
        formData.hora_inicio,
        formData.data_fim,
        formData.hora_fim
      )

      const data = {
        ...formData,
        user_id: user.id,
        equipe_id: formData.equipe_id || null,
        tempo_total
      }

      if (editingId) {
        const { error } = await supabase
          .from('manutencoes')
          .update(data)
          .eq('id', editingId)
        
        if (error) throw error
        toast.success("Manutenção atualizada!")
      } else {
        const { error } = await supabase
          .from('manutencoes')
          .insert([data])
        
        if (error) throw error
        toast.success("Manutenção criada!")
      }

      setOpen(false)
      setEditingId(null)
      setFormData({
        empresa_terceira_id: "",
        cliente_id: "",
        tipo_manutencao_id: "",
        equipe_id: "",
        data_inicio: "",
        hora_inicio: "",
        data_fim: "",
        hora_fim: "",
        descricao: "",
        solicitante: "",
        status: "Em andamento",
        responsavel: ""
      })
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleEdit = (manutencao: Manutencao) => {
    setFormData({
      empresa_terceira_id: manutencao.empresa_terceira_id,
      cliente_id: manutencao.cliente_id,
      tipo_manutencao_id: manutencao.tipo_manutencao_id,
      equipe_id: manutencao.equipe_id || "",
      data_inicio: manutencao.data_inicio,
      hora_inicio: manutencao.hora_inicio,
      data_fim: manutencao.data_fim || "",
      hora_fim: manutencao.hora_fim || "",
      descricao: manutencao.descricao || "",
      solicitante: manutencao.solicitante || "",
      status: manutencao.status,
      responsavel: manutencao.responsavel || ""
    })
    setEditingId(manutencao.id)
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('manutencoes')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      toast.success("Manutenção excluída!")
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const formatTempo = (minutos?: number) => {
    if (!minutos) return "-"
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return `${horas}h ${mins}m`
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manutenções</h1>
          <p className="text-muted-foreground">Gerencie todas as manutenções</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Manutenção
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Nova"} Manutenção</DialogTitle>
              <DialogDescription>
                Preencha os dados da manutenção
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Empresa Terceira *</Label>
                  <Select value={formData.empresa_terceira_id} onValueChange={(value) => setFormData({...formData, empresa_terceira_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.nome_empresa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={formData.cliente_id} onValueChange={(value) => setFormData({...formData, cliente_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome_cliente || "Sem nome"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Manutenção *</Label>
                  <Select value={formData.tipo_manutencao_id} onValueChange={(value) => setFormData({...formData, tipo_manutencao_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nome_tipo_manutencao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Equipe</Label>
                  <Select value={formData.equipe_id} onValueChange={(value) => setFormData({...formData, equipe_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {equipes.map((equipe) => (
                        <SelectItem key={equipe.id} value={equipe.id}>
                          {equipe.nome_equipe}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <Input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Início *</Label>
                  <Input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({...formData, data_fim: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Fim</Label>
                  <Input
                    type="time"
                    value={formData.hora_fim}
                    onChange={(e) => setFormData({...formData, hora_fim: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Solicitante</Label>
                  <Input
                    value={formData.solicitante}
                    onChange={(e) => setFormData({...formData, solicitante: e.target.value})}
                    placeholder="Nome do solicitante"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Input
                    value={formData.responsavel}
                    onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                    placeholder="Nome do responsável"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                    <SelectItem value="Finalizado">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Descreva a manutenção realizada..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Manutenções</CardTitle>
          <CardDescription>
            {manutencoes.length} manutenções registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manutencoes.map((manutencao) => (
                <TableRow key={manutencao.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{manutencao.clientes?.nome_cliente || "Sem nome"}</div>
                      <div className="text-sm text-muted-foreground">{manutencao.empresas_terceiras?.nome_empresa}</div>
                    </div>
                  </TableCell>
                  <TableCell>{manutencao.tipos_manutencao?.nome_tipo_manutencao}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {new Date(manutencao.data_inicio).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {manutencao.hora_inicio}
                    </div>
                  </TableCell>
                  <TableCell>{formatTempo(manutencao.tempo_total)}</TableCell>
                  <TableCell>
                    <Badge variant={manutencao.status === "Finalizado" ? "default" : "secondary"}>
                      {manutencao.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{manutencao.responsavel || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(manutencao)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(manutencao.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {manutencoes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma manutenção encontrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}