import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"

interface PlanLimits {
  planName: string | null
  planTipo: string | null
  maxUsers: number
  maxTeams: number
  currentUsers: number
  currentTeams: number
  canCreateUser: boolean
  canCreateTeam: boolean
  loading: boolean
  isTrial: boolean
}

export function usePlanLimits(): PlanLimits {
  const { user } = useAuth()
  const [limits, setLimits] = useState<PlanLimits>({
    planName: null,
    planTipo: null,
    maxUsers: 0,
    maxTeams: 0,
    currentUsers: 0,
    currentTeams: 0,
    canCreateUser: true,
    canCreateTeam: true,
    loading: true,
    isTrial: false,
  })

  useEffect(() => {
    if (!user) return
    const fetchLimits = async () => {
      // Get admin's profile with plan_id
      const { data: profileRaw } = await supabase
        .from('user_profiles')
        .select('plan_id, is_admin, account_status')
        .eq('user_id', user.id)
        .maybeSingle()

      const profile = profileRaw as any
      if (!profile || !profile.is_admin) {
        setLimits(prev => ({ ...prev, loading: false }))
        return
      }

      const isTrial = profile.account_status === 'trial'

      // Count current sub-users
      const { data: permProfiles } = await supabase
        .from('permission_profiles')
        .select('id')
        .eq('user_id', user.id)

      const profileIds = (permProfiles || []).map(p => p.id)
      let currentUsers = 0
      if (profileIds.length > 0) {
        const { count } = await supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .in('permission_profile_id', profileIds)
        currentUsers = count || 0
      }

      // Count current teams
      const { count: teamCount } = await supabase
        .from('equipes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      const currentTeams = teamCount || 0

      if (!profile.plan_id) {
        // Trial - allow reasonable defaults
        setLimits({
          planName: null,
          planTipo: null,
          maxUsers: isTrial ? 5 : 0,
          maxTeams: isTrial ? 3 : 0,
          currentUsers,
          currentTeams,
          canCreateUser: isTrial,
          canCreateTeam: isTrial,
          loading: false,
          isTrial,
        })
        return
      }

      // Fetch the plan details
      const { data: planRaw } = await supabase
        .from('landing_plans')
        .select('nome, tipo, max_usuarios, max_equipes')
        .eq('id', profile.plan_id)
        .maybeSingle()

      const plan = planRaw as any
      if (!plan) {
        setLimits(prev => ({ ...prev, loading: false, isTrial }))
        return
      }

      const maxUsers = plan.max_usuarios || 1
      const maxTeams = plan.max_equipes || 0

      let canCreateUser = true
      if (plan.tipo === 'individual') {
        canCreateUser = false
      } else {
        canCreateUser = currentUsers < maxUsers
      }

      const canCreateTeam = maxTeams === 0 ? true : currentTeams < maxTeams

      setLimits({
        planName: plan.nome,
        planTipo: plan.tipo,
        maxUsers,
        maxTeams,
        currentUsers,
        currentTeams,
        canCreateUser,
        canCreateTeam,
        loading: false,
        isTrial,
      })
    }
    fetchLimits()
  }, [user])

  return limits
}
