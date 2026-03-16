

## Plano: Monitoramento Avançado com Testes Completos

### Contexto
Atualmente o módulo faz apenas um `fetch GET` simples. Vamos expandir para executar uma bateria completa de testes por ciclo, salvar resultados detalhados, e exibir um relatório rico na UI.

### Limitações Técnicas Importantes
- **ICMP Ping**: Impossivel em Edge Functions (Deno não tem socket raw). Alternativa: TCP connect test nas portas 80/443 (simulado via fetch com timeout curto).
- **Tempo real**: Edge Functions não suportam WebSockets persistentes. A melhor opção é usar **Supabase Realtime** (subscription na tabela `url_check_logs`) para que a UI atualize instantaneamente quando novos logs são inseridos, combinado com polling frequente (mínimo 1 min via pg_cron). Isso dá experiência "quase tempo real".
- **IPs/modems/routers**: Supabase Edge Functions rodam na cloud, então só conseguem testar IPs públicos acessíveis pela internet (não IPs de rede local).

---

### 1. Migração de Banco de Dados

Adicionar coluna `test_results` (JSONB) na tabela `url_check_logs` para armazenar todos os testes detalhados de cada ciclo:

```sql
ALTER TABLE url_check_logs 
ADD COLUMN IF NOT EXISTS test_results jsonb DEFAULT '[]'::jsonb;

-- Adicionar campo keyword na monitored_urls para verificação de conteúdo
ALTER TABLE monitored_urls 
ADD COLUMN IF NOT EXISTS keyword text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'url'; -- 'url' ou 'ip'
```

Estrutura do `test_results` (array de objetos):
```json
[
  {"test": "http_get", "status": "ok", "value": "200", "time_ms": 342, "detail": "HTTP 200 OK"},
  {"test": "http_head", "status": "ok", "value": "200", "time_ms": 120, "detail": "HEAD 200"},
  {"test": "ssl_check", "status": "ok", "value": "45 dias", "time_ms": 15, "detail": "Expira em 2026-04-30"},
  {"test": "dns_resolve", "status": "ok", "value": "resolved", "time_ms": 23, "detail": "DNS resolvido com sucesso"},
  {"test": "tcp_80", "status": "ok", "value": "open", "time_ms": 45, "detail": "Porta 80 aberta"},
  {"test": "tcp_443", "status": "ok", "value": "open", "time_ms": 52, "detail": "Porta 443 aberta"},
  {"test": "keyword", "status": "fail", "value": "not found", "time_ms": 0, "detail": "Palavra 'login' não encontrada"},
  {"test": "redirect_check", "status": "ok", "value": "1 redirect", "time_ms": 0, "detail": "Redirecionou para https://..."}
]
```

### 2. Edge Function `check-urls` Expandida

Reescrever para executar por URL a seguinte bateria de testes:

| Teste | Método | O que mede |
|-------|--------|------------|
| **HTTP GET** | fetch GET | Status code + response time + conteúdo |
| **HTTP HEAD** | fetch HEAD | Tempo de resposta sem body |
| **TCP Port 80** | fetch com timeout curto para http://host:80 | Porta aberta |
| **TCP Port 443** | fetch com timeout curto para https://host:443 | Porta aberta |
| **DNS Resolve** | Tentar fetch e capturar erros de DNS | Resolução DNS ok |
| **SSL Check** | Extrair info do certificado via resposta HTTPS | Validade SSL |
| **Keyword Check** | Buscar palavra-chave no body (se configurada) | Conteúdo esperado presente |
| **Redirect Check** | Verificar se houve redirects | Quantos e para onde |
| **Content-Type** | Verificar header content-type | Tipo de conteúdo retornado |

Para IPs: executar apenas TCP 80/443 + HTTP GET (sem SSL/DNS check).

Cada teste é executado individualmente com try/catch e tempo medido. Todos os resultados vão no array `test_results`.

### 3. Frontend - Nova Aba "Detalhes" + Link Externo

**Mudanças na UI:**

- **Botão "Abrir Site"**: Link externo (`target="_blank"`) ao lado de cada URL na lista
- **Nova aba "Detalhes do Monitoramento"**: Ao clicar em um site, mostra:
  - Resumo do último ciclo com todos os testes em cards/tabela colorida (OK verde, FAIL vermelho)
  - Cada teste: nome, resultado, tempo, status, timestamp
  - Histórico dos últimos N ciclos (configurável, default 10)
  - Expandir cada ciclo para ver todos os testes daquela rodada
- **Campo "Palavra-chave"** no dialog de criação/edição de URL
- **Campo "Tipo"**: URL ou IP (para modems/routers/servers)
- **Supabase Realtime**: Subscription na tabela `url_check_logs` para atualizar a UI automaticamente quando novos logs chegam

### 4. Monitoramento "Tempo Real"

Implementar Supabase Realtime listener:
```typescript
supabase.channel('url-checks')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'url_check_logs' }, 
    payload => { /* atualizar estado local */ })
  .subscribe()
```
Isso faz com que quando o cron/scheduler insere um novo log, a UI atualiza instantaneamente sem refresh. Combinado com intervalo mínimo de 1 minuto no pg_cron, é o mais próximo de "tempo real" possível no nosso stack.

### 5. Relatório por Email Atualizado

Atualizar `send-monitor-report` para incluir os resultados detalhados dos testes na tabela HTML do email.

---

### Arquivos a Modificar/Criar

1. **Migration SQL** - Adicionar `test_results`, `keyword`, `tipo`
2. **`supabase/functions/check-urls/index.ts`** - Reescrever com bateria completa de testes
3. **`src/pages/MonitoramentoSites.tsx`** - Nova aba Detalhes, botão abrir site, campo keyword/tipo, Realtime subscription
4. **`supabase/functions/send-monitor-report/index.ts`** - Incluir detalhes dos testes no relatório
5. **`src/integrations/supabase/types.ts`** - Atualizado automaticamente após migration

### Estimativa: ~5 tarefas principais

