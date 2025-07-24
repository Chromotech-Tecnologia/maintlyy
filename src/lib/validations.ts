import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
})

export const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A senha deve conter ao menos uma letra minúscula, uma maiúscula e um número'),
})

export const clienteSchema = z.object({
  nome_cliente: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  empresa_terceira_id: z.string().uuid('ID da empresa inválido'),
})

export const equipeSchema = z.object({
  nome_equipe: z.string().min(1, 'Nome da equipe é obrigatório').max(255, 'Nome muito longo'),
  membros: z.string().optional(),
})

export const tipoManutencaoSchema = z.object({
  nome_tipo_manutencao: z.string().min(1, 'Nome do tipo é obrigatório').max(255, 'Nome muito longo'),
  descricao: z.string().optional(),
})

export const cofreSenhaSchema = z.object({
  nome_acesso: z.string().min(1, 'Nome do acesso é obrigatório').max(255, 'Nome muito longo'),
  senha: z.string().min(1, 'Senha é obrigatória'),
  login: z.string().optional(),
  url_acesso: z.string().url('URL inválida').optional().or(z.literal('')),
  descricao: z.string().optional(),
  grupo: z.string().optional(),
  cliente_id: z.string().uuid('Cliente inválido').optional().or(z.literal('')),
  empresa_terceira_id: z.string().uuid('Empresa inválida').optional().or(z.literal('')),
})

export const manutencaoSchema = z.object({
  cliente_id: z.string().uuid('Cliente é obrigatório'),
  empresa_terceira_id: z.string().uuid('Empresa terceira é obrigatória'),
  tipo_manutencao_id: z.string().uuid('Tipo de manutenção é obrigatório'),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  hora_inicio: z.string().min(1, 'Hora de início é obrigatória'),
  responsavel: z.string().optional(),
  solicitante: z.string().optional(),
  descricao: z.string().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
export type ClienteFormData = z.infer<typeof clienteSchema>
export type EquipeFormData = z.infer<typeof equipeSchema>
export type TipoManutencaoFormData = z.infer<typeof tipoManutencaoSchema>
export type CofreSenhaFormData = z.infer<typeof cofreSenhaSchema>
export type ManutencaoFormData = z.infer<typeof manutencaoSchema>