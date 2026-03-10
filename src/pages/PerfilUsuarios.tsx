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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Users, Shield, UserPlus } from "lucide-react"
import { EditProfileDialog } from "@/components/EditProfileDialog"
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

export default function PerfilUsuarios() {
  const { user } = useAuth()
  const permissions = usePermissions()
  const adminOps = useAdminOperations()
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [permissionProfiles, setPermissionProfiles] = useState<PermissionProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false)
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false)
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    display_name: "",
    is_admin: false
  })

  useEffect(() => {
    fetchProfiles()
    fetchPermissionProfiles()
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

      // Sync access permissions from the profile to the user
      if (permissionProfileId) {
        const { data: permProfile } = await supabase
          .from('permission_profiles')
          .select('client_access, empresa_access, password_access')
          .eq('id', permissionProfileId)
          .single()

        if (permProfile) {
          const clientAccess = Array.isArray(permProfile.client_access) ? permProfile.client_access : []
          const empresaAccess = Array.isArray(permProfile.empresa_access) ? permProfile.empresa_access : []
          const passwordAccess = Array.isArray(permProfile.password_access) ? permProfile.password_access : []

          // Sync client permissions
          await supabase.from('user_client_permissions').delete().eq('user_id', userId)
          if (clientAccess.length > 0) {
            await supabase.from('user_client_permissions').insert(
              clientAccess.map((ca: any) => ({
                user_id: userId, cliente_id: ca.cliente_id,
                can_view: ca.can_view || false, can_edit: ca.can_edit || false,
                can_create: ca.can_create || false, can_delete: ca.can_delete || false
              }))
            )
          }

          // Sync empresa permissions
          await supabase.from('user_empresa_permissions').delete().eq('user_id', userId)
          if (empresaAccess.length > 0) {
            await supabase.from('user_empresa_permissions').insert(
              empresaAccess.map((ea: any) => ({
                user_id: userId, empresa_terceira_id: ea.empresa_terceira_id,
                can_view: ea.can_view || false, can_edit: ea.can_edit || false,
                can_delete: ea.can_delete || false, can_create_manutencao: ea.can_create_manutencao || false
              }))
            )
          }

          // Sync password permissions
          await supabase.from('user_password_permissions').delete().eq('user_id', userId)
          if (passwordAccess.length > 0) {
            await supabase.from('user_password_permissions').insert(
              passwordAccess.map((pa: any) => ({
                user_id: userId, senha_id: pa.senha_id,
                can_view: pa.can_view || false, can_edit: pa.can_edit || false
              }))
            )
          }
        }
      } else {
        // If removing profile, clear access permissions
        await supabase.from('user_client_permissions').delete().eq('user_id', userId)
        await supabase.from('user_empresa_permissions').delete().eq('user_id', userId)
        await supabase.from('user_password_permissions').delete().eq('user_id', userId)
      }

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

  const isSingleUser = profiles.length === 1

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{isSingleUser ? "Minha Conta" : "Usuários"}</h1>
          <p className="text-sm text-muted-foreground">
            {isSingleUser ? "Gerencie suas informações pessoais" : "Gerencie usuários e atribua perfis de permissão"}
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
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <EditProfileDialog
        open={editProfileDialogOpen}
        onOpenChange={setEditProfileDialogOpen}
        profile={selectedProfile}
        onProfileUpdated={fetchProfiles}
      />
    </div>
  )
}
