import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: any
  onProfileUpdated: () => void
}

export function EditProfileDialog({ open, onOpenChange, profile, onProfileUpdated }: EditProfileDialogProps) {
  const { user } = useAuth()
  const permissions = usePermissions()
  const [formData, setFormData] = useState({
    display_name: "",
    email: "",
    phone: "",
    department: "",
    is_admin: false
  })
  const [profileData, setProfileData] = useState<any>(null)
  const [authUser, setAuthUser] = useState<any>(null)

  useEffect(() => {
    if (profile && open) {
      setFormData({
        display_name: profile.display_name || "",
        email: profile.email || "",
        phone: "",
        department: "",
        is_admin: profile.is_admin || false
      })
      
      // Buscar dados adicionais do perfil
      fetchProfileData(profile.user_id)
      fetchAuthUser(profile.user_id)
    }
  }, [profile, open])

  const fetchProfileData = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_profile_data')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (data) {
        setProfileData(data)
        setFormData(prev => ({
          ...prev,
          phone: data.phone || "",
          department: data.department || ""
        }))
      }
    } catch (error) {
      console.error('Erro ao buscar dados do perfil:', error)
    }
  }

  const fetchAuthUser = async (userId: string) => {
    try {
      const { data: { user: authUserData }, error } = await supabase.auth.admin.getUserById(userId)
      if (error) throw error
      setAuthUser(authUserData)
    } catch (error) {
      console.error('Erro ao buscar usuário auth:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Verificar se pode editar este perfil
      const canEdit = permissions.isAdmin || profile.user_id === user?.id
      if (!canEdit) {
        toast.error('Você não tem permissão para editar este perfil')
        return
      }

      // Atualizar user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          display_name: formData.display_name,
          email: formData.email,
          is_admin: formData.is_admin
        })
        .eq('user_id', profile.user_id)

      if (profileError) throw profileError

      // Atualizar ou inserir user_profile_data
      const profileDataUpdate = {
        user_id: profile.user_id,
        display_name: formData.display_name,
        phone: formData.phone,
        department: formData.department
      }

      if (profileData) {
        const { error: dataError } = await supabase
          .from('user_profile_data')
          .update(profileDataUpdate)
          .eq('user_id', profile.user_id)

        if (dataError) throw dataError
      } else {
        const { error: dataError } = await supabase
          .from('user_profile_data')
          .insert(profileDataUpdate)

        if (dataError) throw dataError
      }

      // Se for admin e estiver editando email, atualizar também no auth
      if (permissions.isAdmin && formData.email !== profile.email) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          profile.user_id,
          { email: formData.email }
        )
        if (authError) throw authError
      }

      toast.success('Perfil atualizado com sucesso!')
      onOpenChange(false)
      onProfileUpdated()
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error)
      toast.error('Erro ao atualizar perfil: ' + error.message)
    }
  }

  const canEditAdmin = permissions.isAdmin && profile?.user_id !== user?.id
  const canEditProfile = permissions.isAdmin || profile?.user_id === user?.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            {canEditProfile ? "Edite as informações do perfil de usuário" : "Você não tem permissão para editar este perfil"}
          </DialogDescription>
        </DialogHeader>
        
        {canEditProfile && (
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
                disabled={!permissions.isAdmin}
              />
              {!permissions.isAdmin && (
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas administradores podem alterar o email
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                placeholder="Ex: TI, Administrativo"
              />
            </div>

            {canEditAdmin && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_admin"
                  checked={formData.is_admin}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_admin: !!checked }))}
                />
                <Label htmlFor="is_admin">Administrador</Label>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}