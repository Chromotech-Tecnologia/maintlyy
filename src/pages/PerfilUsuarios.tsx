import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useAdminOperations } from "@/hooks/useAdminOperations"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Users, Shield, Settings, UserPlus, Check, X } from "lucide-react"
import { EditProfileDialog } from "@/components/EditProfileDialog"
import { toast } from "sonner"

interface UserProfile {
  id: string
  user_id: string
  display_name: string | null
  email: string | null
  is_admin: boolean
  created_at: string
}

interface ClientPermission {
  id: string
  user_id: string
  cliente_id: string
  can_view: boolean
  can_edit: boolean
  can_create: boolean
  can_delete: boolean
  clientes?: {
    nome_cliente: string
  }
}

interface Cliente {
  id: string
  nome_cliente: string
}

interface SystemPermission {
  id: string
  user_id: string
  resource_type: string
  can_view: boolean
  can_edit: boolean
  can_create: boolean
  can_delete: boolean
}

interface AuthUser {
  id: string
  email?: string
  user_metadata: any
  app_metadata: any
}

export default function PerfilUsuarios() {
  const { user } = useAuth()
  const adminOps = useAdminOperations()
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [clientPermissions, setClientPermissions] = useState<ClientPermission[]>([])
  const [systemPermissions, setSystemPermissions] = useState<SystemPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    display_name: "",
    email: "",
    is_admin: false
  })
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    display_name: "",
    is_admin: false
  })

  useEffect(() => {
    fetchProfiles()
    fetchAuthUsers()
    fetchClientes()
  }, [])

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProfiles(data || [])
    } catch (error) {
      console.error('Erro ao buscar perfis:', error)
      toast.error('Erro ao carregar perfis')
    } finally {
      setLoading(false)
    }
  }

  const fetchAuthUsers = async () => {
    try {
      const result = await adminOps.listUsers()
      if (result.error) throw result.error
      setAuthUsers(result.data?.users || [])
    } catch (error) {
      console.error('Erro ao buscar usuários auth:', error)
    }
  }

  const fetchClientes = async () => {
    try {
      // Admin vê todos os clientes, usuários comuns veem apenas os seus
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome_cliente')
        .order('nome_cliente')

      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    }
  }

  const fetchClientPermissions = async (profileUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_client_permissions')
        .select('*')
        .eq('user_id', profileUserId)

      if (error) throw error
      
      // Buscar detalhes dos clientes separadamente
      if (data && data.length > 0) {
        const clienteIds = data.map(p => p.cliente_id)
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nome_cliente')
          .in('id', clienteIds)
        
        // Combinar dados
        const permissionsWithClients = data.map(permission => ({
          ...permission,
          clientes: clientesData?.find(c => c.id === permission.cliente_id)
        }))
        
        setClientPermissions(permissionsWithClients)
      } else {
        setClientPermissions([])
      }
    } catch (error) {
      console.error('Erro ao buscar permissões:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const profileData = {
        user_id: user?.id,
        display_name: formData.display_name,
        email: formData.email,
        is_admin: formData.is_admin
      }

      const { error } = await supabase
        .from('user_profiles')
        .insert(profileData)

      if (error) throw error

      toast.success('Perfil criado com sucesso!')
      setDialogOpen(false)
      setFormData({ display_name: "", email: "", is_admin: false })
      fetchProfiles()
    } catch (error: any) {
      console.error('Erro ao criar perfil:', error)
      toast.error('Erro ao criar perfil: ' + error.message)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Usar signUp normal ao invés de admin.createUser
      const { data, error: authError } = await supabase.auth.signUp({
        email: newUserData.email,
        password: newUserData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: newUserData.display_name,
            is_admin: newUserData.is_admin
          }
        }
      })

      if (authError) throw authError

      if (data.user) {
        // Criar perfil do usuário
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: data.user.id,
            display_name: newUserData.display_name,
            email: newUserData.email,
            is_admin: newUserData.is_admin
          })

        if (profileError) throw profileError
      }

      toast.success('Usuário criado com sucesso!')
      setCreateUserDialogOpen(false)
      setNewUserData({ email: "", password: "", display_name: "", is_admin: false })
      fetchProfiles()
      fetchAuthUsers()
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error)
      toast.error('Erro ao criar usuário: ' + error.message)
    }
  }

  const fetchSystemPermissions = async (profileUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_system_permissions')
        .select('*')
        .eq('user_id', profileUserId)

      if (error) throw error
      setSystemPermissions(data || [])
    } catch (error) {
      console.error('Erro ao buscar permissões de sistema:', error)
    }
  }

  const handleSystemPermissionChange = async (
    resource: string, 
    permission: 'can_view' | 'can_edit' | 'can_create' | 'can_delete', 
    value: boolean
  ) => {
    if (!selectedProfile) return

    try {
      const existingPermission = systemPermissions.find(p => p.resource_type === resource)

      // Regras de dependência: desmarcar Ver desmarca todas; marcar outra marca Ver
      const updateData: any = { [permission]: value }
      if (permission === 'can_view' && !value) {
        updateData.can_edit = false
        updateData.can_create = false
        updateData.can_delete = false
      } else if (permission !== 'can_view' && value) {
        updateData.can_view = true
      }

      if (existingPermission) {
        const { error } = await supabase
          .from('user_system_permissions')
          .update(updateData)
          .eq('id', existingPermission.id)

        if (error) throw error
      } else {
        const insertData: any = {
          user_id: selectedProfile.user_id,
          resource_type: resource,
          can_view: updateData.can_view ?? (permission === 'can_view' ? value : false),
          can_edit: updateData.can_edit ?? (permission === 'can_edit' ? value : false),
          can_create: updateData.can_create ?? (permission === 'can_create' ? value : false),
          can_delete: updateData.can_delete ?? (permission === 'can_delete' ? value : false)
        }
        if (permission !== 'can_view' && value) insertData.can_view = true

        const { error } = await supabase
          .from('user_system_permissions')
          .insert(insertData)

        if (error) throw error
      }

      fetchSystemPermissions(selectedProfile.user_id)
      toast.success('Permissão atualizada!')
    } catch (error: any) {
      console.error('Erro ao atualizar permissão:', error)
      toast.error('Erro ao atualizar permissão')
    }
  }

  const handlePermissionChange = async (clienteId: string, permission: 'can_view' | 'can_edit' | 'can_create' | 'can_delete', value: boolean) => {
    if (!selectedProfile) return

    try {
      // Verificar se já existe uma permissão para este cliente
      const existingPermission = clientPermissions.find(p => p.cliente_id === clienteId)

      if (existingPermission) {
        const updateData: any = { [permission]: value }
        
        // Se está desmarcando "can_view", desmarcar todas as outras também
        if (permission === 'can_view' && !value) {
          updateData.can_edit = false
          updateData.can_create = false  
          updateData.can_delete = false
        }
        // Se está marcando qualquer outra permissão, marcar "can_view" automaticamente
        else if (permission !== 'can_view' && value) {
          updateData.can_view = true
        }

        const { error } = await supabase
          .from('user_client_permissions')
          .update(updateData)
          .eq('id', existingPermission.id)

        if (error) throw error
      } else {
        // Criar nova permissão com valores padrão
        const newPermission = {
          user_id: selectedProfile.user_id,
          cliente_id: clienteId,
          can_view: permission === 'can_view' ? value : false,
          can_edit: permission === 'can_edit' ? value : false,
          can_create: permission === 'can_create' ? value : false,
          can_delete: permission === 'can_delete' ? value : false
        }
        
        // Se está marcando qualquer permissão, marcar "can_view" também
        if (value) {
          newPermission.can_view = true
        }

        const { error } = await supabase
          .from('user_client_permissions')
          .insert(newPermission)

        if (error) throw error
      }

      // Recarregar permissões
      fetchClientPermissions(selectedProfile.user_id)
      toast.success('Permissão atualizada!')
    } catch (error: any) {
      console.error('Erro ao atualizar permissão:', error)
      toast.error('Erro ao atualizar permissão')
    }
  }

  const toggleAllClientPermissions = async (enable: boolean) => {
    if (!selectedProfile) return

    try {
      for (const cliente of clientes) {
        const existingPermission = clientPermissions.find(p => p.cliente_id === cliente.id)

        if (existingPermission) {
          await supabase
            .from('user_client_permissions')
            .update({
              can_view: enable,
              can_edit: enable,
              can_create: enable,
              can_delete: enable
            })
            .eq('id', existingPermission.id)
        } else {
          await supabase
            .from('user_client_permissions')
            .insert({
              user_id: selectedProfile.user_id,
              cliente_id: cliente.id,
              can_view: enable,
              can_edit: enable,
              can_create: enable,
              can_delete: enable
            })
        }
      }

      fetchClientPermissions(selectedProfile.user_id)
      toast.success(enable ? 'Todas as permissões habilitadas!' : 'Todas as permissões desabilitadas!')
    } catch (error: any) {
      console.error('Erro ao atualizar permissões:', error)
      toast.error('Erro ao atualizar permissões')
    }
  }

  const toggleClientPermissions = async (clienteId: string, enable: boolean) => {
    if (!selectedProfile) return

    try {
      const existingPermission = clientPermissions.find(p => p.cliente_id === clienteId)

      if (existingPermission) {
        await supabase
          .from('user_client_permissions')
          .update({
            can_view: enable,
            can_edit: enable,
            can_create: enable,
            can_delete: enable
          })
          .eq('id', existingPermission.id)
      } else {
        await supabase
          .from('user_client_permissions')
          .insert({
            user_id: selectedProfile.user_id,
            cliente_id: clienteId,
            can_view: enable,
            can_edit: enable,
            can_create: enable,
            can_delete: enable
          })
      }

      fetchClientPermissions(selectedProfile.user_id)
      toast.success('Permissões atualizadas!')
    } catch (error: any) {
      console.error('Erro ao atualizar permissões:', error)
      toast.error('Erro ao atualizar permissões')
    }
  }

  const toggleAllSystemPermissions = async (enable: boolean) => {
    if (!selectedProfile) return

    try {
      const resources = ['manutencoes', 'dashboard', 'empresas_terceiras', 'equipes', 'tipos_manutencao', 'clientes', 'cofre_senhas', 'perfis_usuarios', 'permissoes']

      for (const resource of resources) {
        const existingPermission = systemPermissions.find(p => p.resource_type === resource)

        if (existingPermission) {
          await supabase
            .from('user_system_permissions')
            .update({
              can_view: enable,
              can_edit: enable,
              can_create: enable,
              can_delete: enable
            })
            .eq('id', existingPermission.id)
        } else {
          await supabase
            .from('user_system_permissions')
            .insert({
              user_id: selectedProfile.user_id,
              resource_type: resource,
              can_view: enable,
              can_edit: enable,
              can_create: enable,
              can_delete: enable
            })
        }
      }

      fetchSystemPermissions(selectedProfile.user_id)
      toast.success(enable ? 'Todas as permissões de sistema habilitadas!' : 'Todas as permissões de sistema desabilitadas!')
    } catch (error: any) {
      console.error('Erro ao atualizar permissões de sistema:', error)
      toast.error('Erro ao atualizar permissões de sistema')
    }
  }

  const toggleSystemResourcePermissions = async (resource: string, enable: boolean) => {
    if (!selectedProfile) return

    try {
      const existingPermission = systemPermissions.find(p => p.resource_type === resource)

      if (existingPermission) {
        await supabase
          .from('user_system_permissions')
          .update({
            can_view: enable,
            can_edit: enable,
            can_create: enable,
            can_delete: enable
          })
          .eq('id', existingPermission.id)
      } else {
        await supabase
          .from('user_system_permissions')
          .insert({
            user_id: selectedProfile.user_id,
            resource_type: resource,
            can_view: enable,
            can_edit: enable,
            can_create: enable,
            can_delete: enable
          })
      }

      fetchSystemPermissions(selectedProfile.user_id)
      toast.success('Permissões atualizadas!')
    } catch (error: any) {
      console.error('Erro ao atualizar permissões:', error)
      toast.error('Erro ao atualizar permissões')
    }
  }

  const openPermissionsDialog = (profile: UserProfile) => {
    setSelectedProfile(profile)
    fetchClientPermissions(profile.user_id)
    fetchSystemPermissions(profile.user_id)
    setPermissionsDialogOpen(true)
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
          <h1 className="text-3xl font-bold text-foreground">Perfis de Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie perfis e permissões de acesso
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <UserPlus className="mr-2 h-4 w-4" />
                Criar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Crie um novo usuário no sistema com login e senha
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <Label htmlFor="new_email">Email</Label>
                  <Input
                    id="new_email"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="usuario@exemplo.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new_password">Senha</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Senha do usuário"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new_display_name">Nome de Exibição</Label>
                  <Input
                    id="new_display_name"
                    value={newUserData.display_name}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Ex: João Silva"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="new_is_admin"
                    checked={newUserData.is_admin}
                    onCheckedChange={(checked) => setNewUserData(prev => ({ ...prev, is_admin: !!checked }))}
                  />
                  <Label htmlFor="new_is_admin">Administrador</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Criar Usuário</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Vincular Perfil
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Perfil</DialogTitle>
              <DialogDescription>
                Crie um novo perfil de usuário com permissões específicas
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="display_name">Nome de Exibição</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Ex: João Silva"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="usuario@exemplo.com"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_admin"
                  checked={formData.is_admin}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_admin: !!checked }))}
                />
                <Label htmlFor="is_admin">Administrador</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Perfil</Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {profile.display_name}
                      {profile.is_admin && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Admin
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{profile.email}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProfile(profile)
                      setEditProfileDialogOpen(true)
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Perfil
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPermissionsDialog(profile)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Permissões
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Dialog de Permissões */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Permissões de {selectedProfile?.display_name}
            </DialogTitle>
            <DialogDescription>
              Configure as permissões de acesso deste usuário
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="clientes" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="clientes">Clientes</TabsTrigger>
              <TabsTrigger value="sistema">Sistema</TabsTrigger>
              <TabsTrigger value="senhas">Senhas por Cliente</TabsTrigger>
            </TabsList>
            
            <TabsContent value="clientes" className="space-y-4">
              {selectedProfile?.is_admin && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Este usuário é administrador e tem acesso total a todos os clientes
                    </span>
                  </div>
                </div>
              )}
              
              {!selectedProfile?.is_admin && (
                <div className="flex justify-end gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllClientPermissions(true)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Marcar Todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllClientPermissions(false)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Desmarcar Todos
                  </Button>
                </div>
              )}

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {clientes.map((cliente) => {
                  const permission = clientPermissions.find(p => p.cliente_id === cliente.id)
                  const isAdminUser = selectedProfile?.is_admin
                  return (
                    <div key={cliente.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium">{cliente.nome_cliente}</p>
                        {!isAdminUser && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleClientPermissions(cliente.id, true)}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleClientPermissions(cliente.id, false)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`view-${cliente.id}`}
                            checked={isAdminUser || permission?.can_view || false}
                            disabled={isAdminUser}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(cliente.id, 'can_view', !!checked)
                            }
                          />
                          <Label htmlFor={`view-${cliente.id}`}>Ver</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${cliente.id}`}
                            checked={isAdminUser || permission?.can_edit || false}
                            disabled={isAdminUser}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(cliente.id, 'can_edit', !!checked)
                            }
                          />
                          <Label htmlFor={`edit-${cliente.id}`}>Editar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`create-${cliente.id}`}
                            checked={isAdminUser || permission?.can_create || false}
                            disabled={isAdminUser}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(cliente.id, 'can_create', !!checked)
                            }
                          />
                          <Label htmlFor={`create-${cliente.id}`}>Criar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`delete-${cliente.id}`}
                            checked={isAdminUser || permission?.can_delete || false}
                            disabled={isAdminUser}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(cliente.id, 'can_delete', !!checked)
                            }
                          />
                          <Label htmlFor={`delete-${cliente.id}`}>Excluir</Label>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsContent>
            
            <TabsContent value="sistema" className="space-y-4">
              {selectedProfile?.is_admin && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Este usuário é administrador e tem acesso total a todos os recursos do sistema
                    </span>
                  </div>
                </div>
              )}
              
              {!selectedProfile?.is_admin && (
                <div className="flex justify-end gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllSystemPermissions(true)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Marcar Todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllSystemPermissions(false)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Desmarcar Todos
                  </Button>
                </div>
              )}

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {['manutencoes', 'dashboard', 'empresas_terceiras', 'equipes', 'tipos_manutencao', 'clientes', 'cofre_senhas', 'perfis_usuarios', 'permissoes'].map((resource) => {
                  const permission = systemPermissions.find(p => p.resource_type === resource)
                  const isAdminUser = selectedProfile?.is_admin
                  const resourceName = {
                    'manutencoes': 'Manutenções',
                    'dashboard': 'Dashboard',
                    'empresas_terceiras': 'Empresas Terceiras',
                    'equipes': 'Equipes',
                    'tipos_manutencao': 'Tipos de Manutenção',
                    'clientes': 'Clientes',
                    'cofre_senhas': 'Cofre de Senhas',
                    'perfis_usuarios': 'Perfis de Usuários',
                    'permissoes': 'Permissões'
                  }[resource]
                  
                  return (
                    <div key={resource} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{resourceName}</h4>
                        {!isAdminUser && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleSystemResourcePermissions(resource, true)}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleSystemResourcePermissions(resource, false)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${resource}-view`}
                            checked={isAdminUser || permission?.can_view || false}
                            disabled={isAdminUser}
                            onCheckedChange={(checked) => 
                              handleSystemPermissionChange(resource, 'can_view', !!checked)
                            }
                          />
                          <Label htmlFor={`${resource}-view`}>Ver</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${resource}-edit`}
                            checked={isAdminUser || permission?.can_edit || false}
                            disabled={isAdminUser}
                            onCheckedChange={(checked) => 
                              handleSystemPermissionChange(resource, 'can_edit', !!checked)
                            }
                          />
                          <Label htmlFor={`${resource}-edit`}>Editar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${resource}-create`}
                            checked={isAdminUser || permission?.can_create || false}
                            disabled={isAdminUser}
                            onCheckedChange={(checked) => 
                              handleSystemPermissionChange(resource, 'can_create', !!checked)
                            }
                          />
                          <Label htmlFor={`${resource}-create`}>Criar</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${resource}-delete`}
                            checked={isAdminUser || permission?.can_delete || false}
                            disabled={isAdminUser}
                            onCheckedChange={(checked) => 
                              handleSystemPermissionChange(resource, 'can_delete', !!checked)
                            }
                          />
                          <Label htmlFor={`${resource}-delete`}>Excluir</Label>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="senhas" className="space-y-4">
              {selectedProfile?.is_admin && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Este usuário é administrador e tem acesso a todas as senhas de todos os clientes
                    </span>
                  </div>
                </div>
              )}
              
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Funcionalidade de permissões de senhas por cliente em desenvolvimento.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Esta funcionalidade permitirá controlar quais senhas do cofre cada usuário pode visualizar para cada cliente.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <EditProfileDialog
        open={editProfileDialogOpen}
        onOpenChange={setEditProfileDialogOpen}
        profile={selectedProfile}
        onProfileUpdated={fetchProfiles}
      />
    </div>
  )
}