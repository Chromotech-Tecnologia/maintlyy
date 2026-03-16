import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { useCallback } from "react"

interface AuditLogParams {
  action: 'create' | 'update' | 'delete'
  resourceType: string
  resourceId?: string
  resourceName?: string
  details?: Record<string, any>
}

export function useAuditLog() {
  const { user } = useAuth()

  const log = useCallback(async (params: AuditLogParams) => {
    if (!user) return
    
    // Determine tenant_admin_id
    let tenantAdminId = user.id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin, permission_profile_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profile && !profile.is_admin && profile.permission_profile_id) {
      const { data: pp } = await supabase
        .from('permission_profiles')
        .select('user_id')
        .eq('id', profile.permission_profile_id)
        .maybeSingle()
      if (pp) tenantAdminId = pp.user_id
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      tenant_admin_id: tenantAdminId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      resource_name: params.resourceName || null,
      details: params.details || {},
    })
  }, [user])

  return { log }
}
