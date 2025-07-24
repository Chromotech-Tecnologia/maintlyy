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
export type ManutencaoFormData = z.infer<typeof manutencaoSchema>