import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { PasswordStrength } from "@/components/ui/password-strength"
import { PasswordGeneratorSimple } from "@/components/ui/password-generator-simple"
import { Combobox } from "@/components/ui/combobox"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, KeyRound, Edit, Trash2, Eye, EyeOff, Copy, ExternalLink, Search, ChevronDown, ChevronRight, Wrench, Calendar, Clock, User, Download, FileText } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cofreSenhaSchema, type CofreSenhaFormData } from "@/lib/validations"
import { encryptPassword, decryptPassword, sanitizeFormData } from "@/lib/security"

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
  empresa_terceira_id?: string
}

interface EmpresaTerceira {
  id: string
  nome_empresa: string
}

interface GrupoCofre {
  id: string
  nome_grupo: string
}

interface Manutencao {
  id: string
  data_inicio: string
  hora_inicio: string
  data_fim: string | null
  hora_fim: string | null
  descricao: string | null
  status: string | null
  responsavel: string | null
  solicitante: string | null
  tempo_total: number | null
  tipos_manutencao?: { nome_tipo_manutencao: string }
  equipes?: { nome_equipe: string }
}

export default function CofreSenhas() {
  const { user } = useAuth()
  const permissions = usePermissions()
  
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
  const [manutencoesPorCliente, setManutencoesPorCliente] = useState<Record<string, Manutencao[]>>({})
  
  // Estados para exportação
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedPasswordsForExport, setSelectedPasswordsForExport] = useState<Set<string>>(new Set())
  const [selectedClientsForExport, setSelectedClientsForExport] = useState<Set<string>>(new Set())

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

  const fetchManutencoesPorCliente = async (clienteId: string) => {
    if (!user) return []

    try {
      const { data, error } = await supabase
        .from('manutencoes')
        .select(`
          *,
          tipos_manutencao(nome_tipo_manutencao),
          equipes(nome_equipe)
        `)
        .eq('cliente_id', clienteId)
        .order('data_inicio', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erro ao buscar manutenções:', error)
      return []
    }
  }

  const fetchData = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Buscar dados em paralelo
      const [senhasResult, clientesResult, empresasResult, gruposResult] = await Promise.all([
        supabase
          .from('cofre_senhas')
          .select(`
            id, nome_acesso, senha, login, url_acesso, descricao, grupo,
            cliente_id, empresa_terceira_id, created_at,
            clientes(nome_cliente),
            empresas_terceiras(nome_empresa)
          `)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('clientes')
          .select('id, nome_cliente, empresa_terceira_id'),
        supabase
          .from('empresas_terceiras')
          .select('id, nome_empresa'),
        supabase
          .from('grupos_cofre')
          .select('id, nome_grupo')
          .order('nome_grupo')
      ])

      if (senhasResult.error) throw senhasResult.error
      if (clientesResult.error) throw clientesResult.error
      if (empresasResult.error) throw empresasResult.error
      if (gruposResult.error) throw gruposResult.error

      // Atualizar estados de clientes, empresas e grupos primeiro
      setClientes(clientesResult.data || [])
      setEmpresas(empresasResult.data || [])
      setGruposSalvos(gruposResult.data || [])
      
      // Descriptografar senhas de forma otimizada
      const senhasData = senhasResult.data || []
      const senhasDescriptografadas = senhasData.map(senha => {
        try {
          return {
            ...senha,
            senha: decryptPassword(senha.senha, user.id)
          }
        } catch (error) {
          console.error(`Erro ao descriptografar senha ${senha.id}:`, error)
          return senha
        }
      })
      setSenhas(senhasDescriptografadas)
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
      
      // Sanitizar dados do formulário
      const sanitizedData = sanitizeFormData(data)
      
      // Salvar grupo se for novo
      if (sanitizedData.grupo && sanitizedData.grupo.trim() && !gruposSalvos.find(g => g.nome_grupo === sanitizedData.grupo.trim())) {
        try {
          await supabase
            .from('grupos_cofre')
            .insert([{ nome_grupo: sanitizedData.grupo.trim(), user_id: user.id }])
        } catch (error) {
          // Ignora erro se grupo já existe (constraint unique)
          console.log('Grupo já existe ou erro ao salvar:', error)
        }
      }

      // Criptografar senha antes de salvar
      const encryptedPassword = encryptPassword(sanitizedData.senha, user.id)

      const cleanData = {
        ...sanitizedData,
        senha: encryptedPassword,
        cliente_id: sanitizedData.cliente_id === "none" ? null : sanitizedData.cliente_id || null,
        empresa_terceira_id: sanitizedData.empresa_terceira_id === "none" ? null : sanitizedData.empresa_terceira_id || null,
        url_acesso: sanitizedData.url_acesso || null,
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

      // Fechar dialog e resetar form
      handleDialogChange(false)
      
      // Atualizar lista sem recarregar toda a página
      await fetchData()
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      toast.error("Erro ao salvar senha")
    }
  }

  const handleEdit = (senha: CofreSenha) => {
    setEditingId(senha.id)
    // A senha já está descriptografada no estado local
    form.reset({
      nome_acesso: senha.nome_acesso,
      senha: senha.senha, // Já descriptografada
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
    form.reset({
      nome_acesso: "",
      senha: "",
      login: "",
      url_acesso: "",
      descricao: "",
      grupo: "",
      cliente_id: "",
      empresa_terceira_id: "",
    })
    setOpen(true)
  }

  // Reset form when dialog closes
  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setEditingId(null)
      form.reset({
        nome_acesso: "",
        senha: "",
        login: "",
        url_acesso: "",
        descricao: "",
        grupo: "",
        cliente_id: "",
        empresa_terceira_id: "",
      })
    }
  }

  // Funções de exportação
  const togglePasswordExportSelection = (senhaId: string) => {
    const newSelected = new Set(selectedPasswordsForExport)
    if (newSelected.has(senhaId)) {
      newSelected.delete(senhaId)
    } else {
      newSelected.add(senhaId)
    }
    setSelectedPasswordsForExport(newSelected)
  }

  const toggleClientExportSelection = (clienteId: string) => {
    const newSelected = new Set(selectedClientsForExport)
    if (newSelected.has(clienteId)) {
      newSelected.delete(clienteId)
      // Remover todas as senhas desse cliente da seleção
      const senhasDoCliente = senhas.filter(s => s.cliente_id === clienteId || s.clientes?.nome_cliente === clienteId)
      senhasDoCliente.forEach(s => selectedPasswordsForExport.delete(s.id))
      setSelectedPasswordsForExport(new Set(selectedPasswordsForExport))
    } else {
      newSelected.add(clienteId)
      // Adicionar todas as senhas desse cliente à seleção
      const senhasDoCliente = senhas.filter(s => s.cliente_id === clienteId)
      senhasDoCliente.forEach(s => selectedPasswordsForExport.add(s.id))
      setSelectedPasswordsForExport(new Set(selectedPasswordsForExport))
    }
    setSelectedClientsForExport(newSelected)
  }

  const selectAllPasswords = () => {
    const allIds = senhasFiltradas.map(s => s.id)
    setSelectedPasswordsForExport(new Set(allIds))
    const allClientIds = [...new Set(senhasFiltradas.map(s => s.cliente_id).filter(Boolean))] as string[]
    setSelectedClientsForExport(new Set(allClientIds))
  }

  const deselectAllPasswords = () => {
    setSelectedPasswordsForExport(new Set())
    setSelectedClientsForExport(new Set())
  }

  const exportSelectedPasswords = (format: 'txt' | 'csv') => {
    const selectedSenhas = senhas.filter(s => selectedPasswordsForExport.has(s.id))
    
    if (selectedSenhas.length === 0) {
      toast.error("Selecione pelo menos uma senha para exportar")
      return
    }

    let content = ""
    const timestamp = new Date().toLocaleDateString('pt-BR')

    if (format === 'txt') {
      content = `=== COFRE DE SENHAS - EXPORTAÇÃO ===\n`
      content += `Data de Exportação: ${timestamp}\n`
      content += `Total de Senhas: ${selectedSenhas.length}\n`
      content += `${'='.repeat(50)}\n\n`

      // Agrupar por cliente
      const grouped = selectedSenhas.reduce((acc, senha) => {
        const clienteName = senha.clientes?.nome_cliente || senha.empresas_terceiras?.nome_empresa || 'Sem Cliente'
        if (!acc[clienteName]) acc[clienteName] = []
        acc[clienteName].push(senha)
        return acc
      }, {} as Record<string, CofreSenha[]>)

      Object.entries(grouped).forEach(([clienteName, senhasCliente]) => {
        content += `\n📁 ${clienteName}\n`
        content += `${'-'.repeat(40)}\n`
        
        senhasCliente.forEach(senha => {
          content += `\n  🔐 ${senha.nome_acesso}\n`
          if (senha.login) content += `     Login: ${senha.login}\n`
          content += `     Senha: ${senha.senha}\n`
          if (senha.url_acesso) content += `     URL: ${senha.url_acesso}\n`
          if (senha.grupo) content += `     Grupo: ${senha.grupo}\n`
          if (senha.descricao) content += `     Descrição: ${senha.descricao}\n`
        })
      })

      // Adicionar publicidade no final
      content += `\n\n${'='.repeat(50)}\n`
      content += `Gerenciado por Maintly - Sistema de Gestão de Manutenções\n`
      content += `🌐 https://maintly.chromotech.com.br/\n`
      content += `${'='.repeat(50)}\n`
    } else {
      // CSV format com publicidade no cabeçalho
      content = "=== Gerenciado por Maintly - https://maintly.chromotech.com.br/ ===\n"
      content += "Cliente,Nome do Acesso,Login,Senha,URL,Grupo,Descrição\n"
      selectedSenhas.forEach(senha => {
        const clienteName = senha.clientes?.nome_cliente || senha.empresas_terceiras?.nome_empresa || 'Sem Cliente'
        const escapeCsv = (str: string | null) => {
          if (!str) return ''
          return `"${str.replace(/"/g, '""')}"`
        }
        content += `${escapeCsv(clienteName)},${escapeCsv(senha.nome_acesso)},${escapeCsv(senha.login)},${escapeCsv(senha.senha)},${escapeCsv(senha.url_acesso)},${escapeCsv(senha.grupo)},${escapeCsv(senha.descricao)}\n`
      })
      // Adicionar publicidade no final do CSV
      content += `\n"Gerenciado por Maintly - Sistema de Gestão de Manutenções","https://maintly.chromotech.com.br/","","","","",""\n`
    }

    // Download do arquivo
    const blob = new Blob([content], { type: format === 'txt' ? 'text/plain' : 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `senhas_export_${new Date().toISOString().split('T')[0]}.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success(`${selectedSenhas.length} senha(s) exportada(s) com sucesso!`)
    setExportDialogOpen(false)
    deselectAllPasswords()
  }
  const senhasFiltradas = senhas.filter(senha => {
    // Verificar permissões se não for admin
    if (!permissions.isAdmin && senha.cliente_id) {
      if (!permissions.canViewClient(senha.cliente_id)) {
        return false
      }
    }
    
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
        <div className="flex gap-2">
          {/* Botão de Exportação */}
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Senhas
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Exportar Senhas
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Controles de seleção */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedPasswordsForExport.size} senha(s) selecionada(s)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllPasswords}>
                      Selecionar Todas
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllPasswords}>
                      Limpar Seleção
                    </Button>
                  </div>
                </div>

                {/* Lista de clientes e senhas para seleção */}
                <div className="max-h-[400px] overflow-y-auto space-y-4 border rounded-lg p-3">
                  {Object.entries(senhasAgrupadasPorCliente).map(([nomeCliente, dadosCliente]) => (
                    <div key={nomeCliente} className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Checkbox
                          checked={dadosCliente.senhas.every(s => selectedPasswordsForExport.has(s.id))}
                          onCheckedChange={() => {
                            const allSelected = dadosCliente.senhas.every(s => selectedPasswordsForExport.has(s.id))
                            const newSelected = new Set(selectedPasswordsForExport)
                            if (allSelected) {
                              dadosCliente.senhas.forEach(s => newSelected.delete(s.id))
                            } else {
                              dadosCliente.senhas.forEach(s => newSelected.add(s.id))
                            }
                            setSelectedPasswordsForExport(newSelected)
                          }}
                        />
                        <KeyRound className="h-4 w-4 text-primary" />
                        <span className="font-medium">{nomeCliente}</span>
                        <span className="text-xs text-muted-foreground">
                          ({dadosCliente.senhas.length} senha{dadosCliente.senhas.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      
                      <div className="ml-6 space-y-1">
                        {dadosCliente.senhas.map(senha => (
                          <div 
                            key={senha.id} 
                            className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded cursor-pointer"
                            onClick={() => togglePasswordExportSelection(senha.id)}
                          >
                            <Checkbox
                              checked={selectedPasswordsForExport.has(senha.id)}
                              onCheckedChange={() => togglePasswordExportSelection(senha.id)}
                            />
                            <span className="text-sm">{senha.nome_acesso}</span>
                            {senha.login && (
                              <span className="text-xs text-muted-foreground">({senha.login})</span>
                            )}
                            {senha.grupo && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                {senha.grupo}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botões de exportação */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => exportSelectedPasswords('txt')}
                    disabled={selectedPasswordsForExport.size === 0}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Exportar TXT
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => exportSelectedPasswords('csv')}
                    disabled={selectedPasswordsForExport.size === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Nova Senha
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
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
                          <div className="relative">
                            <Input 
                              type={visiblePasswords.has('form-password') ? "text" : "password"}
                              placeholder="••••••••" 
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => togglePasswordVisibility('form-password')}
                            >
                              {visiblePasswords.has('form-password') ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <PasswordStrength password={field.value} />
                          <PasswordGeneratorSimple onPasswordGenerated={(password) => form.setValue('senha', password)} />
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
                      <FormControl>
                        <Combobox
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          options={gruposSalvos.map(grupo => ({
                            value: grupo.nome_grupo,
                            label: grupo.nome_grupo
                          }))}
                          placeholder="Selecione ou digite um grupo..."
                          allowCustom={true}
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
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          // Auto-preencher empresa terceira quando cliente é selecionado
                          if (value && value !== "none") {
                            const cliente = clientes.find(c => c.id === value);
                            if (cliente?.empresa_terceira_id) {
                              form.setValue('empresa_terceira_id', cliente.empresa_terceira_id);
                            }
                          }
                        }} value={field.value || ""}>
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
                  render={({ field }) => {
                    const clienteSelecionado = form.watch('cliente_id');
                    const cliente = clientes.find(c => c.id === clienteSelecionado);
                    const isDisabled = clienteSelecionado && clienteSelecionado !== "none" && cliente?.empresa_terceira_id;
                    
                    return (
                      <FormItem>
                        <FormLabel>Empresa Terceira (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={!!isDisabled}>
                          <FormControl>
                            <SelectTrigger className={isDisabled ? "opacity-60" : ""}>
                              <SelectValue placeholder={isDisabled ? "Definido pelo cliente" : "Selecione..."} />
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
                    )
                  }}
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
              onClick={async () => {
                const novoExpandido = clienteExpandido === nomeCliente ? null : nomeCliente
                setClienteExpandido(novoExpandido)
                
                // Carregar manutenções quando expandir e o cliente tem ID
                if (novoExpandido && dadosCliente.clienteId && !dadosCliente.isEmpresa) {
                  const manutencoes = await fetchManutencoesPorCliente(dadosCliente.clienteId)
                  setManutencoesPorCliente(prev => ({
                    ...prev,
                    [dadosCliente.clienteId]: manutencoes
                  }))
                }
              }}
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
              <div className="ml-6 space-y-6">
                {/* Seção de Senhas */}
                <div>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary" />
                    Senhas ({dadosCliente.senhas.length})
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                    
                     <CardContent className="space-y-3">
                       {senha.login && (
                         <div className="space-y-1">
                           <span className="text-xs font-medium text-muted-foreground">Login:</span>
                           <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                             <span className="text-sm flex-1 truncate">{senha.login}</span>
                             <Button
                               size="sm"
                               variant="ghost"
                               onClick={() => copyToClipboard(senha.login!)}
                               className="h-6 w-6 p-0"
                             >
                               <Copy className="h-3 w-3" />
                             </Button>
                           </div>
                         </div>
                       )}

                       <div className="space-y-1">
                         <span className="text-xs font-medium text-muted-foreground">Senha:</span>
                         <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                           <span className="text-sm font-mono flex-1 truncate">
                             {visiblePasswords.has(senha.id) ? senha.senha : "••••••••"}
                           </span>
                           <Button
                             size="sm"
                             variant="ghost"
                             onClick={() => togglePasswordVisibility(senha.id)}
                             className="h-6 w-6 p-0"
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
                             className="h-6 w-6 p-0"
                           >
                             <Copy className="h-3 w-3" />
                           </Button>
                         </div>
                       </div>

                       {senha.url_acesso && (
                         <div className="space-y-1">
                           <span className="text-xs font-medium text-muted-foreground">URL:</span>
                           <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                             <span className="text-sm flex-1 truncate">{senha.url_acesso}</span>
                             <Button
                               size="sm"
                               variant="ghost"
                               onClick={() => window.open(senha.url_acesso!, '_blank')}
                               className="h-6 w-6 p-0"
                             >
                               <ExternalLink className="h-3 w-3" />
                             </Button>
                             <Button
                               size="sm"
                               variant="ghost"
                               onClick={() => copyToClipboard(senha.url_acesso!)}
                               className="h-6 w-6 p-0"
                             >
                               <Copy className="h-3 w-3" />
                             </Button>
                           </div>
                         </div>
                       )}

                       {senha.descricao && (
                         <div className="space-y-1">
                           <span className="text-xs font-medium text-muted-foreground">Descrição:</span>
                           <div className="p-2 bg-muted/30 rounded">
                             <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                               {senha.descricao}
                             </p>
                           </div>
                         </div>
                       )}

                      <div className="flex gap-2 pt-2">
                        {(permissions.isAdmin || permissions.canEditClient(senha.cliente_id || '')) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleEdit(senha)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        )}
                        {(permissions.isAdmin || permissions.canEditClient(senha.cliente_id || '')) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(senha.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                    ))}
                  </div>
                </div>

                {/* Seção de Histórico de Manutenções */}
                {dadosCliente.clienteId && !dadosCliente.isEmpresa && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-primary" />
                      Histórico de Manutenções ({manutencoesPorCliente[dadosCliente.clienteId]?.length || 0})
                    </h4>
                    
                    {manutencoesPorCliente[dadosCliente.clienteId]?.length > 0 ? (
                      <div className="space-y-3">
                        {manutencoesPorCliente[dadosCliente.clienteId].map((manutencao) => (
                          <Card key={manutencao.id} className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      {new Date(manutencao.data_inicio).toLocaleDateString('pt-BR')}
                                    </span>
                                    <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                                    <span className="text-sm">
                                      {manutencao.hora_inicio}
                                      {manutencao.data_fim && manutencao.hora_fim && (
                                        ` - ${manutencao.hora_fim}`
                                      )}
                                    </span>
                                  </div>
                                  
                                  {manutencao.tipos_manutencao?.nome_tipo_manutencao && (
                                    <div className="text-sm">
                                      <span className="font-medium">Tipo:</span> {manutencao.tipos_manutencao.nome_tipo_manutencao}
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      manutencao.status === 'Concluída' ? 'bg-green-100 text-green-800' :
                                      manutencao.status === 'Em andamento' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {manutencao.status || 'Em andamento'}
                                    </span>
                                    
                                    {manutencao.tempo_total && (
                                      <span className="text-xs text-muted-foreground">
                                        {Math.floor(manutencao.tempo_total / 60)}h {manutencao.tempo_total % 60}min
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  {manutencao.responsavel && (
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm">
                                        <span className="font-medium">Responsável:</span> {manutencao.responsavel}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {manutencao.solicitante && (
                                    <div className="text-sm">
                                      <span className="font-medium">Solicitante:</span> {manutencao.solicitante}
                                    </div>
                                  )}
                                  
                                  {manutencao.equipes?.nome_equipe && (
                                    <div className="text-sm">
                                      <span className="font-medium">Equipe:</span> {manutencao.equipes.nome_equipe}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {manutencao.descricao && (
                                <div className="mt-3 p-2 bg-muted/30 rounded text-sm">
                                  <span className="font-medium">Descrição:</span>
                                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                                    {manutencao.descricao}
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-8">
                          <Wrench className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground text-center">
                            Nenhuma manutenção encontrada para este cliente.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
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