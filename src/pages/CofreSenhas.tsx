import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { PasswordStrength } from "@/components/ui/password-strength"
import { Plus, KeyRound, Edit, Trash2, Eye, EyeOff, Copy, ExternalLink, Search, ChevronDown, ChevronRight } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cofreSenhaSchema, type CofreSenhaFormData } from "@/lib/validations"

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

interface GrupoCofre {
  id: string
  nome_grupo: string
}

export default function CofreSenhas() {
  console.log('CofreSenhas component rendering')
  
  const { user } = useAuth()
  console.log('CofreSenhas - user:', user)
  
  const [senhas, setSenhas] = useState<CofreSenha[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [empresas, setEmpresas] = useState<EmpresaTerceira[]>([])
  const [gruposSalvos, setGruposSalvos] = useState<GrupoCofre[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [filtroGrupo, setFiltroGrupo] = useState("")
  const [filtroCliente, setFiltroCliente] = useState("")
  const [filtroEmpresa, setFiltroEmpresa] = useState("")
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null)

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
      const [senhasResult, clientesResult, empresasResult, gruposResult] = await Promise.all([
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
          .eq('user_id', user.id),
        supabase
          .from('grupos_cofre')
          .select('id, nome_grupo')
          .eq('user_id', user.id)
          .order('nome_grupo')
      ])

      if (senhasResult.error) throw senhasResult.error
      if (clientesResult.error) throw clientesResult.error
      if (empresasResult.error) throw empresasResult.error
      if (gruposResult.error) throw gruposResult.error

      setSenhas(senhasResult.data || [])
      setClientes(clientesResult.data || [])
      setEmpresas(empresasResult.data || [])
      setGruposSalvos(gruposResult.data || [])
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
      
      // Salvar grupo se for novo
      if (data.grupo && data.grupo.trim() && !gruposSalvos.find(g => g.nome_grupo === data.grupo.trim())) {
        try {
          await supabase
            .from('grupos_cofre')
            .insert([{ nome_grupo: data.grupo.trim(), user_id: user.id }])
        } catch (error) {
          // Ignora erro se grupo já existe (constraint unique)
          console.log('Grupo já existe ou erro ao salvar:', error)
        }
      }

      const cleanData = {
        ...data,
        cliente_id: data.cliente_id === "none" ? null : data.cliente_id || null,
        empresa_terceira_id: data.empresa_terceira_id === "none" ? null : data.empresa_terceira_id || null,
        url_acesso: data.url_acesso || null,
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
      senha: senha.senha,
      login: senha.login || "",
      url_acesso: senha.url_acesso || "",
      descricao: senha.descricao || "",
      grupo: senha.grupo || "",
      cliente_id: senha.cliente_id || "none",
      empresa_terceira_id: senha.empresa_terceira_id || "none",
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

  // Filtrar senhas
  const senhasFiltradas = senhas.filter(senha => {
    // Filtro por grupo
    const grupoMatch = !filtroGrupo || filtroGrupo === "todos" || senha.grupo?.toLowerCase().includes(filtroGrupo.toLowerCase())
    
    // Filtro por cliente
    const clienteMatch = !filtroCliente || filtroCliente === "todos" || senha.cliente_id === filtroCliente
    
    // Filtro por empresa
    const empresaMatch = !filtroEmpresa || filtroEmpresa === "todos" || senha.empresa_terceira_id === filtroEmpresa
    
    return grupoMatch && clienteMatch && empresaMatch
  })

  // Agrupar senhas por cliente
  const senhasAgrupadasPorCliente = senhasFiltradas.reduce((acc, senha) => {
    let chaveCliente = "Sem Cliente"
    let clienteId = ""
    
    if (senha.clientes?.nome_cliente) {
      chaveCliente = senha.clientes.nome_cliente
      clienteId = senha.cliente_id || ""
    } else if (senha.empresas_terceiras?.nome_empresa) {
      chaveCliente = senha.empresas_terceiras.nome_empresa
      clienteId = senha.empresa_terceira_id || ""
    }
    
    if (!acc[chaveCliente]) {
      acc[chaveCliente] = {
        senhas: [],
        clienteId,
        isEmpresa: !!senha.empresas_terceiras?.nome_empresa
      }
    }
    acc[chaveCliente].senhas.push(senha)
    return acc
  }, {} as Record<string, { senhas: CofreSenha[], clienteId: string, isEmpresa: boolean }>)

  // Obter grupos únicos para o filtro
  const gruposUnicos = [...new Set(senhas.map(senha => senha.grupo).filter(Boolean))]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando cofre de senhas...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Usuário não autenticado</p>
        </div>
      </div>
    )
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
                          <div className="space-y-2">
                            <Input type="password" placeholder="••••••••" {...field} />
                            <PasswordStrength password={field.value} />
                          </div>
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
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione ou digite novo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Nenhum grupo</SelectItem>
                            {gruposSalvos.map((grupo) => (
                              <SelectItem key={grupo.id} value={grupo.nome_grupo}>
                                {grupo.nome_grupo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormControl>
                          <Input
                            placeholder="Ou digite um novo grupo..."
                            value={field.value || ""}
                            onChange={field.onChange}
                            className="mt-2"
                          />
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
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum cliente</SelectItem>
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
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma empresa</SelectItem>
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

      {/* Filtros */}
      <div className="grid gap-4 md:grid-cols-3 p-4 bg-muted/30 rounded-lg">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            Filtrar por grupo:
          </label>
          <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os grupos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os grupos</SelectItem>
              {gruposUnicos.map((grupo) => (
                <SelectItem key={grupo} value={grupo}>
                  {grupo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Filtrar por cliente:</label>
          <Select value={filtroCliente} onValueChange={setFiltroCliente}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.nome_cliente}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Filtrar por empresa:</label>
          <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as empresas</SelectItem>
              {empresas.map((empresa) => (
                <SelectItem key={empresa.id} value={empresa.id}>
                  {empresa.nome_empresa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(filtroGrupo !== "todos" || filtroCliente !== "todos" || filtroEmpresa !== "todos") && (
          <div className="md:col-span-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFiltroGrupo("todos")
                setFiltroCliente("todos")
                setFiltroEmpresa("todos")
              }}
            >
              Limpar todos os filtros
            </Button>
          </div>
        )}
      </div>

      {/* Senhas agrupadas por cliente - Layout resumido */}
      <div className="space-y-6">
        {Object.entries(senhasAgrupadasPorCliente).map(([nomeCliente, dadosCliente]) => (
          <div key={nomeCliente} className="space-y-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary"
              onClick={() => setClienteExpandido(clienteExpandido === nomeCliente ? null : nomeCliente)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <KeyRound className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{nomeCliente}</h3>
                      <p className="text-sm text-muted-foreground">
                        {dadosCliente.senhas.length} senha{dadosCliente.senhas.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Grupos: {[...new Set(dadosCliente.senhas.map(s => s.grupo).filter(Boolean))].join(", ") || "Nenhum"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Clique para expandir
                      </p>
                    </div>
                    {clienteExpandido === nomeCliente ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {clienteExpandido === nomeCliente && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 ml-6">
                {dadosCliente.senhas.map((senha) => (
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
            )}
          </div>
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