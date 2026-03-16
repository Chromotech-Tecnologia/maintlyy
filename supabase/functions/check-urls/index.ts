import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestResult {
  test: string
  status: 'ok' | 'fail' | 'skip'
  value: string
  time_ms: number
  detail: string
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

function extractHostFromUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0]
  }
}

function isIpAddress(host: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(':')
}

async function timedFetch(url: string, options: RequestInit & { signal?: AbortSignal }, timeoutMs = 15000): Promise<{ response: Response; timeMs: number }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const start = performance.now()
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    const timeMs = Math.round(performance.now() - start)
    clearTimeout(timeout)
    return { response, timeMs }
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

async function testHttpGet(url: string, keyword?: string | null): Promise<{ results: TestResult[]; body: string; statusCode: number | null; responseTimeMs: number | null; isOnline: boolean; errorMessage: string | null }> {
  const results: TestResult[] = []
  let body = ''
  let statusCode: number | null = null
  let responseTimeMs: number | null = null
  let isOnline = false
  let errorMessage: string | null = null

  try {
    const { response, timeMs } = await timedFetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Maintly-Monitor/2.0' },
      redirect: 'follow',
    })
    statusCode = response.status
    responseTimeMs = timeMs
    isOnline = response.status >= 200 && response.status < 400
    body = await response.text()

    results.push({
      test: 'http_get',
      status: isOnline ? 'ok' : 'fail',
      value: String(response.status),
      time_ms: timeMs,
      detail: `HTTP ${response.status} ${response.statusText || ''}`.trim(),
    })

    // Content-Type check
    const contentType = response.headers.get('content-type') || 'desconhecido'
    results.push({
      test: 'content_type',
      status: 'ok',
      value: contentType.split(';')[0].trim(),
      time_ms: 0,
      detail: `Content-Type: ${contentType}`,
    })

    // Redirect check
    if (response.redirected) {
      results.push({
        test: 'redirect_check',
        status: 'ok',
        value: 'redirected',
        time_ms: 0,
        detail: `Redirecionou para ${response.url}`,
      })
    } else {
      results.push({
        test: 'redirect_check',
        status: 'ok',
        value: 'no redirect',
        time_ms: 0,
        detail: 'Sem redirecionamento',
      })
    }

    // Keyword check
    if (keyword) {
      const found = body.toLowerCase().includes(keyword.toLowerCase())
      results.push({
        test: 'keyword',
        status: found ? 'ok' : 'fail',
        value: found ? 'encontrado' : 'não encontrado',
        time_ms: 0,
        detail: found ? `Palavra-chave "${keyword}" encontrada` : `Palavra-chave "${keyword}" NÃO encontrada`,
      })
    }
  } catch (err: any) {
    errorMessage = translateError(err.message || 'Falha na conexão')
    results.push({
      test: 'http_get',
      status: 'fail',
      value: 'error',
      time_ms: 0,
      detail: errorMessage,
    })
  }

  return { results, body, statusCode, responseTimeMs, isOnline, errorMessage }
}

async function testHttpHead(url: string): Promise<TestResult> {
  try {
    const { response, timeMs } = await timedFetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Maintly-Monitor/2.0' },
      redirect: 'follow',
    }, 10000)
    // Consume body just in case
    await response.text().catch(() => {})
    return {
      test: 'http_head',
      status: response.status >= 200 && response.status < 400 ? 'ok' : 'fail',
      value: String(response.status),
      time_ms: timeMs,
      detail: `HEAD ${response.status} ${response.statusText || ''}`.trim(),
    }
  } catch (err: any) {
    return {
      test: 'http_head',
      status: 'fail',
      value: 'error',
      time_ms: 0,
      detail: translateError(err.message || 'Falha HEAD'),
    }
  }
}

async function testTcpPort(host: string, port: number): Promise<TestResult> {
  const protocol = port === 443 ? 'https' : 'http'
  const testUrl = `${protocol}://${host}:${port}/`
  try {
    const { response, timeMs } = await timedFetch(testUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Maintly-Monitor/2.0' },
      redirect: 'manual',
    }, 8000)
    await response.text().catch(() => {})
    return {
      test: `tcp_${port}`,
      status: 'ok',
      value: 'aberta',
      time_ms: timeMs,
      detail: `Porta ${port} aberta (${response.status})`,
    }
  } catch (err: any) {
    const msg = (err.message || '').toLowerCase()
    if (msg.includes('connection refused')) {
      return { test: `tcp_${port}`, status: 'fail', value: 'fechada', time_ms: 0, detail: `Porta ${port} fechada (conexão recusada)` }
    }
    if (msg.includes('timed out') || msg.includes('aborted')) {
      return { test: `tcp_${port}`, status: 'fail', value: 'filtrada', time_ms: 0, detail: `Porta ${port} filtrada (timeout)` }
    }
    return { test: `tcp_${port}`, status: 'fail', value: 'erro', time_ms: 0, detail: `Porta ${port}: ${translateError(err.message)}` }
  }
}

async function testDnsResolve(host: string): Promise<TestResult> {
  // We can't do a direct DNS lookup in Deno Edge Functions, but we can detect DNS failure from a fetch
  const testUrl = `https://${host}/`
  try {
    const start = performance.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(testUrl, { method: 'HEAD', signal: controller.signal, redirect: 'manual' })
    clearTimeout(timeout)
    const timeMs = Math.round(performance.now() - start)
    await response.text().catch(() => {})
    return { test: 'dns_resolve', status: 'ok', value: 'resolvido', time_ms: timeMs, detail: 'DNS resolvido com sucesso' }
  } catch (err: any) {
    const msg = (err.message || '').toLowerCase()
    if (msg.includes('dns') || msg.includes('lookup') || msg.includes('resolve')) {
      return { test: 'dns_resolve', status: 'fail', value: 'falha', time_ms: 0, detail: 'Falha na resolução DNS' }
    }
    // If the error is not DNS-related, DNS likely resolved fine but connection failed for another reason
    return { test: 'dns_resolve', status: 'ok', value: 'resolvido', time_ms: 0, detail: 'DNS resolvido (erro de conexão subsequente)' }
  }
}

async function testSslCheck(host: string): Promise<TestResult> {
  // In Edge Functions we can't access raw TLS certificate info.
  // We check if HTTPS connection succeeds and detect SSL errors from fetch exceptions.
  const testUrl = `https://${host}/`
  try {
    const start = performance.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(testUrl, { method: 'HEAD', signal: controller.signal, redirect: 'manual' })
    clearTimeout(timeout)
    const timeMs = Math.round(performance.now() - start)
    await response.text().catch(() => {})
    return { test: 'ssl_check', status: 'ok', value: 'válido', time_ms: timeMs, detail: 'Certificado SSL válido (conexão HTTPS ok)' }
  } catch (err: any) {
    const msg = (err.message || '').toLowerCase()
    if (msg.includes('ssl') || msg.includes('certificate') || msg.includes('tls')) {
      return { test: 'ssl_check', status: 'fail', value: 'inválido', time_ms: 0, detail: `Erro SSL: ${translateError(err.message)}` }
    }
    // Non-SSL error means SSL handshake likely passed
    return { test: 'ssl_check', status: 'ok', value: 'válido', time_ms: 0, detail: 'SSL ok (erro de conexão não relacionado a certificado)' }
  }
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

    const now = new Date()
    const results: any[] = []

    for (const urlEntry of urls) {
      // Check interval
      const { data: lastCheck } = await supabase
        .from('url_check_logs')
        .select('checked_at')
        .eq('monitored_url_id', urlEntry.id)
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastCheck) {
        const minutesSinceLastCheck = (now.getTime() - new Date(lastCheck.checked_at).getTime()) / 60000
        if (minutesSinceLastCheck < urlEntry.check_interval_minutes) {
          continue
        }
      }

      const host = extractHostFromUrl(urlEntry.url)
      const isIp = isIpAddress(host) || urlEntry.tipo === 'ip'
      const testResults: TestResult[] = []

      // 1. HTTP GET (main test) + content-type + redirect + keyword
      const httpGetResult = await testHttpGet(urlEntry.url, urlEntry.keyword)
      testResults.push(...httpGetResult.results)

      // 2. HTTP HEAD
      const headResult = await testHttpHead(urlEntry.url)
      testResults.push(headResult)

      // 3. DNS Resolve (skip for IPs)
      if (!isIp) {
        const dnsResult = await testDnsResolve(host)
        testResults.push(dnsResult)
      } else {
        testResults.push({ test: 'dns_resolve', status: 'skip', value: '-', time_ms: 0, detail: 'Ignorado para IPs' })
      }

      // 4. SSL Check (skip for IPs and non-HTTPS)
      if (!isIp && urlEntry.url.startsWith('https')) {
        const sslResult = await testSslCheck(host)
        testResults.push(sslResult)
      } else {
        testResults.push({ test: 'ssl_check', status: 'skip', value: '-', time_ms: 0, detail: isIp ? 'Ignorado para IPs' : 'URL não usa HTTPS' })
      }

      // 5. TCP Port 80
      const tcp80 = await testTcpPort(host, 80)
      testResults.push(tcp80)

      // 6. TCP Port 443
      const tcp443 = await testTcpPort(host, 443)
      testResults.push(tcp443)

      // Insert log
      const { error: logError } = await supabase
        .from('url_check_logs')
        .insert({
          monitored_url_id: urlEntry.id,
          status_code: httpGetResult.statusCode,
          response_time_ms: httpGetResult.responseTimeMs,
          is_online: httpGetResult.isOnline,
          error_message: httpGetResult.errorMessage,
          test_results: testResults,
        })

      if (logError) {
        console.error('Error inserting log:', logError)
      }

      results.push({
        url: urlEntry.url,
        nome: urlEntry.nome,
        is_online: httpGetResult.isOnline,
        status_code: httpGetResult.statusCode,
        response_time_ms: httpGetResult.responseTimeMs,
        error: httpGetResult.errorMessage,
        tests: testResults.length,
        tests_ok: testResults.filter(t => t.status === 'ok').length,
        tests_fail: testResults.filter(t => t.status === 'fail').length,
      })

      // Alert if site went down
      if (!httpGetResult.isOnline) {
        const { data: prevCheck } = await supabase
          .from('url_check_logs')
          .select('is_online')
          .eq('monitored_url_id', urlEntry.id)
          .order('checked_at', { ascending: false })
          .limit(1)
          .range(1, 1)
          .maybeSingle()

        if (prevCheck?.is_online === true) {
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
