import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Plus, UserCog, Edit, Trash2, Users } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { equipeSchema, type EquipeFormData } from "@/lib/validations"

interface Equipe {
  id: string
  nome_equipe: string
  membros: string | null
  created_at: string
}

export default function Equipes() {
  const { user } = useAuth()
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const form = useForm<EquipeFormData>({
    resolver: zodResolver(equipeSchema),
    defaultValues: {
      nome_equipe: "",
      membros: "",
    },
  })

  const fetchEquipes = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('equipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEquipes(data || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEquipes()
  }, [user])

  const handleSubmit = async (data: EquipeFormData) => {
    if (!user) return

    try {
      if (editingId) {
        const { error } = await supabase
          .from('equipes')
          .update(data)
          .eq('id', editingId)
          .eq('user_id', user.id)

        if (error) throw error
        toast.success("Equipe atualizada com sucesso!")
      } else {
        const { error } = await supabase
          .from('equipes')
          .insert([{ ...data, user_id: user.id }])

        if (error) throw error
        toast.success("Equipe criada com sucesso!")
      }

      setOpen(false)
      setEditingId(null)
      form.reset()
      fetchEquipes()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleEdit = (equipe: Equipe) => {
    setEditingId(equipe.id)
    form.reset({
      nome_equipe: equipe.nome_equipe,
      membros: equipe.membros || "",
    })
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    if (!confirm("Tem certeza que deseja excluir esta equipe?")) return

    try {
      const { error } = await supabase
        .from('equipes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      toast.success("Equipe excluída com sucesso!")
      fetchEquipes()
    } catch (error: any) {
      toast.error(error.message)
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
          <h1 className="text-3xl font-bold text-foreground">Equipes</h1>
          <p className="text-muted-foreground">
            Gerencie suas equipes de manutenção
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nova Equipe
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Equipe" : "Nova Equipe"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome_equipe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Equipe</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da equipe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="membros"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Membros</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Lista de membros da equipe"
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
        {equipes.map((equipe) => (
          <Card key={equipe.id} className="border-0 shadow-elegant hover:shadow-glow transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <UserCog className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{equipe.nome_equipe}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(equipe.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {equipe.membros && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Membros
                  </h4>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {equipe.membros}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleEdit(equipe)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(equipe.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {equipes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCog className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma equipe cadastrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece criando sua primeira equipe de manutenção.
            </p>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeira Equipe
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}