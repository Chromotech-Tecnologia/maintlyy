import { useState, useEffect, useCallback } from "react"
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
import { Plus, Edit, Users, Shield, UserPlus, Phone, Building2 } from "lucide-react"
import { EditProfileDialog } from "@/components/EditProfileDialog"
import { toast } from "sonner"
import { EmailValidation, isEmailValid } from "@/components/ui/password-requirements"

interface UserProfile {
  id: string
  user_id: string
  display_name: string | null
  email: string | null
  is_admin: boolean
  is_super_admin?: boolean
  created_at: string
  permission_profile_id: string | null
  phone?: string | null
  department?: string | null
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
    display_name: "",
    is_admin: false,
    permission_profile_id: ""
  })
  const [emailError, setEmailError] = useState("")

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // Fetch permission profiles first
      const { data: ppData, error: ppError } = await supabase
        .from('permission_profiles')
        .select('id, nome_perfil, is_admin_profile')
        .order('nome_perfil')
      if (ppError) throw ppError
      const myPermProfiles = ppData || []
      setPermissionProfiles(myPermProfiles)

      // Then fetch user profiles
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      
      const allProfiles = (data as any[]) || []
      
      // Fetch profile data (phone, department) for all users
      const { data: profileDataList } = await supabase
        .from('user_profile_data')
        .select('user_id, phone, department')
      
      const profileDataMap = new Map((profileDataList || []).map(pd => [pd.user_id, pd]))
      
      // Enrich profiles with phone/department
      const enrichedProfiles = allProfiles.map(p => {
        const pd = profileDataMap.get(p.user_id)
        return { ...p, phone: pd?.phone || null, department: pd?.department || null }
      })
      
      if (permissions.isAdmin) {
        const myProfileIds = myPermProfiles.map(p => p.id)
        const filtered = enrichedProfiles.filter(p => 
          p.user_id === user.id || 
          (!p.is_admin && !p.is_super_admin && (
            myProfileIds.includes(p.permission_profile_id) || 
            !p.permission_profile_id
          ))
        )
        setProfiles(filtered)
      } else {
        setProfiles(enrichedProfiles.filter(p => p.user_id === user.id))
      }
    } catch (error) {
      console.error('Erro ao buscar perfis:', error)
      toast.error('Erro ao carregar perfis')
    } finally {
      setLoading(false)
    }
  }, [user, permissions.isAdmin])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

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
        await supabase.from('user_client_permissions').delete().eq('user_id', userId)
        await supabase.from('user_empresa_permissions').delete().eq('user_id', userId)
        await supabase.from('user_password_permissions').delete().eq('user_id', userId)
      }

      toast.success('Perfil atribuído com sucesso!')
      fetchAll()
    } catch (error: any) {
      console.error('Erro ao atribuir perfil:', error)
      toast.error('Erro ao atribuir perfil: ' + error.message)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Validate email uniqueness within tenant
      const existingUser = profiles.find(p => p.email === newUserData.email)
      if (existingUser) {
        toast.error('Este email já está cadastrado neste tenant.')
        setEmailError('Email já cadastrado')
        return
      }

      if (!isPasswordValid(newUserData.password)) {
        toast.error('A senha não atende aos requisitos mínimos')
        return
      }
      if (newUserData.password !== newUserData.confirmPassword) {
        toast.error('As senhas não coincidem')
        return
      }
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
        const selectedProfile = permissionProfiles.find(p => p.id === newUserData.permission_profile_id)
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: data.user.id,
            display_name: newUserData.display_name,
            email: newUserData.email,
            is_admin: selectedProfile?.is_admin_profile || false,
            permission_profile_id: newUserData.permission_profile_id || null
          })

        if (profileError) throw profileError

        // Sync permissions from profile
        if (newUserData.permission_profile_id) {
          const { data: permProfile } = await supabase
            .from('permission_profiles')
            .select('client_access, empresa_access, password_access')
            .eq('id', newUserData.permission_profile_id)
            .single()

          if (permProfile) {
            const clientAccess = Array.isArray(permProfile.client_access) ? permProfile.client_access : []
            const empresaAccess = Array.isArray(permProfile.empresa_access) ? permProfile.empresa_access : []
            const passwordAccess = Array.isArray(permProfile.password_access) ? permProfile.password_access : []

            if (clientAccess.length > 0) {
              await supabase.from('user_client_permissions').insert(
                clientAccess.map((ca: any) => ({
                  user_id: data.user!.id, cliente_id: ca.cliente_id,
                  can_view: ca.can_view || false, can_edit: ca.can_edit || false,
                  can_create: ca.can_create || false, can_delete: ca.can_delete || false
                }))
              )
            }
            if (empresaAccess.length > 0) {
              await supabase.from('user_empresa_permissions').insert(
                empresaAccess.map((ea: any) => ({
                  user_id: data.user!.id, empresa_terceira_id: ea.empresa_terceira_id,
                  can_view: ea.can_view || false, can_edit: ea.can_edit || false,
                  can_delete: ea.can_delete || false, can_create_manutencao: ea.can_create_manutencao || false
                }))
              )
            }
            if (passwordAccess.length > 0) {
              await supabase.from('user_password_permissions').insert(
                passwordAccess.map((pa: any) => ({
                  user_id: data.user!.id, senha_id: pa.senha_id,
                  can_view: pa.can_view || false, can_edit: pa.can_edit || false
                }))
              )
            }
          }
        }
      }

      toast.success('Usuário criado com sucesso!')
      setCreateUserDialogOpen(false)
      setNewUserData({ email: "", password: "", confirmPassword: "", display_name: "", is_admin: false, permission_profile_id: "" })
      fetchAll()
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

  const sortedProfiles = [...profiles].sort((a, b) => {
    if (a.user_id === user?.id) return -1
    if (b.user_id === user?.id) return 1
    return 0
  })

  const isSingleUser = profiles.length === 1 && profiles[0]?.user_id === user?.id
  const hasProfiles = permissionProfiles.length > 0

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{isSingleUser ? "Minha Conta" : "Usuários"}</h1>
          <p className="text-sm text-muted-foreground">
            {isSingleUser ? "Gerencie suas informações pessoais" : "Gerencie seus usuários subordinados"}
          </p>
        </div>
        {permissions.isAdmin && !hasProfiles && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
            Você precisa criar um <strong>Perfil de Permissão</strong> antes de criar usuários.
          </div>
        )}
        {permissions.isAdmin && hasProfiles && (
          <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <UserPlus className="mr-2 h-4 w-4" />
                Criar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Crie um novo usuário subordinado no sistema
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <Label htmlFor="new_email">Email</Label>
                  <Input
                    id="new_email"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => {
                      const val = e.target.value
                      setNewUserData(prev => ({ ...prev, email: val }))
                      const existing = profiles.find(p => p.email === val)
                      setEmailError(existing ? "Email já cadastrado neste tenant" : "")
                    }}
                    placeholder="usuario@exemplo.com"
                    required
                  />
                  {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
                  {!emailError && <EmailValidation email={newUserData.email} />}
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
                  <PasswordRequirements password={newUserData.password} />
                </div>
                <div>
                  <Label htmlFor="new_confirm_password">Confirmar Senha</Label>
                  <Input
                    id="new_confirm_password"
                    type="password"
                    value={newUserData.confirmPassword}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Repita a senha"
                    required
                  />
                  <PasswordMatchIndicator password={newUserData.password} confirmPassword={newUserData.confirmPassword} />
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
                <div>
                  <Label htmlFor="new_profile">Perfil de Permissão <span className="text-destructive">*</span></Label>
                  <Select
                    value={newUserData.permission_profile_id}
                    onValueChange={(value) => setNewUserData(prev => ({ ...prev, permission_profile_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {permissionProfiles.map((pp) => (
                        <SelectItem key={pp.id} value={pp.id}>
                          {pp.nome_perfil}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={
                    !newUserData.permission_profile_id || 
                    !isPasswordValid(newUserData.password) || 
                    newUserData.password !== newUserData.confirmPassword ||
                    !newUserData.email || 
                    !isEmailValid(newUserData.email) ||
                    !newUserData.display_name ||
                    !!emailError
                  }>
                    Criar Usuário
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {sortedProfiles.map((profile) => {
          const assignedProfile = getProfileName(profile.permission_profile_id)
          
          return (
            <Card key={profile.id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        <span className="truncate">{profile.display_name}</span>
                        {profile.is_admin && (
                          <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                            <Shield className="w-3 h-3" />
                            Admin
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex flex-col gap-1">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="truncate">{profile.email}</span>
                          {assignedProfile && (
                            <Badge variant="outline" className="shrink-0">
                              {assignedProfile.nome_perfil}
                            </Badge>
                          )}
                        </span>
                        {(profile.phone || profile.department) && (
                          <span className="flex items-center gap-3 text-xs">
                            {profile.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {profile.phone}
                              </span>
                            )}
                            {profile.department && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {profile.department}
                              </span>
                            )}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {permissions.isAdmin && profile.user_id !== user?.id && (
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
        onProfileUpdated={fetchAll}
      />
    </div>
  )
}
