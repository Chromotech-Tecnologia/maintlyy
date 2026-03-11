import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminOperationRequest {
  operation: 'getUserById' | 'updateUserById' | 'listUsers' | 'disableUser' | 'enableUser' | 'deleteUser' | 'setTrialPeriod' | 'activatePermanent' | 'getAdminStats' | 'inviteUser' | 'sendPasswordReset' | 'cancelPlan'
  userId?: string
  updateData?: {
    email?: string
    password?: string
  }
  trialDays?: number
  planId?: string
  // inviteUser fields
  email?: string
  displayName?: string
  isAdmin?: boolean
  permissionProfileId?: string
  phone?: string
  redirectTo?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError?.message)
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: profile, error: profileError } = await supabaseAuth
      .from('user_profiles')
      .select('is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single()

    if (profileError || (!profile?.is_admin && !profile?.is_super_admin)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body: AdminOperationRequest = await req.json()
    const isSuperAdmin = profile?.is_super_admin === true

    const superAdminOps = ['disableUser', 'enableUser', 'deleteUser', 'setTrialPeriod', 'activatePermanent', 'getAdminStats', 'cancelPlan']
    if (superAdminOps.includes(body.operation) && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Only super admins can perform this operation' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    let result

    switch (body.operation) {
      case 'getUserById':
        if (!body.userId) return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        result = await supabaseAdmin.auth.admin.getUserById(body.userId)
        break

      case 'updateUserById':
        if (!body.userId || !body.updateData) return new Response(JSON.stringify({ error: 'userId and updateData are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        result = await supabaseAdmin.auth.admin.updateUserById(body.userId, body.updateData)
        break

      case 'listUsers':
        result = await supabaseAdmin.auth.admin.listUsers()
        break

      case 'inviteUser': {
        if (!body.email) return new Response(JSON.stringify({ error: 'email is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        
        const redirectUrl = body.redirectTo || 'https://maintlyy.lovable.app/setup-password'
        
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          body.email,
          { redirectTo: redirectUrl }
        )
        
        if (inviteError) {
          console.error('Invite error:', inviteError)
          return new Response(JSON.stringify({ error: 'Failed to invite user: ' + inviteError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Create user_profiles record
        const { error: profileInsertError } = await supabaseAdmin.from('user_profiles').insert({
          user_id: inviteData.user.id,
          email: body.email,
          display_name: body.displayName || null,
          phone: body.phone || null,
          is_admin: body.isAdmin || false,
          permission_profile_id: body.permissionProfileId || null,
          account_status: 'pending_invite',
        })

        if (profileInsertError) {
          console.error('Profile insert error:', profileInsertError)
          // Try to clean up the invited user
          await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id)
          return new Response(JSON.stringify({ error: 'Failed to create profile: ' + profileInsertError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Sync permissions from profile if assigned
        if (body.permissionProfileId) {
          const { data: permProfile } = await supabaseAdmin
            .from('permission_profiles')
            .select('client_access, empresa_access, password_access')
            .eq('id', body.permissionProfileId)
            .single()

          if (permProfile) {
            const clientAccess = Array.isArray(permProfile.client_access) ? permProfile.client_access : []
            const empresaAccess = Array.isArray(permProfile.empresa_access) ? permProfile.empresa_access : []
            const passwordAccess = Array.isArray(permProfile.password_access) ? permProfile.password_access : []

            if (clientAccess.length > 0) {
              await supabaseAdmin.from('user_client_permissions').insert(
                clientAccess.map((ca: any) => ({
                  user_id: inviteData.user.id, cliente_id: ca.cliente_id,
                  can_view: ca.can_view || false, can_edit: ca.can_edit || false,
                  can_create: ca.can_create || false, can_delete: ca.can_delete || false
                }))
              )
            }
            if (empresaAccess.length > 0) {
              await supabaseAdmin.from('user_empresa_permissions').insert(
                empresaAccess.map((ea: any) => ({
                  user_id: inviteData.user.id, empresa_terceira_id: ea.empresa_terceira_id,
                  can_view: ea.can_view || false, can_edit: ea.can_edit || false,
                  can_delete: ea.can_delete || false, can_create_manutencao: ea.can_create_manutencao || false
                }))
              )
            }
            if (passwordAccess.length > 0) {
              await supabaseAdmin.from('user_password_permissions').insert(
                passwordAccess.map((pa: any) => ({
                  user_id: inviteData.user.id, senha_id: pa.senha_id,
                  can_view: pa.can_view || false, can_edit: pa.can_edit || false
                }))
              )
            }
          }
        }

        result = { data: inviteData }
        break
      }

      case 'disableUser':
        if (!body.userId) return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        await supabaseAdmin.from('user_profiles').update({ account_status: 'disabled' }).eq('user_id', body.userId)
        result = await supabaseAdmin.auth.admin.updateUserById(body.userId, { ban_duration: '876000h' })
        break

      case 'enableUser':
        if (!body.userId) return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        await supabaseAdmin.from('user_profiles').update({ account_status: 'active' }).eq('user_id', body.userId)
        result = await supabaseAdmin.auth.admin.updateUserById(body.userId, { ban_duration: 'none' })
        break

      case 'deleteUser':
        if (!body.userId) return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        await supabaseAdmin.from('user_profiles').delete().eq('user_id', body.userId)
        result = await supabaseAdmin.auth.admin.deleteUser(body.userId)
        break

      case 'setTrialPeriod': {
        if (!body.userId) return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        const days = body.trialDays
        if (!days || days < 1) return new Response(JSON.stringify({ error: 'trialDays must be a positive number' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        
        const { error: updateError } = await supabaseAdmin.from('user_profiles').update({
          account_status: 'trial',
          trial_days: days,
          trial_start: new Date().toISOString().split('T')[0],
          is_permanent: false,
        }).eq('user_id', body.userId)
        
        if (updateError) {
          console.error('Error updating profile for trial:', updateError)
          return new Response(JSON.stringify({ error: 'Failed to update profile: ' + updateError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        
        result = await supabaseAdmin.auth.admin.updateUserById(body.userId, { ban_duration: 'none' })
        break
      }

      case 'activatePermanent': {
        if (!body.userId) return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        const activatePayload: any = {
          account_status: 'active',
          is_permanent: true,
          trial_days: 0,
          trial_start: null,
        }
        if (body.planId) {
          activatePayload.plan_id = body.planId
        }
        const { error: activateError } = await supabaseAdmin.from('user_profiles').update(activatePayload).eq('user_id', body.userId)
        
        if (activateError) {
          console.error('Error activating permanent:', activateError)
          return new Response(JSON.stringify({ error: 'Failed to activate: ' + activateError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        
        result = await supabaseAdmin.auth.admin.updateUserById(body.userId, { ban_duration: 'none' })
        break
      }

      case 'sendPasswordReset': {
        if (!body.userId) return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        
        // Get user email
        const { data: resetUser, error: resetUserError } = await supabaseAdmin.auth.admin.getUserById(body.userId)
        if (resetUserError || !resetUser?.user?.email) {
          return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        
        // Generate recovery link
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: resetUser.user.email,
          options: {
            redirectTo: body.redirectTo || undefined,
          }
        })
        
        if (linkError) {
          console.error('Error generating recovery link:', linkError)
          return new Response(JSON.stringify({ error: 'Failed to send reset email: ' + linkError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        
        result = { data: { message: 'Password reset email sent' } }
        break
      }

      case 'getAdminStats': {
        const { data: adminProfiles } = await supabaseAdmin
          .from('user_profiles')
          .select('user_id, display_name, email, phone, is_admin, is_super_admin, account_status, trial_days, trial_start, is_permanent, created_at')
          .eq('is_admin', true)
          .order('created_at', { ascending: false })

        const admins = (adminProfiles || []).filter(a => !a.is_super_admin)
        
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const sevenDaysAgoISO = sevenDaysAgo.toISOString()

        const statsPromises = admins.map(async (admin) => {
          const { data: adminPermProfiles } = await supabaseAdmin
            .from('permission_profiles')
            .select('id')
            .eq('user_id', admin.user_id)
          
          const profileIds = (adminPermProfiles || []).map(p => p.id)
          
          let subUserCount = 0
          let subUserRecent = 0
          const subUsers: { display_name: string | null; email: string | null }[] = []
          
          if (profileIds.length > 0) {
            const { data: subUserData, count } = await supabaseAdmin
              .from('user_profiles')
              .select('display_name, email, created_at', { count: 'exact' })
              .in('permission_profile_id', profileIds)
            subUserCount = count || 0
            
            if (subUserData) {
              subUsers.push(...subUserData.map(u => ({ display_name: u.display_name, email: u.email })))
              subUserRecent = subUserData.filter(u => u.created_at >= sevenDaysAgoISO).length
            }
          }

          const [clientsRes, clientsRecentRes, senhasRes, senhasRecentRes, manutRes, manutRecentRes, empresasRes, empresasRecentRes] = await Promise.all([
            supabaseAdmin.from('clientes').select('id', { count: 'exact', head: true }).eq('user_id', admin.user_id),
            supabaseAdmin.from('clientes').select('id', { count: 'exact', head: true }).eq('user_id', admin.user_id).gte('created_at', sevenDaysAgoISO),
            supabaseAdmin.from('cofre_senhas').select('id', { count: 'exact', head: true }).eq('user_id', admin.user_id),
            supabaseAdmin.from('cofre_senhas').select('id', { count: 'exact', head: true }).eq('user_id', admin.user_id).gte('created_at', sevenDaysAgoISO),
            supabaseAdmin.from('manutencoes').select('id', { count: 'exact', head: true }).eq('user_id', admin.user_id),
            supabaseAdmin.from('manutencoes').select('id', { count: 'exact', head: true }).eq('user_id', admin.user_id).gte('created_at', sevenDaysAgoISO),
            supabaseAdmin.from('empresas_terceiras').select('id', { count: 'exact', head: true }).eq('user_id', admin.user_id),
            supabaseAdmin.from('empresas_terceiras').select('id', { count: 'exact', head: true }).eq('user_id', admin.user_id).gte('created_at', sevenDaysAgoISO),
          ])

          return {
            ...admin,
            sub_users: subUsers,
            stats: {
              usuarios: { total: subUserCount, recent: subUserRecent },
              clientes: { total: clientsRes.count || 0, recent: clientsRecentRes.count || 0 },
              senhas: { total: senhasRes.count || 0, recent: senhasRecentRes.count || 0 },
              manutencoes: { total: manutRes.count || 0, recent: manutRecentRes.count || 0 },
              empresas: { total: empresasRes.count || 0, recent: empresasRecentRes.count || 0 },
            }
          }
        })

        const adminsWithStats = await Promise.all(statsPromises)
        return new Response(JSON.stringify({ admins: adminsWithStats }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid operation' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
