import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Plus, Calendar, Edit, Trash2, FileText } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { tipoManutencaoSchema, type TipoManutencaoFormData } from "@/lib/validations"
import { sanitizeFormData, getGenericErrorMessage, isRateLimited } from "@/lib/security"

interface TipoManutencao {
  id: string
  nome_tipo_manutencao: string
  descricao: string | null
  created_at: string
}

export default function TiposManutencao() {
  const { user } = useAuth()
  const [tipos, setTipos] = useState<TipoManutencao[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const form = useForm<TipoManutencaoFormData>({
    resolver: zodResolver(tipoManutencaoSchema),
    defaultValues: {
      nome_tipo_manutencao: "",
      descricao: "",
    },
  })

  const fetchTipos = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('tipos_manutencao')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTipos(data || [])
    } catch (error: any) {
      toast.error(getGenericErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTipos()
  }, [user])

  const handleSubmit = async (data: TipoManutencaoFormData) => {
    if (!user) return

    if (isRateLimited(`tipo_${user.id}`, 10, 60000)) {
      toast.error("Muitas tentativas. Aguarde um minuto.")
      return
    }

    try {
      const sanitizedData = sanitizeFormData(data)
      if (editingId) {
        const { error } = await supabase
          .from('tipos_manutencao')
          .update(sanitizedData)
          .eq('id', editingId)
          .eq('user_id', user.id)

        if (error) throw error
        toast.success("Tipo de manutenção atualizado com sucesso!")
      } else {
        const { error } = await supabase
          .from('tipos_manutencao')
          .insert([{ ...sanitizedData, user_id: user.id }])

        if (error) throw error
        toast.success("Tipo de manutenção criado com sucesso!")
      }

      setOpen(false)
      setEditingId(null)
      form.reset()
      fetchTipos()
    } catch (error: any) {
      toast.error(getGenericErrorMessage(error))
    }
  }

  const handleEdit = (tipo: TipoManutencao) => {
    setEditingId(tipo.id)
    form.reset({
      nome_tipo_manutencao: tipo.nome_tipo_manutencao,
      descricao: tipo.descricao || "",
    })
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    if (!confirm("Tem certeza que deseja excluir este tipo de manutenção?")) return

    try {
      const { error } = await supabase
        .from('tipos_manutencao')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      toast.success("Tipo de manutenção excluído com sucesso!")
      fetchTipos()
    } catch (error: any) {
      toast.error(getGenericErrorMessage(error))
    }
  }

  const openNewDialog = () => {
    setEditingId(null)
    form.reset()
    setOpen(true)
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tipos de Manutenção</h1>
          <p className="text-muted-foreground">
            Gerencie os tipos de manutenção disponíveis
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Novo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Tipo de Manutenção" : "Novo Tipo de Manutenção"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome_tipo_manutencao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Tipo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Manutenção Preventiva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descrição detalhada do tipo de manutenção"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingId ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tipos.map((tipo) => (
          <Card key={tipo.id} className="border-0 shadow-elegant hover:shadow-glow transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{tipo.nome_tipo_manutencao}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tipo.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {tipo.descricao && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Descrição
                  </h4>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {tipo.descricao}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleEdit(tipo)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(tipo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tipos.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum tipo cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece criando seu primeiro tipo de manutenção.
            </p>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Tipo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}