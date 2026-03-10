import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import { Plus, Calendar, Edit, Trash2, FileText, Eye, Search } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
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
  const { isAdmin, canViewDetailsSystem, canEditSystem, canCreateSystem, canDeleteSystem } = usePermissions()
  const [tipos, setTipos] = useState<TipoManutencao[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingTipo, setViewingTipo] = useState<TipoManutencao | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

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

  const handleView = (tipo: TipoManutencao) => {
    setViewingTipo(tipo)
    setViewDialogOpen(true)
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
          <h1 className="page-title font-display">Tipos de Manutenção</h1>
          <p className="page-subtitle">Gerencie os tipos de manutenção disponíveis</p>
        </div>
        {(isAdmin || canCreateSystem('tipos_manutencao')) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog} className="gradient-primary border-0 shadow-lg shadow-primary/25 rounded-xl h-11 px-5">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Novo Tipo</span>
                <span className="sm:hidden">Novo</span>
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
        )}
      </div>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Tipo de Manutenção</DialogTitle>
          </DialogHeader>
          {viewingTipo && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Nome do Tipo</Label>
                <p className="text-lg font-medium">{viewingTipo.nome_tipo_manutencao}</p>
              </div>
              {viewingTipo.descricao && (
                <div>
                  <Label className="text-muted-foreground">Descrição</Label>
                  <p className="whitespace-pre-wrap">{viewingTipo.descricao}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Data de Criação</Label>
                <p>{new Date(viewingTipo.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="search-bar">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          placeholder="Buscar por nome ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 bg-card/80 backdrop-blur border-border/50 rounded-xl shadow-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tipos.filter(t => {
          if (!searchTerm) return true
          const s = searchTerm.toLowerCase()
          return t.nome_tipo_manutencao.toLowerCase().includes(s) || t.descricao?.toLowerCase().includes(s)
        }).map((tipo) => (
          <div key={tipo.id} className="glass-card p-4 space-y-3 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{tipo.nome_tipo_manutencao}</h3>
                <p className="text-xs text-muted-foreground">{new Date(tipo.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            
            {tipo.descricao && (
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground line-clamp-2">{tipo.descricao}</p>
              </div>
            )}

            <div className="flex gap-2">
              {(isAdmin || canViewDetailsSystem('tipos_manutencao')) && (
                <Button variant="outline" size="sm" onClick={() => handleView(tipo)} className="h-8 rounded-lg text-xs"><Eye className="h-3.5 w-3.5 mr-1" />Ver</Button>
              )}
              {(isAdmin || canEditSystem('tipos_manutencao')) && (
                <Button variant="outline" size="sm" className="flex-1 h-8 rounded-lg text-xs" onClick={() => handleEdit(tipo)}><Edit className="h-3.5 w-3.5 mr-1" />Editar</Button>
              )}
              {(isAdmin || canDeleteSystem('tipos_manutencao')) && (
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDelete(tipo.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {tipos.length === 0 && (
        <div className="glass-card text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-display font-semibold mb-1">Nenhum tipo cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-4">Comece criando seu primeiro tipo de manutenção.</p>
          <Button onClick={openNewDialog} className="gradient-primary border-0 rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Primeiro Tipo
          </Button>
        </div>
      )}
    </div>
  )
}