import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Plus, Building2, MapPin, Phone, Mail, Edit, Trash2 } from "lucide-react"
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
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [empresas, setEmpresas] = useState<EmpresaTerceira[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

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
      const [clientesResult, empresasResult] = await Promise.all([
        supabase
          .from('clientes')
          .select('*, empresas_terceiras(nome_empresa)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
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
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e contratos de manutenção
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
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
                      <FormLabel>Empresa Terceira</FormLabel>
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
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {clientes.filter(cliente => permissions.isAdmin || permissions.canViewClient(cliente.id)).map((cliente) => (
          <Card key={cliente.id} className="border-0 shadow-elegant hover:shadow-glow transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{cliente.nome_cliente}</CardTitle>
                    <p className="text-sm text-muted-foreground">{cliente.cnpj}</p>
                  </div>
                </div>
                <Badge variant="default" className="bg-success text-success-foreground">
                  Ativo
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {cliente.endereco && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{cliente.endereco}</span>
                  </div>
                )}
                {cliente.telefone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{cliente.telefone}</span>
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{cliente.email}</span>
                  </div>
                )}
              </div>

              {cliente.empresas_terceiras && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Empresa Terceira</h4>
                  <p className="text-xs text-muted-foreground">{cliente.empresas_terceiras.nome_empresa}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {(permissions.isAdmin || permissions.canEditClient(cliente.id)) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEdit(cliente)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
                {(permissions.isAdmin || permissions.canEditClient(cliente.id)) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(cliente.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {clientes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum cliente cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece adicionando seu primeiro cliente para gerenciar suas manutenções.
            </p>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Cliente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}