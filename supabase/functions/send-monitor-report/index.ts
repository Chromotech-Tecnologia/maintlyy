import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const body = await req.json().catch(() => ({}))
    const reportType = body.report_type || 'daily' // 'daily' or 'alert'
    const userId = body.user_id

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get all monitored URLs for this user
    const { data: urls } = await supabase
      .from('monitored_urls')
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)

    if (!urls || urls.length === 0) {
      return new Response(JSON.stringify({ message: 'No URLs to report' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get latest check for each URL
    const reportData: any[] = []
    for (const url of urls) {
      const { data: latestCheck } = await supabase
        .from('url_check_logs')
        .select('*')
        .eq('monitored_url_id', url.id)
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Get uptime stats for last 24h
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recentChecks } = await supabase
        .from('url_check_logs')
        .select('is_online')
        .eq('monitored_url_id', url.id)
        .gte('checked_at', twentyFourHoursAgo)

      const totalChecks = recentChecks?.length || 0
      const onlineChecks = recentChecks?.filter(c => c.is_online).length || 0
      const uptimePercent = totalChecks > 0 ? Math.round((onlineChecks / totalChecks) * 100) : 0

      const entry = {
        nome: url.nome,
        url: url.url,
        is_online: latestCheck?.is_online ?? false,
        status_code: latestCheck?.status_code,
        response_time_ms: latestCheck?.response_time_ms,
        last_checked: latestCheck?.checked_at,
        uptime_24h: uptimePercent,
        error_message: latestCheck?.error_message,
      }

      if (reportType === 'alert') {
        // Only include offline sites
        if (!entry.is_online) {
          reportData.push(entry)
        }
      } else {
        reportData.push(entry)
      }
    }

    // Build HTML report
    const reportTitle = reportType === 'alert' 
      ? '🚨 Alerta - Sites Fora do Ar' 
      : '📊 Relatório de Monitoramento'

    const now = new Date()
    const dateStr = now.toLocaleDateString('pt-BR')
    const timeStr = now.toLocaleTimeString('pt-BR')

    let reportHtml = `
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <h1 style="color: ${reportType === 'alert' ? '#dc2626' : '#1e40af'};">${reportTitle}</h1>
        <p style="color: #666;">Data: ${dateStr} às ${timeStr}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr style="background: #f1f5f9;">
            <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0;">Site</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #e2e8f0;">Status</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #e2e8f0;">Tempo</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #e2e8f0;">Uptime 24h</th>
          </tr>
    `

    for (const site of reportData) {
      const statusColor = site.is_online ? '#16a34a' : '#dc2626'
      const statusText = site.is_online ? '✅ Online' : '❌ Offline'
      const speedLabel = site.response_time_ms
        ? site.response_time_ms < 500 ? 'Rápido' : site.response_time_ms < 2000 ? 'Normal' : 'Lento'
        : '-'

      reportHtml += `
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">
            <strong>${site.nome}</strong><br>
            <small style="color: #666;">${site.url}</small>
          </td>
          <td style="padding: 10px; text-align: center; border: 1px solid #e2e8f0; color: ${statusColor}; font-weight: bold;">${statusText}</td>
          <td style="padding: 10px; text-align: center; border: 1px solid #e2e8f0;">${site.response_time_ms ? `${site.response_time_ms}ms (${speedLabel})` : '-'}</td>
          <td style="padding: 10px; text-align: center; border: 1px solid #e2e8f0;">${site.uptime_24h}%</td>
        </tr>
      `
    }

    reportHtml += `
        </table>
        <p style="margin-top: 20px; color: #999; font-size: 12px;">Relatório gerado automaticamente pelo Maintly.</p>
      </body>
      </html>
    `

    return new Response(JSON.stringify({ 
      report_type: reportType,
      sites_count: reportData.length,
      report_html: reportHtml,
      data: reportData,
    }), {
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
