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
}

export function usePermissions(): UserPermissions {
  const { user } = useAuth()
  const [clientPermissions, setClientPermissions] = useState<any[]>([])
  const [systemPermissions, setSystemPermissions] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    if (user) {
      fetchPermissions()
    } else {
      // Reset quando não há usuário
      setUserProfile(null)
      setClientPermissions([])
      setSystemPermissions([])
    }
  }, [user])

  const fetchPermissions = async () => {
    if (!user) return

    try {
      // Buscar perfil do usuário
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setUserProfile(profile)

      // Sempre buscar permissões específicas, mesmo para admins (para exibição)
      // Buscar permissões de clientes
      const { data: clientPerms } = await supabase
        .from('user_client_permissions')
        .select('*')
        .eq('user_id', user.id)

      setClientPermissions(clientPerms || [])

      // Buscar permissões de sistema
      const { data: systemPerms } = await supabase
        .from('user_system_permissions')
        .select('*')
        .eq('user_id', user.id)

      setSystemPermissions(systemPerms || [])
    } catch (error) {
      console.error('Erro ao buscar permissões:', error)
    }
  }

  const canViewClient = (clienteId: string): boolean => {
    // Admin sempre tem acesso total
    if (userProfile?.is_admin) return true
    return clientPermissions.some(p => p.cliente_id === clienteId && p.can_view)
  }

  const canEditClient = (clienteId: string): boolean => {
    // Admin sempre tem acesso total
    if (userProfile?.is_admin) return true
    return clientPermissions.some(p => p.cliente_id === clienteId && p.can_edit)
  }

  const canCreateClient = (clienteId: string): boolean => {
    // Admin sempre tem acesso total
    if (userProfile?.is_admin) return true
    return clientPermissions.some(p => p.cliente_id === clienteId && p.can_create)
  }

  const canDeleteClient = (clienteId: string): boolean => {
    // Admin sempre tem acesso total
    if (userProfile?.is_admin) return true
    return clientPermissions.some(p => p.cliente_id === clienteId && p.can_delete)
  }

  const canViewSystem = (resource: string): boolean => {
    // Admin sempre tem acesso total a todos os recursos
    if (userProfile?.is_admin) return true
    return systemPermissions.some(p => p.resource_type === resource && p.can_view)
  }

  const canEditSystem = (resource: string): boolean => {
    // Admin sempre tem acesso total a todos os recursos
    if (userProfile?.is_admin) return true
    return systemPermissions.some(p => p.resource_type === resource && p.can_edit)
  }

  const canCreateSystem = (resource: string): boolean => {
    // Admin sempre tem acesso total a todos os recursos
    if (userProfile?.is_admin) return true
    return systemPermissions.some(p => p.resource_type === resource && p.can_create)
  }

  const canDeleteSystem = (resource: string): boolean => {
    // Admin sempre tem acesso total a todos os recursos
    if (userProfile?.is_admin) return true
    return systemPermissions.some(p => p.resource_type === resource && p.can_delete)
  }

  return {
    canViewClient,
    canEditClient,
    canCreateClient,
    canDeleteClient,
    canViewSystem,
    canEditSystem,
    canCreateSystem,
    canDeleteSystem,
    hasAnyClientView: clientPermissions.some(p => p.can_view),
    isAdmin: userProfile?.is_admin || false
  }
}