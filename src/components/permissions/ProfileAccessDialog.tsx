import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Shield, Check, X, Building, Key, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"

interface ProfileAccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: {
    id: string
    nome_perfil: string
    is_admin_profile: boolean
    client_access: any[]
    empresa_access: any[]
    password_access: any[]
  } | null
  onSaved: () => void
}

interface Cliente {
  id: string
  nome_cliente: string
}

interface Empresa {
  id: string
  nome_empresa: string
}

interface Senha {
  id: string
  nome_acesso: string
  login?: string
  cliente_id?: string
}

export function ProfileAccessDialog({ open, onOpenChange, profile, onSaved }: ProfileAccessDialogProps) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [clientAccess, setClientAccess] = useState<any[]>([])
  const [empresaAccess, setEmpresaAccess] = useState<any[]>([])
  const [passwordAccess, setPasswordAccess] = useState<any[]>([])
  const [senhasPorCliente, setSenhasPorCliente] = useState<Record<string, Senha[]>>({})
  const [expandedClientes, setExpandedClientes] = useState<Set<string>>(new Set())
  const [loadingClientes, setLoadingClientes] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && profile) {
      loadData()
    }
  }, [open, profile])

  const loadData = async () => {
    if (!profile) return

    const [clientesRes, empresasRes] = await Promise.all([
      supabase.from('clientes').select('id, nome_cliente').order('nome_cliente'),
      supabase.from('empresas_terceiras').select('id, nome_empresa').order('nome_empresa')
    ])

    setClientes(clientesRes.data || [])
    setEmpresas(empresasRes.data || [])
    setClientAccess(Array.isArray(profile.client_access) ? [...profile.client_access] : [])
    setEmpresaAccess(Array.isArray(profile.empresa_access) ? [...profile.empresa_access] : [])
    setPasswordAccess(Array.isArray(profile.password_access) ? [...profile.password_access] : [])
    setSenhasPorCliente({})
    setExpandedClientes(new Set())
  }

  const getClientPerm = (clienteId: string) => {
    return clientAccess.find((p: any) => p.cliente_id === clienteId) || null
  }

  const setClientPerm = (clienteId: string, perm: string, value: boolean) => {
    setClientAccess(prev => {
      const existing = prev.find((p: any) => p.cliente_id === clienteId)
      if (existing) {
        const updated = { ...existing, [perm]: value }
        if (perm === 'can_view' && !value) {
          updated.can_edit = false
          updated.can_create = false
          updated.can_delete = false
        } else if (perm !== 'can_view' && value) {
          updated.can_view = true
        }
        return prev.map((p: any) => p.cliente_id === clienteId ? updated : p)
      } else {
        const newPerm: any = { cliente_id: clienteId, can_view: false, can_edit: false, can_create: false, can_delete: false }
        newPerm[perm] = value
        if (perm !== 'can_view' && value) newPerm.can_view = true
        return [...prev, newPerm]
      }
    })
  }

  const toggleAllClients = (enable: boolean) => {
    if (enable) {
      setClientAccess(clientes.map(c => ({
        cliente_id: c.id, can_view: true, can_edit: true, can_create: true, can_delete: true
      })))
    } else {
      setClientAccess([])
    }
  }

  const getEmpresaPerm = (empresaId: string) => {
    return empresaAccess.find((p: any) => p.empresa_terceira_id === empresaId) || null
  }

  const setEmpresaPerm = (empresaId: string, perm: string, value: boolean) => {
    setEmpresaAccess(prev => {
      const existing = prev.find((p: any) => p.empresa_terceira_id === empresaId)
      if (existing) {
        const updated = { ...existing, [perm]: value }
        if (perm === 'can_view' && !value) {
          updated.can_edit = false
          updated.can_delete = false
          updated.can_create_manutencao = false
        } else if (perm !== 'can_view' && value) {
          updated.can_view = true
        }
        return prev.map((p: any) => p.empresa_terceira_id === empresaId ? updated : p)
      } else {
        const newPerm: any = {
          empresa_terceira_id: empresaId, can_view: false, can_edit: false,
          can_delete: false, can_create_manutencao: false
        }
        newPerm[perm] = value
        if (perm !== 'can_view' && value) newPerm.can_view = true
        return [...prev, newPerm]
      }
    })
  }

  const toggleAllEmpresas = (enable: boolean) => {
    if (enable) {
      setEmpresaAccess(empresas.map(e => ({
        empresa_terceira_id: e.id, can_view: true, can_edit: true,
        can_delete: true, can_create_manutencao: true
      })))
    } else {
      setEmpresaAccess([])
    }
  }

  // Password access
  const fetchSenhasByCliente = async (clienteId: string) => {
    if (senhasPorCliente[clienteId]) return
    setLoadingClientes(prev => new Set(prev).add(clienteId))
    try {
      const { data } = await supabase
        .from('cofre_senhas')
        .select('id, nome_acesso, login, cliente_id')
        .eq('cliente_id', clienteId)
        .order('nome_acesso')
      setSenhasPorCliente(prev => ({ ...prev, [clienteId]: data || [] }))
    } finally {
      setLoadingClientes(prev => {
        const s = new Set(prev)
        s.delete(clienteId)
        return s
      })
    }
  }

  const toggleCliente = (clienteId: string) => {
    setExpandedClientes(prev => {
      const s = new Set(prev)
      if (s.has(clienteId)) { s.delete(clienteId) } else { s.add(clienteId); fetchSenhasByCliente(clienteId) }
      return s
    })
  }

  const getPasswordPerm = (senhaId: string) => {
    return passwordAccess.find((p: any) => p.senha_id === senhaId) || null
  }

  const setPasswordPerm = (senhaId: string, perm: string, value: boolean) => {
    setPasswordAccess(prev => {
      const existing = prev.find((p: any) => p.senha_id === senhaId)
      if (existing) {
        const updated = { ...existing, [perm]: value }
        if (perm === 'can_view' && !value) updated.can_edit = false
        if (perm === 'can_edit' && value) updated.can_view = true
        return prev.map((p: any) => p.senha_id === senhaId ? updated : p)
      } else {
        const newPerm: any = { senha_id: senhaId, can_view: false, can_edit: false }
        newPerm[perm] = value
        if (perm === 'can_edit' && value) newPerm.can_view = true
        return [...prev, newPerm]
      }
    })
  }

  const toggleAllSenhasForCliente = (clienteId: string, enable: boolean) => {
    const senhas = senhasPorCliente[clienteId] || []
    if (enable) {
      setPasswordAccess(prev => {
        let updated = [...prev]
        senhas.forEach(s => {
          const idx = updated.findIndex((p: any) => p.senha_id === s.id)
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], can_view: true, can_edit: true }
          } else {
            updated.push({ senha_id: s.id, can_view: true, can_edit: true })
          }
        })
        return updated
      })
    } else {
      setPasswordAccess(prev => prev.filter((p: any) => !senhas.some(s => s.id === p.senha_id)))
    }
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('permission_profiles')
        .update({
          client_access: clientAccess,
          empresa_access: empresaAccess,
          password_access: passwordAccess
        })
        .eq('id', profile.id)

      if (error) throw error

      // Sync to all users assigned to this profile
      await syncPermissionsToUsers(profile.id)

      toast.success('Acessos do perfil salvos e sincronizados!')
      onSaved()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Erro ao salvar acessos:', error)
      toast.error('Erro ao salvar acessos: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const syncPermissionsToUsers = async (profileId: string) => {
    // Get all users with this profile
    const { data: users } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('permission_profile_id', profileId)

    if (!users || users.length === 0) return

    for (const u of users) {
      // Sync client permissions
      await supabase.from('user_client_permissions').delete().eq('user_id', u.user_id)
      if (clientAccess.length > 0) {
        const rows = clientAccess.map((ca: any) => ({
          user_id: u.user_id,
          cliente_id: ca.cliente_id,
          can_view: ca.can_view || false,
          can_edit: ca.can_edit || false,
          can_create: ca.can_create || false,
          can_delete: ca.can_delete || false
        }))
        await supabase.from('user_client_permissions').insert(rows)
      }

      // Sync empresa permissions
      await supabase.from('user_empresa_permissions').delete().eq('user_id', u.user_id)
      if (empresaAccess.length > 0) {
        const rows = empresaAccess.map((ea: any) => ({
          user_id: u.user_id,
          empresa_terceira_id: ea.empresa_terceira_id,
          can_view: ea.can_view || false,
          can_edit: ea.can_edit || false,
          can_delete: ea.can_delete || false,
          can_create_manutencao: ea.can_create_manutencao || false
        }))
        await supabase.from('user_empresa_permissions').insert(rows)
      }

      // Sync password permissions
      await supabase.from('user_password_permissions').delete().eq('user_id', u.user_id)
      if (passwordAccess.length > 0) {
        const rows = passwordAccess.map((pa: any) => ({
          user_id: u.user_id,
          senha_id: pa.senha_id,
          can_view: pa.can_view || false,
          can_edit: pa.can_edit || false
        }))
        await supabase.from('user_password_permissions').insert(rows)
      }
    }
  }

  // Clients with view access for password tab
  const clientesComView = clientes.filter(c => {
    const perm = getClientPerm(c.id)
    return perm?.can_view
  })

  if (!profile) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Acessos do Perfil: {profile.nome_perfil}</DialogTitle>
          <DialogDescription>
            Configure quais clientes, empresas e senhas os usuários deste perfil podem acessar
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="clientes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="empresas">Empresas</TabsTrigger>
            <TabsTrigger value="senhas">Senhas</TabsTrigger>
          </TabsList>

          {/* CLIENTES TAB */}
          <TabsContent value="clientes" className="space-y-4">
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={() => toggleAllClients(true)}>
                <Check className="w-4 h-4 mr-2" /> Marcar Todos
              </Button>
              <Button variant="outline" size="sm" onClick={() => toggleAllClients(false)}>
                <X className="w-4 h-4 mr-2" /> Desmarcar Todos
              </Button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {clientes.map(cliente => {
                const perm = getClientPerm(cliente.id)
                return (
                  <div key={cliente.id} className="p-3 border rounded-lg">
                    <p className="font-medium mb-3">{cliente.nome_cliente}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(['can_view', 'can_edit', 'can_create', 'can_delete'] as const).map(p => {
                        const labels = { can_view: 'Ver', can_edit: 'Editar', can_create: 'Criar', can_delete: 'Excluir' }
                        return (
                          <div key={p} className="flex items-center space-x-2">
                            <Checkbox
                              id={`ca-${p}-${cliente.id}`}
                              checked={perm?.[p] || false}
                              onCheckedChange={(checked) => setClientPerm(cliente.id, p, !!checked)}
                            />
                            <Label htmlFor={`ca-${p}-${cliente.id}`}>{labels[p]}</Label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* EMPRESAS TAB */}
          <TabsContent value="empresas" className="space-y-4">
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={() => toggleAllEmpresas(true)}>
                <Check className="w-4 h-4 mr-2" /> Marcar Todos
              </Button>
              <Button variant="outline" size="sm" onClick={() => toggleAllEmpresas(false)}>
                <X className="w-4 h-4 mr-2" /> Desmarcar Todos
              </Button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {empresas.map(empresa => {
                const perm = getEmpresaPerm(empresa.id)
                return (
                  <div key={empresa.id} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">{empresa.nome_empresa}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { key: 'can_view', label: 'Ver' },
                        { key: 'can_edit', label: 'Editar' },
                        { key: 'can_create_manutencao', label: 'Criar Manutenção' },
                        { key: 'can_delete', label: 'Excluir' }
                      ].map(p => (
                        <div key={p.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ea-${p.key}-${empresa.id}`}
                            checked={perm?.[p.key] || false}
                            onCheckedChange={(checked) => setEmpresaPerm(empresa.id, p.key, !!checked)}
                          />
                          <Label htmlFor={`ea-${p.key}-${empresa.id}`}>{p.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* SENHAS TAB */}
          <TabsContent value="senhas" className="space-y-4">
            {clientesComView.length === 0 ? (
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum cliente com acesso de visualização.</p>
                <p className="text-sm text-muted-foreground mt-2">Configure na aba "Clientes" primeiro.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {clientesComView.map(cliente => {
                  const isExpanded = expandedClientes.has(cliente.id)
                  const isLoading = loadingClientes.has(cliente.id)
                  const senhas = senhasPorCliente[cliente.id] || []

                  return (
                    <Collapsible key={cliente.id} open={isExpanded} onOpenChange={() => toggleCliente(cliente.id)}>
                      <div className="border rounded-lg">
                        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <Key className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{cliente.nome_cliente}</span>
                          </div>
                          {isExpanded && senhas.length > 0 && (
                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                              <Button variant="outline" size="sm" onClick={() => toggleAllSenhasForCliente(cliente.id, true)}>
                                <Check className="w-3 h-3 mr-1" /> Todas
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => toggleAllSenhasForCliente(cliente.id, false)}>
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
                              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma senha cadastrada para este cliente.</p>
                            ) : (
                              <div className="space-y-3">
                                {senhas.map(senha => {
                                  const perm = getPasswordPerm(senha.id)
                                  return (
                                    <div key={senha.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                      <div>
                                        <p className="font-medium text-sm">{senha.nome_acesso}</p>
                                        {senha.login && <p className="text-xs text-muted-foreground">Login: {senha.login}</p>}
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`pa-view-${senha.id}`}
                                            checked={perm?.can_view || false}
                                            onCheckedChange={(checked) => setPasswordPerm(senha.id, 'can_view', !!checked)}
                                          />
                                          <Label htmlFor={`pa-view-${senha.id}`} className="text-xs">Ver</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`pa-edit-${senha.id}`}
                                            checked={perm?.can_edit || false}
                                            onCheckedChange={(checked) => setPasswordPerm(senha.id, 'can_edit', !!checked)}
                                          />
                                          <Label htmlFor={`pa-edit-${senha.id}`} className="text-xs">Editar</Label>
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
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Acessos'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
