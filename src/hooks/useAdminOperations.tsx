import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"

type AdminOperation = 'getUserById' | 'updateUserById' | 'listUsers' | 'inviteUser' | 'resendInvite' | 'sendPasswordReset'

interface AdminOperationRequest {
  operation: AdminOperation
  userId?: string
  updateData?: {
    email?: string
    password?: string
  }
  email?: string
  displayName?: string
  isAdmin?: boolean
  permissionProfileId?: string
  phone?: string
  redirectTo?: string
}

export function useAdminOperations() {
  const { user } = useAuth()

  const callAdminOperation = async (request: AdminOperationRequest) => {
    if (!user) {
      throw new Error('No authenticated user')
    }

    const { data: session } = await supabase.auth.getSession()
    if (!session.session?.access_token) {
      throw new Error('No access token')
    }

    const response = await supabase.functions.invoke('admin-operations', {
      body: request,
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    })

    if (response.error) {
      const fnError = response.error as any
      let message = fnError?.message || 'Erro ao executar operação administrativa'

      if (fnError?.context && typeof fnError.context.json === 'function') {
        const errorBody = await fnError.context.json().catch(() => null)
        message = errorBody?.error || errorBody?.message || message
      }

      throw new Error(message)
    }

    return response.data
  }

  const getUserById = async (userId: string) => {
    return callAdminOperation({ operation: 'getUserById', userId })
  }

  const updateUserById = async (userId: string, updateData: { email?: string; password?: string }) => {
    return callAdminOperation({ operation: 'updateUserById', userId, updateData })
  }

  const listUsers = async () => {
    return callAdminOperation({ operation: 'listUsers' })
  }

  const inviteUser = async (data: {
    email: string
    displayName?: string
    isAdmin?: boolean
    permissionProfileId?: string
    phone?: string
  }) => {
    return callAdminOperation({
      operation: 'inviteUser',
      email: data.email,
      displayName: data.displayName,
      isAdmin: data.isAdmin,
      permissionProfileId: data.permissionProfileId,
      phone: data.phone,
      redirectTo: `${window.location.origin}/setup-password`,
    })
  }

  const sendPasswordReset = async (userId: string, redirectTo?: string) => {
    return callAdminOperation({
      operation: 'sendPasswordReset',
      userId,
      redirectTo,
    })
  }

  return {
    getUserById,
    updateUserById,
    listUsers,
    inviteUser,
    sendPasswordReset,
  }
}
