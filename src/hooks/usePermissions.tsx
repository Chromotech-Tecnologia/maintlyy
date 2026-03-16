import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"

interface UserPermissions {
  canViewClient: (clienteId: string) => boolean
  canEditClient: (clienteId: string) => boolean
  canCreateClient: (clienteId: string) => boolean
  canDeleteClient: (clienteId: string) => boolean
  canViewSystem: (resource: string) => boolean
  canEditSystem: (resource: string) => boolean
  canCreateSystem: (resource: string) => boolean
  canDeleteSystem: (resource: string) => boolean
  hasAnyClientView: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  loading: boolean
  clientPermissions: any[]
  systemPermissions: any[]
}

export function usePermissions(): UserPermissions & { canViewDetailsSystem: (resource: string) => boolean } {
  const { user } = useAuth()
  const [clientPermissions, setClientPermissions] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [profilePermissions, setProfilePermissions] = useState<Record<string, any>>({})
  const [isAdminProfile, setIsAdminProfile] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchPermissions()
    } else {
      setUserProfile(null)
      setClientPermissions([])
      setProfilePermissions({})
      setIsAdminProfile(false)
      setLoading(false)
    }
  }, [user])

  const fetchPermissions = async () => {
    if (!user) return
    setLoading(true)

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setUserProfile(profile)

      let adminProfile = false

      if (profile?.permission_profile_id) {
        const { data: permProfile } = await supabase
          .from('permission_profiles')
          .select('*')
          .eq('id', profile.permission_profile_id)
          .single()

        if (permProfile) {
          adminProfile = permProfile.is_admin_profile || false
          setIsAdminProfile(adminProfile)
          setProfilePermissions(
            typeof permProfile.system_permissions === 'object' && permProfile.system_permissions !== null
              ? (permProfile.system_permissions as Record<string, any>)
              : {}
          )
        }
      } else {
        setIsAdminProfile(false)
        const { data: systemPerms } = await supabase
          .from('user_system_permissions')
          .select('*')
          .eq('user_id', user.id)

        const perms: Record<string, any> = {}
        systemPerms?.forEach(sp => {
          perms[sp.resource_type] = {
            can_view: sp.can_view,
            can_view_details: sp.can_view_details,
            can_edit: sp.can_edit,
            can_create: sp.can_create,
            can_delete: sp.can_delete,
          }
        })
        setProfilePermissions(perms)
      }

      let clientPerms: any[] = []
      // Admin profile users get full access just like tenant owners
      if (!profile?.is_admin && !adminProfile) {
        const { data } = await supabase
          .from('user_client_permissions')
          .select('*')
          .eq('user_id', user.id)
        clientPerms = data || []
      }
      setClientPermissions(clientPerms)
    } catch (error) {
      console.error('Erro ao buscar permissões:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper: is this user effectively an admin (tenant owner OR admin profile subordinate)
  const isEffectiveAdmin = userProfile?.is_admin || isAdminProfile


  const canViewClient = (clienteId: string): boolean => {
    if (isEffectiveAdmin) return true
    return clientPermissions.some(p => p.cliente_id === clienteId && p.can_view)
  }
  const canEditClient = (clienteId: string): boolean => {
    if (isEffectiveAdmin) return true
    return clientPermissions.some(p => p.cliente_id === clienteId && p.can_edit)
  }
  const canCreateClient = (clienteId: string): boolean => {
    if (isEffectiveAdmin) return true
    return clientPermissions.some(p => p.cliente_id === clienteId && p.can_create)
  }
  const canDeleteClient = (clienteId: string): boolean => {
    if (isEffectiveAdmin) return true
    return clientPermissions.some(p => p.cliente_id === clienteId && p.can_delete)
  }
  const canViewSystem = (resource: string): boolean => {
    if (isEffectiveAdmin) return true
    return profilePermissions[resource]?.can_view === true
  }
  const canViewDetailsSystem = (resource: string): boolean => {
    if (isEffectiveAdmin) return true
    return profilePermissions[resource]?.can_view_details === true
  }
  const canEditSystem = (resource: string): boolean => {
    if (isEffectiveAdmin) return true
    return profilePermissions[resource]?.can_edit === true
  }
  const canCreateSystem = (resource: string): boolean => {
    if (isEffectiveAdmin) return true
    return profilePermissions[resource]?.can_create === true
  }
  const canDeleteSystem = (resource: string): boolean => {
    if (isEffectiveAdmin) return true
    return profilePermissions[resource]?.can_delete === true
  }

  const systemPermissionsArray = Object.entries(profilePermissions).map(([resource, perms]) => ({
    resource_type: resource,
    ...perms
  }))

  return {
    canViewClient, canEditClient, canCreateClient, canDeleteClient,
    canViewSystem, canViewDetailsSystem, canEditSystem, canCreateSystem, canDeleteSystem,
    hasAnyClientView: isEffectiveAdmin || clientPermissions.some(p => p.can_view),
    isAdmin: isEffectiveAdmin,
    isSuperAdmin: userProfile?.is_super_admin || false,
    loading,
    clientPermissions,
    systemPermissions: systemPermissionsArray
  }
}
