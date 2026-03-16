/**
 * Helpers for generating detailed audit log entries
 */

// Field label translations for readable audit summaries
const FIELD_LABELS: Record<string, string> = {
  nome_empresa: 'Nome da Empresa',
  ativo: 'Status',
  nome_cliente: 'Nome do Cliente',
  email: 'Email',
  telefone: 'Telefone',
  cnpj: 'CNPJ',
  endereco: 'Endereço',
  empresa_terceira_id: 'Empresa',
  logo_url: 'Logo',
  nome_equipe: 'Nome da Equipe',
  membros: 'Membros',
  nome_tipo_manutencao: 'Nome do Tipo',
  descricao: 'Descrição',
  cliente_id: 'Cliente',
  tipo_manutencao_id: 'Tipo de Manutenção',
  equipe_id: 'Equipe',
  equipe_ids: 'Equipes',
  data_inicio: 'Data Início',
  hora_inicio: 'Hora Início',
  data_fim: 'Data Fim',
  hora_fim: 'Hora Fim',
  status: 'Status',
  solicitante: 'Solicitante',
  responsavel: 'Responsável',
  nome_acesso: 'Nome do Acesso',
  login: 'Login',
  url_acesso: 'URL de Acesso',
  grupo: 'Grupo',
  nome: 'Nome',
  url: 'URL',
  keyword: 'Palavra-chave',
  tipo: 'Tipo',
  check_interval_minutes: 'Intervalo (min)',
  nome_perfil: 'Nome do Perfil',
  display_name: 'Nome',
  phone: 'Telefone',
  is_admin: 'Administrador',
  account_status: 'Status da Conta',
  permission_profile_id: 'Perfil de Permissão',
}

// Value formatters for specific field types
function formatValue(key: string, value: any, nameMap?: Record<string, string>): string {
  if (value === null || value === undefined || value === '') return '(vazio)'
  if (value === true) return 'Sim'
  if (value === false) return 'Não'
  if (key === 'ativo') return value ? 'Ativo' : 'Inativo'
  // For ID fields, try to resolve name from nameMap
  if (key.endsWith('_id') && nameMap && nameMap[value]) return nameMap[value]
  if (Array.isArray(value)) {
    if (value.length === 0) return '(nenhum)'
    return value.map(v => nameMap?.[v] || v).join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key
}

/**
 * Generate details for a CREATE action - includes all non-empty fields
 */
export function createDetails(
  fields: Record<string, any>,
  nameMap?: Record<string, string>
): Record<string, any> {
  const campos: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'user_id' || key === 'id' || key === 'created_at' || key === 'updated_at') continue
    if (value === null || value === undefined || value === '') continue
    campos[key] = formatValue(key, value, nameMap)
  }
  return { tipo: 'criacao', campos }
}

/**
 * Generate details for an UPDATE action - shows only changed fields with before/after
 */
export function updateDetails(
  oldRecord: Record<string, any>,
  newFields: Record<string, any>,
  nameMap?: Record<string, string>
): Record<string, any> {
  const alteracoes: Record<string, { de: string; para: string }> = {}
  for (const [key, newValue] of Object.entries(newFields)) {
    if (key === 'user_id' || key === 'id' || key === 'created_at' || key === 'updated_at') continue
    const oldValue = oldRecord[key]
    // Compare values
    const oldStr = formatValue(key, oldValue, nameMap)
    const newStr = formatValue(key, newValue, nameMap)
    if (oldStr !== newStr) {
      alteracoes[key] = { de: oldStr, para: newStr }
    }
  }
  if (Object.keys(alteracoes).length === 0) return { tipo: 'edicao', alteracoes: {}, resumo: 'Nenhum campo alterado' }
  return { tipo: 'edicao', alteracoes }
}

/**
 * Generate details for a DELETE action - includes key fields of deleted record
 */
export function deleteDetails(
  record: Record<string, any>,
  nameMap?: Record<string, string>
): Record<string, any> {
  const campos: Record<string, string> = {}
  for (const [key, value] of Object.entries(record)) {
    if (key === 'user_id' || key === 'id' || key === 'created_at' || key === 'updated_at') continue
    if (value === null || value === undefined || value === '') continue
    if (typeof value === 'object' && !Array.isArray(value)) continue // skip nested objects
    campos[key] = formatValue(key, value, nameMap)
  }
  return { tipo: 'exclusao', campos }
}

/**
 * Generate a human-readable summary from audit details
 */
export function generateSummary(action: string, resourceType: string, details: any): string {
  if (!details) return ''
  
  const resourceLabel = RESOURCE_TYPE_LABELS[resourceType] || resourceType

  if (details.tipo === 'criacao' && details.campos) {
    const fieldCount = Object.keys(details.campos).length
    const preview = Object.entries(details.campos).slice(0, 3)
      .map(([k, v]) => `${getFieldLabel(k)}: ${v}`)
      .join(', ')
    return `Criou ${resourceLabel} com ${fieldCount} campo(s): ${preview}`
  }

  if (details.tipo === 'edicao' && details.alteracoes) {
    const changes = Object.entries(details.alteracoes)
    if (changes.length === 0) return details.resumo || 'Nenhuma alteração detectada'
    const preview = changes.slice(0, 3)
      .map(([k, v]: [string, any]) => `${getFieldLabel(k)}: "${v.de}" → "${v.para}"`)
      .join('; ')
    return `Alterou ${changes.length} campo(s): ${preview}`
  }

  if (details.tipo === 'exclusao' && details.campos) {
    const preview = Object.entries(details.campos).slice(0, 3)
      .map(([k, v]) => `${getFieldLabel(k)}: ${v}`)
      .join(', ')
    return `Excluiu ${resourceLabel}: ${preview}`
  }

  // Fallback for old-format details
  return JSON.stringify(details).slice(0, 100)
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  manutencao: 'Manutenção',
  cliente: 'Cliente',
  empresa: 'Empresa',
  equipe: 'Equipe',
  cofre_senha: 'Senha',
  tipo_manutencao: 'Tipo Manutenção',
  usuario: 'Usuário',
  monitoramento: 'Monitoramento',
  permissao: 'Permissão',
  grupo_cofre: 'Grupo Cofre',
  pacote: 'Pacote',
  relatorio: 'Relatório',
  agendamento: 'Agendamento',
}
