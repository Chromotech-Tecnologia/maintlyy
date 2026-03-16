

# Módulo de Monitoramento de Sites (Uptime Monitor)

## Visão Geral

Novo módulo completo para monitorar URLs, verificar status online/offline, medir tempo de resposta, e enviar relatórios por email. Inclui integração com permissões e planos.

## Estrutura do Módulo

### 1. Banco de Dados — Novas Tabelas

**`monitored_urls`** — URLs cadastradas para monitoramento
- `id`, `user_id`, `url`, `nome`, `cliente_id` (opcional), `empresa_terceira_id` (opcional)
- `check_interval_minutes` (frequência de check, ex: 60 = 1x por hora)
- `ativo` (boolean), `created_at`, `updated_at`

**`url_check_logs`** — Histórico de cada verificação
- `id`, `monitored_url_id`, `status_code` (int), `response_time_ms` (int)
- `is_online` (boolean), `error_message` (text), `screenshot_url` (text, nullable)
- `checked_at` (timestamptz)

**`monitor_schedules`** — Configuração de agendamento de relatórios
- `id`, `user_id`
- `report_type`: `'daily'` (relatório completo) ou `'alert'` (apenas NOK)
- `frequency_minutes` (frequência de checks para alertas)
- `report_time` (time — horário de envio do relatório diário)
- `email_destinatario`, `ativo`, `created_at`

### 2. Coluna no Plano

- Adicionar `max_urls` (integer, default 0) na tabela `landing_plans`

### 3. Edge Function: `check-urls`

- Executada via pg_cron (a cada 5 minutos)
- Busca URLs ativas cujo último check foi há mais tempo que `check_interval_minutes`
- Para cada URL: faz `fetch` e registra `status_code`, `response_time_ms`, `is_online`
- Se site estava online e agora está offline → marca para alerta
- Screenshots: captura via API externa (ex: `https://api.screenshotmachine.com` ou similar) — requer API key; pode ser implementado como fase 2
- Classificação de velocidade: `< 500ms` = Rápido, `500-2000ms` = Normal, `> 2000ms` = Lento

### 4. Edge Function: `send-monitor-report`

- Executada via pg_cron (a cada minuto, verifica se há relatórios agendados para enviar)
- **Relatório Diário**: envia todos os sites com status, tempo de resposta, último check
- **Alerta Emergencial**: envia imediatamente quando um site cai (apenas NOK)
- Usa o sistema de email existente (se configurado) ou registra para envio

### 5. Página Frontend: `/monitoramento`

- CRUD de URLs monitoradas (nome, URL, cliente associado, frequência de check)
- Dashboard com status atual de cada site (badge verde/vermelho/amarelo)
- Tempo de resposta com indicador visual (Rápido/Normal/Lento)
- Histórico de uptime por URL (últimas 24h, 7 dias)
- Configuração de agendamento de relatórios (horário, frequência, email)
- Configuração de alertas emergenciais (frequência de check, email)

### 6. Integrações no Sistema Existente

**Permissões** (`PermissionProfiles.tsx`):
- Adicionar `{ key: 'monitoramento', label: 'Monitoramento' }` em `SYSTEM_RESOURCES`

**Sidebar** (`AppSidebar.tsx` e `MobileNav.tsx`):
- Novo item "Monitoramento" com ícone `Activity` ou `Globe`

**Planos** (`PlansManager.tsx`):
- Campo "Máx. URLs monitoradas" no formulário

**Plan Limits** (`usePlanLimits.tsx`):
- Adicionar `maxUrls`, `currentUrls`, `canCreateUrl`

**Rotas** (`App.tsx`):
- Adicionar `/monitoramento` → `MonitoramentoSites`

## Arquivos a Criar/Editar

### Criar
- `src/pages/MonitoramentoSites.tsx` — Página principal do módulo
- `supabase/functions/check-urls/index.ts` — Edge function de verificação
- `supabase/functions/send-monitor-report/index.ts` — Edge function de relatórios
- Migration SQL para as 3 tabelas + coluna `max_urls` em `landing_plans`

### Editar
- `src/App.tsx` — Nova rota
- `src/components/layout/AppSidebar.tsx` — Novo item no menu
- `src/components/layout/MobileNav.tsx` — Novo item no menu mobile
- `src/pages/PermissionProfiles.tsx` — Novo recurso de permissão
- `src/components/superadmin/PlansManager.tsx` — Campo max_urls
- `src/hooks/usePlanLimits.tsx` — Limite de URLs
- `supabase/config.toml` — Registrar novas edge functions
- `supabase/functions/admin-operations/index.ts` — Suporte a max_urls no updatePlanLimits

## Observações Importantes

- **Screenshots**: A captura de tela requer uma API externa (ex: ScreenshotMachine, URLBox). Na primeira versão, o sistema registra status + tempo de resposta. Screenshots podem ser adicionados quando uma API key for configurada.
- **Email**: O envio de relatórios depende da infraestrutura de email estar configurada. Na primeira versão, os dados ficam disponíveis na UI e o sistema prepara o conteúdo para envio.
- **pg_cron**: Necessário para agendar as verificações automáticas. Será configurado via SQL insert.

