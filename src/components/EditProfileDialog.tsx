import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { useAdminOperations } from "@/hooks/useAdminOperations"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { Eye, EyeOff, ChevronDown, ChevronRight, Lock } from "lucide-react"
import { PasswordRequirements, PasswordMatchIndicator, isPasswordValid, EmailValidation, isEmailValid } from "@/components/ui/password-requirements"

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: any
  onProfileUpdated: () => void
}

export function EditProfileDialog({ open, onOpenChange, profile, onProfileUpdated }: EditProfileDialogProps) {
  const { user } = useAuth()
  const permissions = usePermissions()
  const adminOps = useAdminOperations()
  const [formData, setFormData] = useState({
    display_name: "",
    email: "",
    phone: "",
    department: "",
    is_admin: false
  })
  const [profileData, setProfileData] = useState<any>(null)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (profile && open) {
      setFormData({
        display_name: profile.display_name || "",
        email: profile.email || "",
        phone: "",
        department: "",
        is_admin: profile.is_admin || false
      })
      setShowPasswordSection(false)
      setNewPassword("")
      setConfirmPassword("")

      fetchProfileData(profile.user_id)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const canEdit = permissions.isAdmin || profile.user_id === user?.id
      if (!canEdit) {
        toast.error('Você não tem permissão para editar este perfil')
        return
      }

      // Validate password if changing
      if (showPasswordSection && newPassword) {
        if (!isPasswordValid(newPassword)) {
          toast.error('A senha não atende aos requisitos mínimos')
          return
        }
        if (newPassword !== confirmPassword) {
          toast.error('As senhas não coincidem')
          return
        }
      }

      // Update user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          display_name: formData.display_name,
          email: formData.email,
          is_admin: formData.is_admin
        })
        .eq('user_id', profile.user_id)

      if (profileError) throw profileError

      // Update or insert user_profile_data
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

      // Update email in auth if admin changed it
      if (permissions.isAdmin && formData.email !== profile.email) {
        try {
          await adminOps.updateUserById(profile.user_id, { email: formData.email })
        } catch (emailErr: any) {
          console.warn('Não foi possível atualizar email no auth:', emailErr)
        }
      }

      // Update password if provided
      if (showPasswordSection && newPassword) {
        if (profile.user_id === user?.id) {
          const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })
          if (pwError) throw new Error(pwError.message)
        } else if (permissions.isAdmin) {
          try {
            await adminOps.updateUserById(profile.user_id, { password: newPassword })
          } catch (pwErr: any) {
            const pwMessage = pwErr?.message || ''
            if (/user not found/i.test(pwMessage)) {
              throw new Error('Usuário sem conta de autenticação ativa. Reenvie o convite para criar o acesso ou use o envio de recuperação de senha no painel.')
            }
            throw pwErr
          }
        }
      }

      toast.success('Perfil atualizado com sucesso!')
      onOpenChange(false)
      onProfileUpdated()
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error)
      const msg = error?.message || error?.error || 'Erro desconhecido'
      toast.error('Erro ao atualizar perfil: ' + msg)
    }
  }

  const canEditAdmin = permissions.isAdmin && profile?.user_id !== user?.id
  const canEditProfile = permissions.isAdmin || profile?.user_id === user?.id
  const canChangePassword = permissions.isAdmin || profile?.user_id === user?.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
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
              {permissions.isAdmin && <EmailValidation email={formData.email} />}
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

            {/* Password Change Section */}
            {canChangePassword && (
              <Collapsible open={showPasswordSection} onOpenChange={setShowPasswordSection}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Alterar Senha
                    </span>
                    {showPasswordSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div>
                    <Label htmlFor="new_password">Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="new_password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordRequirements password={newPassword} />
                  </div>
                  <div>
                    <Label htmlFor="confirm_password">Confirmar Senha</Label>
                    <div className="relative">
                      <Input
                        id="confirm_password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordMatchIndicator password={newPassword} confirmPassword={confirmPassword} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={
                (showPasswordSection && newPassword ? (!isPasswordValid(newPassword) || newPassword !== confirmPassword) : false) ||
                (permissions.isAdmin && !isEmailValid(formData.email))
              }>Salvar Alterações</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
