import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Shield, ChevronDown, ChevronRight, Check, X, Key } from "lucide-react"
import { toast } from "sonner"

interface PasswordPermission {
  id: string
  user_id: string
  senha_id: string
  can_view: boolean
  can_edit: boolean
}

interface Senha {
  id: string
  nome_acesso: string
  login?: string
  cliente_id?: string
}

interface Cliente {
  id: string
  nome_cliente: string
}

interface ClientPermission {
  cliente_id: string
  can_view: boolean
}

interface PasswordPermissionsTabProps {
  selectedProfile: {
    user_id: string
    is_admin: boolean
    display_name: string | null
  } | null
  clientPermissions: ClientPermission[]
  clientes: Cliente[]
}

export function PasswordPermissionsTab({ 
  selectedProfile, 
  clientPermissions, 
  clientes 
}: PasswordPermissionsTabProps) {
  const [passwordPermissions, setPasswordPermissions] = useState<PasswordPermission[]>([])
  const [senhasPorCliente, setSenhasPorCliente] = useState<Record<string, Senha[]>>({})
  const [expandedClientes, setExpandedClientes] = useState<Set<string>>(new Set())
  const [loadingClientes, setLoadingClientes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (selectedProfile && !selectedProfile.is_admin) {
      fetchPasswordPermissions(selectedProfile.user_id)
    }
  }, [selectedProfile])

  const fetchPasswordPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_password_permissions')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error
      setPasswordPermissions(data || [])
    } catch (error) {
      console.error('Erro ao buscar permissões de senhas:', error)
    }
  }

  const fetchSenhasByCliente = async (clienteId: string) => {
    if (senhasPorCliente[clienteId]) return // Já carregado

    setLoadingClientes(prev => new Set(prev).add(clienteId))
    
    try {
      const { data, error } = await supabase
        .from('cofre_senhas')
        .select('id, nome_acesso, login, cliente_id')
        .eq('cliente_id', clienteId)
        .order('nome_acesso')

      if (error) throw error
      setSenhasPorCliente(prev => ({ ...prev, [clienteId]: data || [] }))
    } catch (error) {
      console.error('Erro ao buscar senhas:', error)
    } finally {
      setLoadingClientes(prev => {
        const newSet = new Set(prev)
        newSet.delete(clienteId)
        return newSet
      })
    }
  }

  const toggleCliente = (clienteId: string) => {
    setExpandedClientes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clienteId)) {
        newSet.delete(clienteId)
      } else {
        newSet.add(clienteId)
        fetchSenhasByCliente(clienteId)
      }
      return newSet
    })
  }

  const handlePasswordPermissionChange = async (
    senhaId: string, 
    permission: 'can_view' | 'can_edit', 
    value: boolean
  ) => {
    if (!selectedProfile) return

    try {
      const existingPermission = passwordPermissions.find(p => p.senha_id === senhaId)

      if (existingPermission) {
        const updateData: any = { [permission]: value }
        
        // Se desmarcar can_view, desmarcar can_edit também
        if (permission === 'can_view' && !value) {
          updateData.can_edit = false
        }
        // Se marcar can_edit, marcar can_view também
        if (permission === 'can_edit' && value) {
          updateData.can_view = true
        }

        const { error } = await supabase
          .from('user_password_permissions')
          .update(updateData)
          .eq('id', existingPermission.id)

        if (error) throw error
      } else {
        const newPermission = {
          user_id: selectedProfile.user_id,
          senha_id: senhaId,
          can_view: permission === 'can_view' ? value : (permission === 'can_edit' && value),
          can_edit: permission === 'can_edit' ? value : false
        }

        const { error } = await supabase
          .from('user_password_permissions')
          .insert(newPermission)

        if (error) throw error
      }

      fetchPasswordPermissions(selectedProfile.user_id)
      toast.success('Permissão de senha atualizada!')
    } catch (error: any) {
      console.error('Erro ao atualizar permissão de senha:', error)
      toast.error('Erro ao atualizar permissão')
    }
  }

  const toggleAllSenhasForCliente = async (clienteId: string, enable: boolean) => {
    if (!selectedProfile) return

    const senhas = senhasPorCliente[clienteId] || []
    
    try {
      for (const senha of senhas) {
        const existingPermission = passwordPermissions.find(p => p.senha_id === senha.id)

        if (existingPermission) {
          await supabase
            .from('user_password_permissions')
            .update({ can_view: enable, can_edit: enable })
            .eq('id', existingPermission.id)
        } else if (enable) {
          await supabase
            .from('user_password_permissions')
            .insert({
              user_id: selectedProfile.user_id,
              senha_id: senha.id,
              can_view: enable,
              can_edit: enable
            })
        }
      }

      fetchPasswordPermissions(selectedProfile.user_id)
      toast.success(enable ? 'Todas as senhas habilitadas!' : 'Todas as senhas desabilitadas!')
    } catch (error: any) {
      console.error('Erro ao atualizar permissões:', error)
      toast.error('Erro ao atualizar permissões')
    }
  }

  // Filtrar apenas clientes que o usuário tem permissão de visualização
  const clientesComPermissao = clientes.filter(cliente => {
    const permission = clientPermissions.find(p => p.cliente_id === cliente.id)
    return permission?.can_view
  })

  if (selectedProfile?.is_admin) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            Este usuário é administrador e tem acesso a todas as senhas de todos os clientes
          </span>
        </div>
      </div>
    )
  }

  if (clientesComPermissao.length === 0) {
    return (
      <div className="text-center py-8">
        <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          Este usuário não tem permissão para visualizar nenhum cliente.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Configure as permissões na aba "Clientes" primeiro.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Expanda cada cliente para definir quais senhas específicas este usuário pode visualizar ou editar.
      </p>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {clientesComPermissao.map((cliente) => {
          const isExpanded = expandedClientes.has(cliente.id)
          const isLoading = loadingClientes.has(cliente.id)
          const senhas = senhasPorCliente[cliente.id] || []
          
          return (
            <Collapsible key={cliente.id} open={isExpanded} onOpenChange={() => toggleCliente(cliente.id)}>
              <div className="border rounded-lg">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <Key className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{cliente.nome_cliente}</span>
                  </div>
                  {isExpanded && senhas.length > 0 && (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAllSenhasForCliente(cliente.id, true)}
                      >
                        <Check className="w-3 h-3 mr-1" /> Todas
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAllSenhasForCliente(cliente.id, false)}
                      >
                        <X className="w-3 h-3 mr-1" /> Nenhuma
                      </Button>
                    </div>
                  )}
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-2 border-t">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                        <span className="ml-2 text-sm text-muted-foreground">Carregando senhas...</span>
                      </div>
                    ) : senhas.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Nenhuma senha cadastrada para este cliente.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {senhas.map((senha) => {
                          const permission = passwordPermissions.find(p => p.senha_id === senha.id)
                          
                          return (
                            <div key={senha.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div>
                                <p className="font-medium text-sm">{senha.nome_acesso}</p>
                                {senha.login && (
                                  <p className="text-xs text-muted-foreground">Login: {senha.login}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`senha-view-${senha.id}`}
                                    checked={permission?.can_view || false}
                                    onCheckedChange={(checked) => 
                                      handlePasswordPermissionChange(senha.id, 'can_view', !!checked)
                                    }
                                  />
                                  <Label htmlFor={`senha-view-${senha.id}`} className="text-xs">Ver</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`senha-edit-${senha.id}`}
                                    checked={permission?.can_edit || false}
                                    onCheckedChange={(checked) => 
                                      handlePasswordPermissionChange(senha.id, 'can_edit', !!checked)
                                    }
                                  />
                                  <Label htmlFor={`senha-edit-${senha.id}`} className="text-xs">Editar</Label>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}
