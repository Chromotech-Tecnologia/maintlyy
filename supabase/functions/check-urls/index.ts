import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function translateError(msg: string): string {
  if (!msg) return msg
  const lower = msg.toLowerCase()
  if (lower.includes('dns error') || lower.includes('failed to lookup address'))
    return 'Erro de DNS: não foi possível resolver o endereço do site'
  if (lower.includes('connection refused'))
    return 'Conexão recusada: o servidor não está aceitando conexões'
  if (lower.includes('connection reset'))
    return 'Conexão resetada pelo servidor'
  if (lower.includes('timed out') || lower.includes('timeout') || lower.includes('aborted'))
    return 'Tempo esgotado: o site não respondeu dentro do limite'
  if (lower.includes('ssl') || lower.includes('certificate') || lower.includes('tls'))
    return 'Erro de certificado SSL/TLS'
  if (lower.includes('connection failed') || lower.includes('network'))
    return 'Falha na conexão de rede'
  if (lower.includes('too many redirects'))
    return 'Muitos redirecionamentos'
  return msg
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    // Fetch all active monitored URLs
    const { data: urls, error: urlsError } = await supabase
      .from('monitored_urls')
      .select('*')
      .eq('ativo', true)

    if (urlsError) {
      console.error('Error fetching URLs:', urlsError)
      return new Response(JSON.stringify({ error: urlsError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!urls || urls.length === 0) {
      return new Response(JSON.stringify({ message: 'No URLs to check' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // For each URL, check if it needs checking based on interval
    const now = new Date()
    const results: any[] = []

    for (const urlEntry of urls) {
      // Get latest check for this URL
      const { data: lastCheck } = await supabase
        .from('url_check_logs')
        .select('checked_at')
        .eq('monitored_url_id', urlEntry.id)
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastCheck) {
        const lastCheckTime = new Date(lastCheck.checked_at)
        const minutesSinceLastCheck = (now.getTime() - lastCheckTime.getTime()) / 60000
        if (minutesSinceLastCheck < urlEntry.check_interval_minutes) {
          continue // Skip, not time yet
        }
      }

      // Perform the check
      let statusCode: number | null = null
      let responseTimeMs: number | null = null
      let isOnline = false
      let errorMessage: string | null = null

      try {
        const startTime = performance.now()
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

        const response = await fetch(urlEntry.url, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'User-Agent': 'Maintly-Monitor/1.0' },
          redirect: 'follow',
        })

        clearTimeout(timeout)
        const endTime = performance.now()

        statusCode = response.status
        responseTimeMs = Math.round(endTime - startTime)
        isOnline = response.status >= 200 && response.status < 400

        // Consume body to avoid resource leak
        await response.text()
      } catch (err: any) {
        errorMessage = translateError(err.message || 'Falha na conexão')
        isOnline = false
      }

      // Insert log
      const { error: logError } = await supabase
        .from('url_check_logs')
        .insert({
          monitored_url_id: urlEntry.id,
          status_code: statusCode,
          response_time_ms: responseTimeMs,
          is_online: isOnline,
          error_message: errorMessage,
        })

      if (logError) {
        console.error('Error inserting log:', logError)
      }

      results.push({
        url: urlEntry.url,
        nome: urlEntry.nome,
        is_online: isOnline,
        status_code: statusCode,
        response_time_ms: responseTimeMs,
        error: errorMessage,
      })

      // Check if site went down (was online before, now offline)
      if (!isOnline) {
        const { data: prevCheck } = await supabase
          .from('url_check_logs')
          .select('is_online')
          .eq('monitored_url_id', urlEntry.id)
          .order('checked_at', { ascending: false })
          .limit(1)
          .range(1, 1) // Skip the one we just inserted
          .maybeSingle()

        if (prevCheck?.is_online === true) {
          // Site just went down - log for alert system
          console.log(`ALERT: ${urlEntry.nome} (${urlEntry.url}) went offline!`)
        }
      }
    }

    return new Response(JSON.stringify({ checked: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
