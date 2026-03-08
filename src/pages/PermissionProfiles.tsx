import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Shield, Check, X, Users, Key } from "lucide-react"
import { PasswordPermissionsTab } from "@/components/permissions/PasswordPermissionsTab"
import { EmpresaPermissionsTab } from "@/components/permissions/EmpresaPermissionsTab"
import { toast } from "sonner"

interface PermissionProfile {
  id: string
  nome_perfil: string
  system_permissions: Record<string, any>
  client_permissions_mode: string
  empresa_permissions_mode: string
  is_admin_profile: boolean
  created_at: string
}

interface UserProfile {
  id: string
  user_id: string
  display_name: string | null
  email: string | null
  is_admin: boolean
  permission_profile_id: string | null
}

interface ClientPermission {
  id: string
  user_id: string
  cliente_id: string
  can_view: boolean
  can_edit: boolean
  can_create: boolean
  can_delete: boolean
  clientes?: { nome_cliente: string }
}

interface Cliente {
  id: string
  nome_cliente: string
}

const SYSTEM_RESOURCES = [
  { key: 'manutencoes', label: 'Manutenções' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'empresas_terceiras', label: 'Empresas Terceiras' },
  { key: 'equipes', label: 'Equipes' },
  { key: 'tipos_manutencao', label: 'Tipos de Manutenção' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'cofre_senhas', label: 'Cofre de Senhas' },
  { key: 'perfis_usuarios', label: 'Usuários' },
  { key: 'permissoes', label: 'Perfil de Permissões' },
]

const PERMISSION_TYPES = [
  { key: 'can_view', label: 'Ver Menu' },
  { key: 'can_view_details', label: 'Ver Detalhes' },
  { key: 'can_edit', label: 'Editar' },
  { key: 'can_create', label: 'Criar' },
  { key: 'can_delete', label: 'Excluir' },
]

const allPermissionsEnabled = () => {
  const perms: Record<string, any> = {}
  SYSTEM_RESOURCES.forEach(r => {
    perms[r.key] = {}
    PERMISSION_TYPES.forEach(p => {
      perms[r.key][p.key] = true
    })
  })
  return perms
}

const emptyPermissions = () => {
  const perms: Record<string, any> = {}
  SYSTEM_RESOURCES.forEach(r => {
    perms[r.key] = {}
    PERMISSION_TYPES.forEach(p => {
      perms[r.key][p.key] = false
    })
  })
  return perms
}

export default function PermissionProfiles() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<PermissionProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<PermissionProfile | null>(null)
  const [formName, setFormName] = useState("")
  const [formIsAdmin, setFormIsAdmin] = useState(false)
  const [formPermissions, setFormPermissions] = useState<Record<string, any>>(emptyPermissions())
  const [usersCount, setUsersCount] = useState<Record<string, number>>({})

  // Acessos state
  const [accessDialogOpen, setAccessDialogOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clientPermissions, setClientPermissions] = useState<ClientPermission[]>([])

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('permission_profiles')
        .select('*')
        .order('nome_perfil')

      if (error) throw error
      setProfiles((data as any[]) || [])

      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('permission_profile_id')
      
      const counts: Record<string, number> = {}
      userProfiles?.forEach(up => {
        if (up.permission_profile_id) {
          counts[up.permission_profile_id] = (counts[up.permission_profile_id] || 0) + 1
        }
      })
      setUsersCount(counts)
    } catch (error) {
      console.error('Erro ao buscar perfis:', error)
      toast.error('Erro ao carregar perfis de permissão')
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingProfile(null)
    setFormName("")
    setFormIsAdmin(false)
    setFormPermissions(emptyPermissions())
    setDialogOpen(true)
  }

  const openEditDialog = (profile: PermissionProfile) => {
    setEditingProfile(profile)
    setFormName(profile.nome_perfil)
    setFormIsAdmin(profile.is_admin_profile)
    const perms = emptyPermissions()
    Object.keys(profile.system_permissions || {}).forEach(resource => {
      if (perms[resource]) {
        Object.keys(profile.system_permissions[resource] || {}).forEach(perm => {
          perms[resource][perm] = profile.system_permissions[resource][perm]
        })
      }
    })
    setFormPermissions(perms)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error('Informe o nome do perfil')
      return
    }

    try {
      const data = {
        nome_perfil: formName.trim(),
        is_admin_profile: formIsAdmin,
        system_permissions: formIsAdmin ? allPermissionsEnabled() : formPermissions,
        user_id: user!.id
      }

      if (editingProfile) {
        const { error } = await supabase
          .from('permission_profiles')
          .update(data)
          .eq('id', editingProfile.id)
        if (error) throw error
        toast.success('Perfil atualizado!')
      } else {
        const { error } = await supabase
          .from('permission_profiles')
          .insert(data)
        if (error) throw error
        toast.success('Perfil criado!')
      }

      setDialogOpen(false)
      fetchProfiles()
    } catch (error: any) {
      console.error('Erro:', error)
      toast.error('Erro ao salvar perfil: ' + error.message)
    }
  }

  const handleDelete = async (profile: PermissionProfile) => {
    if (!confirm(`Deseja excluir o perfil "${profile.nome_perfil}"?`)) return

    try {
      const { error } = await supabase
        .from('permission_profiles')
        .delete()
        .eq('id', profile.id)
      if (error) throw error
      toast.success('Perfil excluído!')
      fetchProfiles()
    } catch (error: any) {
      console.error('Erro:', error)
      toast.error('Erro ao excluir perfil: ' + error.message)
    }
  }

  const handlePermissionChange = (resource: string, permission: string, value: boolean) => {
    setFormPermissions(prev => {
      const updated = { ...prev }
      updated[resource] = { ...updated[resource] }
      
      if (permission === 'can_view' && !value) {
        PERMISSION_TYPES.forEach(p => {
          updated[resource][p.key] = false
        })
      } else if (permission !== 'can_view' && value) {
        updated[resource].can_view = true
        updated[resource][permission] = true
      } else {
        updated[resource][permission] = value
      }
      
      return updated
    })
  }

  const toggleAllPermissions = (enable: boolean) => {
    setFormPermissions(enable ? allPermissionsEnabled() : emptyPermissions())
  }

  const toggleResourcePermissions = (resource: string, enable: boolean) => {
    setFormPermissions(prev => {
      const updated = { ...prev }
      updated[resource] = {}
      PERMISSION_TYPES.forEach(p => {
        updated[resource][p.key] = enable
      })
      return updated
    })
  }

  // === Acessos (record-level permissions) ===
  const openAccessDialog = async () => {
    setAccessDialogOpen(true)
    setSelectedUserId(null)
    setSelectedUserProfile(null)
    setClientPermissions([])
    
    // Fetch users and clients
    const [usersRes, clientesRes] = await Promise.all([
      supabase.from('user_profiles').select('*').order('display_name'),
      supabase.from('clientes').select('id, nome_cliente').order('nome_cliente')
    ])
    setAllUsers((usersRes.data as any[]) || [])
    setClientes(clientesRes.data || [])
  }

  const handleSelectUser = async (userId: string) => {
    setSelectedUserId(userId)
    const userP = allUsers.find(u => u.user_id === userId) || null
    setSelectedUserProfile(userP)
    
    // Fetch client permissions for this user
    const { data } = await supabase
      .from('user_client_permissions')
      .select('*')
      .eq('user_id', userId)

    if (data && data.length > 0) {
      const clienteIds = data.map(p => p.cliente_id)
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome_cliente')
        .in('id', clienteIds)
      
      setClientPermissions(data.map(permission => ({
        ...permission,
        clientes: clientesData?.find(c => c.id === permission.cliente_id)
      })))
    } else {
      setClientPermissions([])
    }
  }

  const handleClientPermissionChange = async (clienteId: string, permission: 'can_view' | 'can_edit' | 'can_create' | 'can_delete', value: boolean) => {
    if (!selectedUserId) return
    try {
      const existing = clientPermissions.find(p => p.cliente_id === clienteId)
      if (existing) {
        const updateData: any = { [permission]: value }
        if (permission === 'can_view' && !value) {
          updateData.can_edit = false
          updateData.can_create = false
          updateData.can_delete = false
        } else if (permission !== 'can_view' && value) {
          updateData.can_view = true
        }
        await supabase.from('user_client_permissions').update(updateData).eq('id', existing.id)
      } else {
        const newPerm = {
          user_id: selectedUserId,
          cliente_id: clienteId,
          can_view: permission === 'can_view' ? value : value,
          can_edit: permission === 'can_edit' ? value : false,
          can_create: permission === 'can_create' ? value : false,
          can_delete: permission === 'can_delete' ? value : false
        }
        if (value) newPerm.can_view = true
        await supabase.from('user_client_permissions').insert(newPerm)
      }
      handleSelectUser(selectedUserId)
      toast.success('Permissão atualizada!')
    } catch (error: any) {
      toast.error('Erro ao atualizar permissão')
    }
  }

  const toggleAllClientPermissions = async (enable: boolean) => {
    if (!selectedUserId) return
    try {
      for (const cliente of clientes) {
        const existing = clientPermissions.find(p => p.cliente_id === cliente.id)
        if (existing) {
          await supabase.from('user_client_permissions')
            .update({ can_view: enable, can_edit: enable, can_create: enable, can_delete: enable })
            .eq('id', existing.id)
        } else if (enable) {
          await supabase.from('user_client_permissions')
            .insert({ user_id: selectedUserId, cliente_id: cliente.id, can_view: enable, can_edit: enable, can_create: enable, can_delete: enable })
        }
      }
      handleSelectUser(selectedUserId)
      toast.success(enable ? 'Todas habilitadas!' : 'Todas desabilitadas!')
    } catch {
      toast.error('Erro ao atualizar permissões')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando perfis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Perfis de Permissão</h1>
          <p className="text-muted-foreground">
            Crie e gerencie perfis de permissão para atribuir aos usuários
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openAccessDialog}>
            <Key className="mr-2 h-4 w-4" />
            Acessos
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Perfil
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {profiles.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum perfil de permissão criado ainda.</p>
            </CardContent>
          </Card>
        )}
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {profile.nome_perfil}
                      {profile.is_admin_profile && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Admin
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {usersCount[profile.id] || 0} usuário(s) vinculado(s)
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(profile)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(profile)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Create/Edit Profile Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Editar Perfil' : 'Criar Novo Perfil'}</DialogTitle>
            <DialogDescription>
              Defina o nome e as permissões deste perfil
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="nome_perfil">Nome do Perfil</Label>
                <Input
                  id="nome_perfil"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Técnico, Supervisor, Administrador"
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pb-2">
                <Checkbox
                  id="is_admin_profile"
                  checked={formIsAdmin}
                  onCheckedChange={(checked) => {
                    setFormIsAdmin(!!checked)
                    if (checked) setFormPermissions(allPermissionsEnabled())
                  }}
                />
                <Label htmlFor="is_admin_profile">Perfil Administrador</Label>
              </div>
            </div>

            {formIsAdmin && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Perfil administrador tem acesso total a todos os recursos do sistema
                  </span>
                </div>
              </div>
            )}

            {!formIsAdmin && (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Permissões do Sistema</h3>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => toggleAllPermissions(true)}>
                      <Check className="w-4 h-4 mr-1" /> Marcar Todos
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => toggleAllPermissions(false)}>
                      <X className="w-4 h-4 mr-1" /> Desmarcar Todos
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {SYSTEM_RESOURCES.map((resource) => (
                    <div key={resource.key} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{resource.label}</h4>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => toggleResourcePermissions(resource.key, true)}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => toggleResourcePermissions(resource.key, false)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {PERMISSION_TYPES.map((perm) => (
                          <div key={perm.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${resource.key}-${perm.key}`}
                              checked={formPermissions[resource.key]?.[perm.key] || false}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(resource.key, perm.key, !!checked)
                              }
                            />
                            <Label htmlFor={`${resource.key}-${perm.key}`} className="text-xs">{perm.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingProfile ? 'Salvar Alterações' : 'Criar Perfil'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Acessos Dialog */}
      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Acessos por Usuário</DialogTitle>
            <DialogDescription>
              Configure quais clientes, empresas e senhas cada usuário pode acessar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Selecione o Usuário</Label>
              <Select value={selectedUserId || ""} onValueChange={handleSelectUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.display_name || u.email} {u.is_admin ? '(Admin)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUserId && (
              <Tabs defaultValue="clientes" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="clientes">Clientes</TabsTrigger>
                  <TabsTrigger value="empresas">Empresas</TabsTrigger>
                  <TabsTrigger value="senhas">Senhas</TabsTrigger>
                </TabsList>

                <TabsContent value="clientes" className="space-y-4">
                  {selectedUserProfile?.is_admin && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Este usuário é administrador e tem acesso total a todos os clientes
                        </span>
                      </div>
                    </div>
                  )}

                  {!selectedUserProfile?.is_admin && (
                    <div className="flex justify-end gap-2 mb-4">
                      <Button variant="outline" size="sm" onClick={() => toggleAllClientPermissions(true)}>
                        <Check className="w-4 h-4 mr-2" /> Marcar Todos
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleAllClientPermissions(false)}>
                        <X className="w-4 h-4 mr-2" /> Desmarcar Todos
                      </Button>
                    </div>
                  )}

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {clientes.map((cliente) => {
                      const permission = clientPermissions.find(p => p.cliente_id === cliente.id)
                      const isAdmin = selectedUserProfile?.is_admin
                      return (
                        <div key={cliente.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-medium">{cliente.nome_cliente}</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(['can_view', 'can_edit', 'can_create', 'can_delete'] as const).map((perm) => {
                              const labels = { can_view: 'Ver', can_edit: 'Editar', can_create: 'Criar', can_delete: 'Excluir' }
                              return (
                                <div key={perm} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`access-${perm}-${cliente.id}`}
                                    checked={isAdmin || permission?.[perm] || false}
                                    disabled={!!isAdmin}
                                    onCheckedChange={(checked) => handleClientPermissionChange(cliente.id, perm, !!checked)}
                                  />
                                  <Label htmlFor={`access-${perm}-${cliente.id}`}>{labels[perm]}</Label>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="empresas" className="space-y-4">
                  <EmpresaPermissionsTab selectedProfile={selectedUserProfile} />
                </TabsContent>

                <TabsContent value="senhas" className="space-y-4">
                  <PasswordPermissionsTab
                    selectedProfile={selectedUserProfile}
                    clientPermissions={clientPermissions}
                    clientes={clientes}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
