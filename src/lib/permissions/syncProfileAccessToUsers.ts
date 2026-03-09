import { supabase } from "@/integrations/supabase/client"
import type {
  ClientAccessRow,
  EmpresaAccessRow,
  PasswordAccessRow,
} from "@/components/permissions/ProfileAccessEditor"

export async function syncProfileAccessToUsers(
  profileId: string,
  access: {
    clientAccess: ClientAccessRow[]
    empresaAccess: EmpresaAccessRow[]
    passwordAccess: PasswordAccessRow[]
  }
) {
  const { data: users, error: usersError } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("permission_profile_id", profileId)

  if (usersError) throw usersError
  if (!users || users.length === 0) return

  for (const u of users) {
    // Sync client permissions
    await supabase.from("user_client_permissions").delete().eq("user_id", u.user_id)
    if (access.clientAccess.length > 0) {
      const rows = access.clientAccess.map((ca) => ({
        user_id: u.user_id,
        cliente_id: ca.cliente_id,
        can_view: ca.can_view || false,
        can_edit: ca.can_edit || false,
        can_create: ca.can_create || false,
        can_delete: ca.can_delete || false,
      }))
      const { error } = await supabase.from("user_client_permissions").insert(rows)
      if (error) throw error
    }

    // Sync empresa permissions
    await supabase.from("user_empresa_permissions").delete().eq("user_id", u.user_id)
    if (access.empresaAccess.length > 0) {
      const rows = access.empresaAccess.map((ea) => ({
        user_id: u.user_id,
        empresa_terceira_id: ea.empresa_terceira_id,
        can_view: ea.can_view || false,
        can_edit: ea.can_edit || false,
        can_delete: ea.can_delete || false,
        can_create_manutencao: ea.can_create_manutencao || false,
      }))
      const { error } = await supabase.from("user_empresa_permissions").insert(rows)
      if (error) throw error
    }

    // Sync password permissions
    await supabase.from("user_password_permissions").delete().eq("user_id", u.user_id)
    if (access.passwordAccess.length > 0) {
      const rows = access.passwordAccess.map((pa) => ({
        user_id: u.user_id,
        senha_id: pa.senha_id,
        can_view: pa.can_view || false,
        can_edit: pa.can_edit || false,
      }))
      const { error } = await supabase.from("user_password_permissions").insert(rows)
      if (error) throw error
    }
  }
}
