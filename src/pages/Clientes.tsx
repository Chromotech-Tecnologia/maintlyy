import { useState, useEffect } from "react"
import { searchMatch } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Plus, Building2, MapPin, Phone, Mail, Edit, Trash2, Eye, Search } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { clienteSchema, type ClienteFormData } from "@/lib/validations"
import { sanitizeFormData, getGenericErrorMessage, isRateLimited } from "@/lib/security"

interface Cliente {
  id: string
  nome_cliente: string
  email: string | null
  telefone: string | null
  cnpj: string | null
  endereco: string | null
  empresa_terceira_id: string
  created_at: string
  empresas_terceiras?: { nome_empresa: string }
}

interface EmpresaTerceira {
  id: string
  nome_empresa: string
}

export default function Clientes() {
  const { user } = useAuth()
  const permissions = usePermissions()
  const { isAdmin, canViewDetailsSystem, canEditSystem, canCreateSystem, canDeleteSystem } = permissions
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [empresas, setEmpresas] = useState<EmpresaTerceira[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingCliente, setViewingCliente] = useState<Cliente | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome_cliente: "",
      email: "",
      telefone: "",
      cnpj: "",
      endereco: "",
      empresa_terceira_id: "",
    },
  })

  const fetchData = async () => {
    if (!user) return

    try {
      // Se for admin, buscar todos os clientes, senão buscar apenas os permitidos
      let clientesQuery
      if (permissions.isAdmin) {
        clientesQuery = supabase
          .from('clientes')
          .select('*, empresas_terceiras(nome_empresa)')
          .order('created_at', { ascending: false })
      } else {
        // Para usuários não-admin, buscar todos os clientes
        // (as políticas RLS irão filtrar automaticamente)
        clientesQuery = supabase
          .from('clientes')
          .select('*, empresas_terceiras(nome_empresa)')
          .order('created_at', { ascending: false })
      }

      const [clientesResult, empresasResult] = await Promise.all([
        clientesQuery,
        supabase
          .from('empresas_terceiras')
          .select('*')
          .eq('user_id', user.id)
      ])

      if (clientesResult.error) throw clientesResult.error
      if (empresasResult.error) throw empresasResult.error

      setClientes(clientesResult.data || [])
      setEmpresas(empresasResult.data || [])
    } catch (error: any) {
      toast.error(getGenericErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  const handleSubmit = async (data: ClienteFormData) => {
    if (!user) return

    if (isRateLimited(`cliente_${user.id}`, 10, 60000)) {
      toast.error("Muitas tentativas. Aguarde um minuto.")
      return
    }

    try {
      const sanitizedData = sanitizeFormData(data)
      if (editingId) {
        const { error } = await supabase
          .from('clientes')
          .update(sanitizedData)
          .eq('id', editingId)
          .eq('user_id', user.id)

        if (error) throw error
        toast.success("Cliente atualizado com sucesso!")
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([{ ...sanitizedData, user_id: user.id }])

        if (error) throw error
        toast.success("Cliente criado com sucesso!")
      }

      setOpen(false)
      setEditingId(null)
      form.reset()
      fetchData()
    } catch (error: any) {
      toast.error(getGenericErrorMessage(error))
    }
  }

  const handleEdit = (cliente: Cliente) => {
    setEditingId(cliente.id)
    form.reset({
      nome_cliente: cliente.nome_cliente,
      email: cliente.email || "",
      telefone: cliente.telefone || "",
      cnpj: cliente.cnpj || "",
      endereco: cliente.endereco || "",
      empresa_terceira_id: cliente.empresa_terceira_id,
    })
    setOpen(true)
  }

  const handleView = (cliente: Cliente) => {
    setViewingCliente(cliente)
    setViewDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      toast.success("Cliente excluído com sucesso!")
      fetchData()
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Clientes</h1>
          <p className="page-subtitle">Gerencie seus clientes e contratos</p>
        </div>
        {(isAdmin || canCreateSystem('clientes')) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog} className="gradient-primary border-0 shadow-lg shadow-primary/25 rounded-xl h-11 px-5">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Novo Cliente</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome_cliente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="empresa_terceira_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma empresa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(11) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Endereço completo" {...field} />
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

      {/* Search */}
      <div className="search-bar">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          placeholder="Buscar por nome, email, CNPJ, telefone, empresa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 bg-card/80 backdrop-blur border-border/50 rounded-xl shadow-sm"
        />
      </div>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {viewingCliente && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Nome do Cliente</Label>
                <p className="text-lg font-medium">{viewingCliente.nome_cliente}</p>
              </div>
              {viewingCliente.cnpj && (
                <div>
                  <Label className="text-muted-foreground">CNPJ</Label>
                  <p>{viewingCliente.cnpj}</p>
                </div>
              )}
              {viewingCliente.email && (
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p>{viewingCliente.email}</p>
                </div>
              )}
              {viewingCliente.telefone && (
                <div>
                  <Label className="text-muted-foreground">Telefone</Label>
                  <p>{viewingCliente.telefone}</p>
                </div>
              )}
              {viewingCliente.endereco && (
                <div>
                  <Label className="text-muted-foreground">Endereço</Label>
                  <p>{viewingCliente.endereco}</p>
                </div>
              )}
              {viewingCliente.empresas_terceiras && (
                <div>
                  <Label className="text-muted-foreground">Empresa</Label>
                  <p>{viewingCliente.empresas_terceiras.nome_empresa}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Data de Criação</Label>
                <p>{new Date(viewingCliente.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clientes.filter(c => {
          if (!searchTerm) return true
          const s = searchTerm.toLowerCase()
          return c.nome_cliente?.toLowerCase().includes(s) ||
            c.email?.toLowerCase().includes(s) ||
            c.cnpj?.toLowerCase().includes(s) ||
            c.telefone?.toLowerCase().includes(s) ||
            c.endereco?.toLowerCase().includes(s) ||
            c.empresas_terceiras?.nome_empresa?.toLowerCase().includes(s)
        }).map((cliente) => (
          <div key={cliente.id} className="glass-card p-4 space-y-3 hover:shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">{cliente.nome_cliente}</h3>
                  {cliente.cnpj && <p className="text-xs text-muted-foreground">{cliente.cnpj}</p>}
                </div>
              </div>
              <Badge className="bg-success/15 text-success border border-success/20 text-[10px] shrink-0">Ativo</Badge>
            </div>
            
            <div className="space-y-1.5">
              {cliente.telefone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{cliente.telefone}</span>
                </div>
              )}
              {cliente.email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{cliente.email}</span>
                </div>
              )}
              {cliente.endereco && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{cliente.endereco}</span>
                </div>
              )}
            </div>

            {cliente.empresas_terceiras && (
              <div className="px-3 py-2 bg-muted/40 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Empresa</p>
                <p className="text-xs font-medium">{cliente.empresas_terceiras.nome_empresa}</p>
              </div>
            )}

            <div className="flex gap-2">
              {(isAdmin || canViewDetailsSystem('clientes')) && (
                <Button variant="outline" size="sm" onClick={() => handleView(cliente)} className="h-8 rounded-lg text-xs"><Eye className="h-3.5 w-3.5 mr-1" />Ver</Button>
              )}
              {(isAdmin || permissions.canEditClient(cliente.id) || canEditSystem('clientes')) && (
                <Button variant="outline" size="sm" className="flex-1 h-8 rounded-lg text-xs" onClick={() => handleEdit(cliente)}><Edit className="h-3.5 w-3.5 mr-1" />Editar</Button>
              )}
              {(isAdmin || permissions.canDeleteClient(cliente.id) || canDeleteSystem('clientes')) && (
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDelete(cliente.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {clientes.length === 0 && (
        <div className="glass-card text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-display font-semibold mb-1">Nenhum cliente cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-4">Comece adicionando seu primeiro cliente.</p>
          <Button onClick={openNewDialog} className="gradient-primary border-0 rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Primeiro Cliente
          </Button>
        </div>
      )}
    </div>
  )
}