import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { useAdminOperations } from "@/hooks/useAdminOperations"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Users, Shield, UserPlus, Check, X, Key } from "lucide-react"
import { EditProfileDialog } from "@/components/EditProfileDialog"
import { PasswordPermissionsTab } from "@/components/permissions/PasswordPermissionsTab"
import { EmpresaPermissionsTab } from "@/components/permissions/EmpresaPermissionsTab"
import { toast } from "sonner"

interface UserProfile {
  id: string
  user_id: string
  display_name: string | null
  email: string | null
  is_admin: boolean
  created_at: string
  permission_profile_id: string | null
}

interface PermissionProfile {
  id: string
  nome_perfil: string
  is_admin_profile: boolean
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

export default function PerfilUsuarios() {
  const { user } = useAuth()
  const permissions = usePermissions()
  const adminOps = useAdminOperations()
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [permissionProfiles, setPermissionProfiles] = useState<PermissionProfile[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [clientPermissions, setClientPermissions] = useState<ClientPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false)
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false)
  const [recordPermissionsDialogOpen, setRecordPermissionsDialogOpen] = useState(false)
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    display_name: "",
    is_admin: false
  })

  useEffect(() => {
    fetchProfiles()
    fetchPermissionProfiles()
    fetchClientes()
  }, [])

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProfiles((data as any[]) || [])
    } catch (error) {
      console.error('Erro ao buscar perfis:', error)
      toast.error('Erro ao carregar perfis')
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissionProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('permission_profiles')
        .select('id, nome_perfil, is_admin_profile')
        .order('nome_perfil')
      if (error) throw error
      setPermissionProfiles(data || [])
    } catch (error) {
      console.error('Erro ao buscar perfis de permissão:', error)
    }
  }

  const fetchClientes = async () => {
    try {
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
      
      if (data && data.length > 0) {
        const clienteIds = data.map(p => p.cliente_id)
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nome_cliente')
          .in('id', clienteIds)
        
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

  const handleAssignProfile = async (userProfileId: string, userId: string, permissionProfileId: string | null) => {
    try {
      const profileData = permissionProfiles.find(p => p.id === permissionProfileId)
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          permission_profile_id: permissionProfileId,
          is_admin: profileData?.is_admin_profile || false
        })
        .eq('user_id', userId)

      if (error) throw error
      toast.success('Perfil atribuído com sucesso!')
      fetchProfiles()
    } catch (error: any) {
      console.error('Erro ao atribuir perfil:', error)
      toast.error('Erro ao atribuir perfil: ' + error.message)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
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
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error)
      toast.error('Erro ao criar usuário: ' + error.message)
    }
  }

  const handlePermissionChange = async (clienteId: string, permission: 'can_view' | 'can_edit' | 'can_create' | 'can_delete', value: boolean) => {
    if (!selectedProfile) return

    try {
      const existingPermission = clientPermissions.find(p => p.cliente_id === clienteId)

      if (existingPermission) {
        const updateData: any = { [permission]: value }
        if (permission === 'can_view' && !value) {
          updateData.can_edit = false
          updateData.can_create = false  
          updateData.can_delete = false
        } else if (permission !== 'can_view' && value) {
          updateData.can_view = true
        }

        const { error } = await supabase
          .from('user_client_permissions')
          .update(updateData)
          .eq('id', existingPermission.id)
        if (error) throw error
      } else {
        const newPermission = {
          user_id: selectedProfile.user_id,
          cliente_id: clienteId,
          can_view: permission === 'can_view' ? value : value,
          can_edit: permission === 'can_edit' ? value : false,
          can_create: permission === 'can_create' ? value : false,
          can_delete: permission === 'can_delete' ? value : false
        }
        if (value) newPermission.can_view = true

        const { error } = await supabase
          .from('user_client_permissions')
          .insert(newPermission)
        if (error) throw error
      }

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
        const existing = clientPermissions.find(p => p.cliente_id === cliente.id)
        if (existing) {
          await supabase
            .from('user_client_permissions')
            .update({ can_view: enable, can_edit: enable, can_create: enable, can_delete: enable })
            .eq('id', existing.id)
        } else if (enable) {
          await supabase
            .from('user_client_permissions')
            .insert({ user_id: selectedProfile.user_id, cliente_id: cliente.id, can_view: enable, can_edit: enable, can_create: enable, can_delete: enable })
        }
      }
      fetchClientPermissions(selectedProfile.user_id)
      toast.success(enable ? 'Todas habilitadas!' : 'Todas desabilitadas!')
    } catch (error: any) {
      toast.error('Erro ao atualizar permissões')
    }
  }

  const openRecordPermissions = (profile: UserProfile) => {
    setSelectedProfile(profile)
    fetchClientPermissions(profile.user_id)
    setRecordPermissionsDialogOpen(true)
  }

  const getProfileName = (profileId: string | null) => {
    if (!profileId) return null
    return permissionProfiles.find(p => p.id === profileId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie usuários e atribua perfis de permissão
          </p>
        </div>
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
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Usuário</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {profiles.map((profile) => {
          const assignedProfile = getProfileName(profile.permission_profile_id)
          
          return (
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
                      <CardDescription className="flex items-center gap-2">
                        {profile.email}
                        {assignedProfile && (
                          <Badge variant="outline" className="ml-2">
                            {assignedProfile.nome_perfil}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {permissions.isAdmin && (
                      <div className="w-48">
                        <Select
                          value={profile.permission_profile_id || "none"}
                          onValueChange={(value) => handleAssignProfile(
                            profile.id,
                            profile.user_id,
                            value === "none" ? null : value
                          )}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecionar perfil" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem perfil</SelectItem>
                            {permissionProfiles.map((pp) => (
                              <SelectItem key={pp.id} value={pp.id}>
                                {pp.nome_perfil}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                        Editar
                      </Button>
                      {permissions.isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRecordPermissions(profile)}
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Acessos
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {/* Record-level Permissions Dialog */}
      <Dialog open={recordPermissionsDialogOpen} onOpenChange={setRecordPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Acessos de {selectedProfile?.display_name}
            </DialogTitle>
            <DialogDescription>
              Configure quais clientes, empresas e senhas este usuário pode acessar
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="clientes" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="clientes">Clientes</TabsTrigger>
              <TabsTrigger value="empresas">Empresas</TabsTrigger>
              <TabsTrigger value="senhas">Senhas</TabsTrigger>
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
                  const isAdminUser = selectedProfile?.is_admin
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
                                id={`${perm}-${cliente.id}`}
                                checked={isAdminUser || permission?.[perm] || false}
                                disabled={isAdminUser}
                                onCheckedChange={(checked) => handlePermissionChange(cliente.id, perm, !!checked)}
                              />
                              <Label htmlFor={`${perm}-${cliente.id}`}>{labels[perm]}</Label>
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
              <EmpresaPermissionsTab selectedProfile={selectedProfile} />
            </TabsContent>

            <TabsContent value="senhas" className="space-y-4">
              <PasswordPermissionsTab 
                selectedProfile={selectedProfile}
                clientPermissions={clientPermissions}
                clientes={clientes}
              />
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
