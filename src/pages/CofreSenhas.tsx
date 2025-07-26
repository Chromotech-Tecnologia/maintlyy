import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Plus, KeyRound, Edit, Trash2, Eye, EyeOff, Copy, ExternalLink } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cofreSenhaSchema, type CofreSenhaFormData } from "@/lib/validations"
// Removido import de security functions para corrigir tela branca

interface CofreSenha {
  id: string
  nome_acesso: string
  senha: string
  login: string | null
  url_acesso: string | null
  descricao: string | null
  grupo: string | null
  cliente_id: string | null
  empresa_terceira_id: string | null
  created_at: string
  clientes?: { nome_cliente: string }
  empresas_terceiras?: { nome_empresa: string }
}

interface Cliente {
  id: string
  nome_cliente: string
}

interface EmpresaTerceira {
  id: string
  nome_empresa: string
}

export default function CofreSenhas() {
  const { user } = useAuth()
  const [senhas, setSenhas] = useState<CofreSenha[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [empresas, setEmpresas] = useState<EmpresaTerceira[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())

  const form = useForm<CofreSenhaFormData>({
    resolver: zodResolver(cofreSenhaSchema),
    defaultValues: {
      nome_acesso: "",
      senha: "",
      login: "",
      url_acesso: "",
      descricao: "",
      grupo: "",
      cliente_id: "",
      empresa_terceira_id: "",
    },
  })

  const fetchData = async () => {
    if (!user) return

    try {
      const [senhasResult, clientesResult, empresasResult] = await Promise.all([
        supabase
          .from('cofre_senhas')
          .select(`
            *,
            clientes(nome_cliente),
            empresas_terceiras(nome_empresa)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('clientes')
          .select('id, nome_cliente')
          .eq('user_id', user.id),
        supabase
          .from('empresas_terceiras')
          .select('id, nome_empresa')
          .eq('user_id', user.id)
      ])

      if (senhasResult.error) throw senhasResult.error
      if (clientesResult.error) throw clientesResult.error
      if (empresasResult.error) throw empresasResult.error

      setSenhas(senhasResult.data || [])
      setClientes(clientesResult.data || [])
      setEmpresas(empresasResult.data || [])
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  const handleSubmit = async (data: CofreSenhaFormData) => {
    console.log('handleSubmit called with data:', data)
    if (!user) {
      console.log('No user found')
      return
    }

    try {
      console.log('Processing form data...')
      const cleanData = {
        ...data,
        cliente_id: data.cliente_id === "" ? null : data.cliente_id,
        empresa_terceira_id: data.empresa_terceira_id === "" ? null : data.empresa_terceira_id,
        url_acesso: data.url_acesso === "" ? null : data.url_acesso,
      }

      if (editingId) {
        console.log('Updating password with id:', editingId)
        const { error } = await supabase
          .from('cofre_senhas')
          .update(cleanData)
          .eq('id', editingId)
          .eq('user_id', user.id)

        if (error) throw error
        toast.success("Senha atualizada com sucesso!")
      } else {
        console.log('Creating new password')
        const { error } = await supabase
          .from('cofre_senhas')
          .insert([{ ...cleanData, user_id: user.id }])

        if (error) throw error
        toast.success("Senha adicionada com sucesso!")
      }

      setOpen(false)
      setEditingId(null)
      form.reset()
      fetchData()
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      toast.error("Erro ao salvar senha")
    }
  }

  const handleEdit = (senha: CofreSenha) => {
    setEditingId(senha.id)
    form.reset({
      nome_acesso: senha.nome_acesso,
      senha: senha.senha, // Already decrypted for display
      login: senha.login || "",
      url_acesso: senha.url_acesso || "",
      descricao: senha.descricao || "",
      grupo: senha.grupo || "",
      cliente_id: senha.cliente_id || "",
      empresa_terceira_id: senha.empresa_terceira_id || "",
    })
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    if (!confirm("Tem certeza que deseja excluir esta senha?")) return

    try {
      const { error } = await supabase
        .from('cofre_senhas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      toast.success("Senha excluída com sucesso!")
      fetchData()
    } catch (error: any) {
      console.error('Erro ao excluir:', error)
      toast.error("Erro ao excluir senha")
    }
  }

  const togglePasswordVisibility = (id: string) => {
    const newVisible = new Set(visiblePasswords)
    if (newVisible.has(id)) {
      newVisible.delete(id)
    } else {
      newVisible.add(id)
    }
    setVisiblePasswords(newVisible)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copiado para a área de transferência!")
    } catch (error) {
      toast.error("Erro ao copiar")
    }
  }

  const openNewDialog = () => {
    console.log('Opening new dialog')
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
          <h1 className="text-3xl font-bold text-foreground">Cofre de Senhas</h1>
          <p className="text-muted-foreground">
            Gerencie suas senhas de forma segura
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nova Senha
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Senha" : "Nova Senha"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome_acesso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Acesso</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Painel Admin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="login"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Login/Usuário</FormLabel>
                        <FormControl>
                          <Input placeholder="usuário ou email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="senha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="url_acesso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de Acesso</FormLabel>
                      <FormControl>
                        <Input placeholder="https://exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="grupo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grupo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Servidor, Email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cliente_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {clientes.map((cliente) => (
                              <SelectItem key={cliente.id} value={cliente.id}>
                                {cliente.nome_cliente}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="empresa_terceira_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa Terceira (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nenhuma</SelectItem>
                          {empresas.map((empresa) => (
                            <SelectItem key={empresa.id} value={empresa.id}>
                              {empresa.nome_empresa}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <Textarea placeholder="Observações sobre este acesso" {...field} />
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
                    {editingId ? "Atualizar" : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {senhas.map((senha) => (
          <Card key={senha.id} className="border-0 shadow-elegant hover:shadow-glow transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <KeyRound className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{senha.nome_acesso}</CardTitle>
                    {senha.grupo && (
                      <p className="text-sm text-muted-foreground">{senha.grupo}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {senha.login && (
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="text-sm font-medium">Login:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{senha.login}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(senha.login!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span className="text-sm font-medium">Senha:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">
                    {visiblePasswords.has(senha.id) ? senha.senha : "••••••••"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => togglePasswordVisibility(senha.id)}
                  >
                    {visiblePasswords.has(senha.id) ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(senha.senha)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {senha.url_acesso && (
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="text-sm font-medium">URL:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(senha.url_acesso!, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(senha.url_acesso!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {(senha.clientes || senha.empresas_terceiras) && (
                <div className="p-2 bg-muted/30 rounded">
                  <span className="text-sm font-medium">Vinculado:</span>
                  <p className="text-sm text-muted-foreground">
                    {senha.clientes?.nome_cliente || senha.empresas_terceiras?.nome_empresa}
                  </p>
                </div>
              )}

              {senha.descricao && (
                <div className="p-2 bg-muted/30 rounded">
                  <span className="text-sm font-medium">Descrição:</span>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {senha.descricao}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleEdit(senha)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(senha.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {senhas.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <KeyRound className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma senha cadastrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece adicionando sua primeira senha ao cofre seguro.
            </p>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeira Senha
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}