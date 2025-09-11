import CryptoJS from 'crypto-js'
import DOMPurify from 'dompurify'

// Encryption key derivation from user ID (in production, use more robust key management)
const deriveKey = (userId: string): string => {
  const salt = 'maintly-security-salt-2024'
  return CryptoJS.PBKDF2(userId, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString()
}

// Encrypt sensitive data
export const encryptPassword = (password: string, userId: string): string => {
  if (!password || !userId) return password
  
  try {
    const key = deriveKey(userId)
    const encrypted = CryptoJS.AES.encrypt(password, key).toString()
    return encrypted
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Falha ao criptografar senha')
  }
}

// Decrypt sensitive data
export const decryptPassword = (encryptedPassword: string, userId: string): string => {
  if (!encryptedPassword || !userId) return encryptedPassword
  
  try {
    const key = deriveKey(userId)
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, key)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    
    // Se não conseguir descriptografar (dados antigos ou chave diferente),
    // devolve o valor original sem gerar erros no console.
    if (!decrypted) {
      return encryptedPassword
    }
    
    return decrypted
  } catch {
    // Evita poluir o console com erros repetidos; mantém compatibilidade
    return encryptedPassword
  }
}

// Sanitize HTML input to prevent XSS
export const sanitizeInput = (input: string): string => {
  if (!input) return input
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  })
}

// Validate and sanitize form data
export const sanitizeFormData = <T extends Record<string, any>>(data: T): T => {
  const sanitized = {} as T
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeInput(value) as T[keyof T]
    } else {
      sanitized[key as keyof T] = value
    }
  }
  
  return sanitized
}

// Generic error messages to avoid information leakage
export const getGenericErrorMessage = (error: any): string => {
  // Log the actual error for debugging (in production, send to logging service)
  if (process.env.NODE_ENV === 'development') {
    console.error('Detailed error:', error)
  }
  
  // Return generic messages based on error type
  if (error?.message?.includes('unique constraint')) {
    return 'Este item já existe no sistema'
  }
  
  if (error?.message?.includes('foreign key')) {
    return 'Erro de referência nos dados'
  }
  
  if (error?.message?.includes('not null')) {
    return 'Campos obrigatórios não preenchidos'
  }
  
  if (error?.message?.includes('permission')) {
    return 'Você não tem permissão para esta operação'
  }
  
  if (error?.message?.includes('network') || error?.message?.includes('connection')) {
    return 'Erro de conexão. Tente novamente.'
  }
  
  // Default generic message
  return 'Ocorreu um erro. Tente novamente.'
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

export const isRateLimited = (identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
  const now = Date.now()
  const userAttempts = rateLimitMap.get(identifier)
  
  if (!userAttempts || now - userAttempts.lastReset > windowMs) {
    rateLimitMap.set(identifier, { count: 1, lastReset: now })
    return false
  }
  
  if (userAttempts.count >= maxAttempts) {
    return true
  }
  
  userAttempts.count++
  return false
}

// Reset rate limit for identifier
export const resetRateLimit = (identifier: string): void => {
  rateLimitMap.delete(identifier)
}