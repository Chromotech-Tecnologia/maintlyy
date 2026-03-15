import { useState, useEffect } from "react"
import { searchMatch } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import { Plus, UserCog, Edit, Trash2, Users, Eye, Search } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { equipeSchema, type EquipeFormData } from "@/lib/validations"
import { sanitizeFormData, getGenericErrorMessage, isRateLimited } from "@/lib/security"
import { usePlanLimits } from "@/hooks/usePlanLimits"

interface Equipe {
  id: string
  nome_equipe: string
  membros: string | null
  created_at: string
}

export default function Equipes() {
  const { user } = useAuth()
  const { isAdmin, canViewDetailsSystem, canEditSystem, canCreateSystem, canDeleteSystem } = usePermissions()
  const planLimits = usePlanLimits()
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingEquipe, setViewingEquipe] = useState<Equipe | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

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
      toast.error(getGenericErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEquipes()
  }, [user])

  const handleSubmit = async (data: EquipeFormData) => {
    if (!user) return

    if (isRateLimited(`equipe_${user.id}`, 10, 60000)) {
      toast.error("Muitas tentativas. Aguarde um minuto.")
      return
    }

    try {
      const sanitizedData = sanitizeFormData(data)
      if (editingId) {
        const { error } = await supabase
          .from('equipes')
          .update(sanitizedData)
          .eq('id', editingId)
          .eq('user_id', user.id)

        if (error) throw error
        toast.success("Equipe atualizada com sucesso!")
      } else {
        const { error } = await supabase
          .from('equipes')
          .insert([{ ...sanitizedData, user_id: user.id }])

        if (error) throw error
        toast.success("Equipe criada com sucesso!")
      }

      setOpen(false)
      setEditingId(null)
      form.reset()
      fetchEquipes()
    } catch (error: any) {
      toast.error(getGenericErrorMessage(error))
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

  const handleView = (equipe: Equipe) => {
    setViewingEquipe(equipe)
    setViewDialogOpen(true)
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
      toast.error(getGenericErrorMessage(error))
    }
  }

  const openNewDialog = () => {
    if (!planLimits.loading && !planLimits.canCreateTeam) {
      toast.error(`Limite de equipes atingido (${planLimits.currentTeams}/${planLimits.maxTeams}). Contrate um plano para criar mais.`)
      return
    }
    setEditingId(null)
    form.reset()
    setOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Equipes</h1>
          <p className="page-subtitle">Gerencie suas equipes de manutenção</p>
        </div>
        {(isAdmin || canCreateSystem('equipes')) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog} className="gradient-primary border-0 shadow-lg shadow-primary/25 rounded-xl h-11 px-5">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Nova Equipe</span>
                <span className="sm:hidden">Novo</span>
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
        )}
      </div>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Equipe</DialogTitle>
          </DialogHeader>
          {viewingEquipe && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Nome da Equipe</Label>
                <p className="text-lg font-medium">{viewingEquipe.nome_equipe}</p>
              </div>
              {viewingEquipe.membros && (
                <div>
                  <Label className="text-muted-foreground">Membros</Label>
                  <p className="whitespace-pre-wrap">{viewingEquipe.membros}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Data de Criação</Label>
                <p>{new Date(viewingEquipe.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="search-bar">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          placeholder="Buscar por nome ou membros..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 bg-card/80 backdrop-blur border-border/50 rounded-xl shadow-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {equipes.filter(eq => {
          if (!searchTerm) return true
          return searchMatch(eq.nome_equipe, searchTerm) || searchMatch(eq.membros, searchTerm)
        }).map((equipe) => (
          <div key={equipe.id} className="glass-card p-4 space-y-3 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <UserCog className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{equipe.nome_equipe}</h3>
                <p className="text-xs text-muted-foreground">{new Date(equipe.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            
            {equipe.membros && (
              <div className="p-3 bg-muted/40 rounded-lg">
                <h4 className="font-medium text-xs mb-1 flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> Membros
                </h4>
                <p className="text-xs text-foreground line-clamp-2">{equipe.membros}</p>
              </div>
            )}

            <div className="flex gap-2">
              {(isAdmin || canViewDetailsSystem('equipes')) && (
                <Button variant="outline" size="sm" onClick={() => handleView(equipe)} className="h-8 rounded-lg text-xs"><Eye className="h-3.5 w-3.5 mr-1" />Ver</Button>
              )}
              {(isAdmin || canEditSystem('equipes')) && (
                <Button variant="outline" size="sm" className="flex-1 h-8 rounded-lg text-xs" onClick={() => handleEdit(equipe)}><Edit className="h-3.5 w-3.5 mr-1" />Editar</Button>
              )}
              {(isAdmin || canDeleteSystem('equipes')) && (
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDelete(equipe.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {equipes.length === 0 && (
        <div className="glass-card text-center py-12">
          <UserCog className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-display font-semibold mb-1">Nenhuma equipe cadastrada</h3>
          <p className="text-sm text-muted-foreground mb-4">Comece criando sua primeira equipe de manutenção.</p>
          <Button onClick={openNewDialog} className="gradient-primary border-0 rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Primeira Equipe
          </Button>
        </div>
      )}
    </div>
  )
}