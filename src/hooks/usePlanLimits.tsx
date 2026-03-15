import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"

interface PlanLimits {
  planName: string | null
  planTipo: string | null
  maxUsers: number
  maxTeams: number
  maxEmpresas: number
  maxManutencoes: number
  maxSenhas: number
  currentUsers: number
  currentTeams: number
  currentEmpresas: number
  currentManutencoesMes: number
  currentSenhas: number
  canCreateUser: boolean
  canCreateTeam: boolean
  canCreateEmpresa: boolean
  canCreateManutencao: boolean
  canCreateSenha: boolean
  loading: boolean
}

export function usePlanLimits(): PlanLimits {
  const { user } = useAuth()
  const [limits, setLimits] = useState<PlanLimits>({
    planName: null,
    planTipo: null,
    maxUsers: 0,
    maxTeams: 0,
    maxEmpresas: 0,
    maxManutencoes: 0,
    maxSenhas: 0,
    currentUsers: 0,
    currentTeams: 0,
    currentEmpresas: 0,
    currentManutencoesMes: 0,
    currentSenhas: 0,
    canCreateUser: true,
    canCreateTeam: true,
    canCreateEmpresa: true,
    canCreateManutencao: true,
    canCreateSenha: true,
    loading: true,
  })

  useEffect(() => {
    if (!user) return
    const fetchLimits = async () => {
      // Get admin's profile with plan_id
      const { data: profileRaw } = await supabase
        .from('user_profiles')
        .select('plan_id, is_admin')
        .eq('user_id', user.id)
        .maybeSingle()

      const profile = profileRaw as any
      if (!profile || !profile.is_admin) {
        setLimits(prev => ({ ...prev, loading: false }))
        return
      }

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

      // Count current empresas
      const { count: empresaCount } = await supabase
        .from('empresas_terceiras')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      const currentEmpresas = empresaCount || 0

      // Count current month manutencoes
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      const { count: manutCount } = await supabase
        .from('manutencoes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('data_inicio', firstDay)
        .lte('data_inicio', lastDay)
      const currentManutencoesMes = manutCount || 0

      // Count current senhas
      const { count: senhaCount } = await supabase
        .from('cofre_senhas')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      const currentSenhas = senhaCount || 0

      if (!profile.plan_id) {
        // No plan assigned - no creation allowed
        setLimits({
          planName: null,
          planTipo: null,
          maxUsers: 0,
          maxTeams: 0,
          maxEmpresas: 0,
          maxManutencoes: 0,
          maxSenhas: 0,
          currentUsers,
          currentTeams,
          currentEmpresas,
          currentManutencoesMes,
          currentSenhas,
          canCreateUser: false,
          canCreateTeam: false,
          canCreateEmpresa: false,
          canCreateManutencao: false,
          canCreateSenha: false,
          loading: false,
        })
        return
      }

      // Fetch the plan details
      const { data: planRaw } = await supabase
        .from('landing_plans')
        .select('nome, tipo, max_usuarios, max_equipes, max_manutencoes, max_empresas, max_senhas')
        .eq('id', profile.plan_id)
        .maybeSingle()

      const plan = planRaw as any
      if (!plan) {
        setLimits(prev => ({ ...prev, loading: false }))
        return
      }

      const maxUsers = plan.max_usuarios || 1
      const maxTeams = plan.max_equipes || 0
      const maxEmpresas = plan.max_empresas || 0
      const maxManutencoes = plan.max_manutencoes || 0
      const maxSenhas = plan.max_senhas || 0

      let canCreateUser = true
      if (plan.tipo === 'individual') {
        canCreateUser = false
      } else {
        canCreateUser = currentUsers < maxUsers
      }

      const canCreateTeam = maxTeams === 0 ? true : currentTeams < maxTeams
      const canCreateEmpresa = maxEmpresas === 0 ? true : currentEmpresas < maxEmpresas
      const canCreateManutencao = maxManutencoes === 0 ? true : currentManutencoesMes < maxManutencoes
      const canCreateSenha = maxSenhas === 0 ? true : currentSenhas < maxSenhas

      setLimits({
        planName: plan.nome,
        planTipo: plan.tipo,
        maxUsers,
        maxTeams,
        maxEmpresas,
        maxManutencoes,
        maxSenhas,
        currentUsers,
        currentTeams,
        currentEmpresas,
        currentManutencoesMes,
        currentSenhas,
        canCreateUser,
        canCreateTeam,
        canCreateEmpresa,
        canCreateManutencao,
        canCreateSenha,
        loading: false,
      })
    }
    fetchLimits()
  }, [user])

  return limits
}
