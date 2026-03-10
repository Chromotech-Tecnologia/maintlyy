import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminOperationRequest {
  operation: 'getUserById' | 'updateUserById' | 'listUsers' | 'disableUser' | 'enableUser' | 'deleteUser' | 'setTrialPeriod' | 'activatePermanent' | 'getAdminStats'
  userId?: string
  updateData?: {
    email?: string
    password?: string
  }
  trialDays?: number
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

    // Use service role client for auth validation to avoid RLS issues
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

    // Check admin or super admin using service role
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

    // Operations that require super admin
    const superAdminOps = ['disableUser', 'enableUser', 'deleteUser', 'setTrialPeriod', 'activatePermanent', 'getAdminStats']
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
        
        // Unban if was banned
        result = await supabaseAdmin.auth.admin.updateUserById(body.userId, { ban_duration: 'none' })
        break
      }

      case 'activatePermanent': {
        if (!body.userId) return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        const { error: activateError } = await supabaseAdmin.from('user_profiles').update({
          account_status: 'active',
          is_permanent: true,
          trial_days: 0,
          trial_start: null,
        }).eq('user_id', body.userId)
        
        if (activateError) {
          console.error('Error activating permanent:', activateError)
          return new Response(JSON.stringify({ error: 'Failed to activate: ' + activateError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        
        result = await supabaseAdmin.auth.admin.updateUserById(body.userId, { ban_duration: 'none' })
        break
      }

      case 'getAdminStats': {
        // Get all admin profiles (is_admin = true, not super_admin)
        const { data: adminProfiles } = await supabaseAdmin
          .from('user_profiles')
          .select('user_id, display_name, email, phone, is_admin, is_super_admin, account_status, trial_days, trial_start, is_permanent, created_at')
          .eq('is_admin', true)
          .order('created_at', { ascending: false })

        const admins = (adminProfiles || []).filter(a => !a.is_super_admin)
        
        const statsPromises = admins.map(async (admin) => {
          const [usersRes, clientsRes, senhasRes] = await Promise.all([
            supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }).neq('user_id', admin.user_id).eq('is_admin', false),
            supabaseAdmin.from('clientes').select('id', { count: 'exact', head: true }).eq('user_id', admin.user_id),
            supabaseAdmin.from('cofre_senhas').select('id', { count: 'exact', head: true }).eq('user_id', admin.user_id),
          ])
          
          // Count sub-users: profiles that have a permission_profile owned by this admin
          const { data: adminPermProfiles } = await supabaseAdmin
            .from('permission_profiles')
            .select('id')
            .eq('user_id', admin.user_id)
          
          const profileIds = (adminPermProfiles || []).map(p => p.id)
          let subUserCount = 0
          if (profileIds.length > 0) {
            const { count } = await supabaseAdmin
              .from('user_profiles')
              .select('id', { count: 'exact', head: true })
              .in('permission_profile_id', profileIds)
          subUserCount = count || 0
          }

          return {
            ...admin,
            stats: {
              usuarios: subUserCount,
              clientes: clientsRes.count || 0,
              senhas: senhasRes.count || 0,
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
