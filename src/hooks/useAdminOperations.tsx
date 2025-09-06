import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"

interface AdminOperationRequest {
  operation: 'getUserById' | 'updateUserById' | 'listUsers'
  userId?: string
  updateData?: {
    email?: string
  }
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
      throw response.error
    }

    return response.data
  }

  const getUserById = async (userId: string) => {
    return callAdminOperation({ operation: 'getUserById', userId })
  }

  const updateUserById = async (userId: string, updateData: { email?: string }) => {
    return callAdminOperation({ operation: 'updateUserById', userId, updateData })
  }

  const listUsers = async () => {
    return callAdminOperation({ operation: 'listUsers' })
  }

  return {
    getUserById,
    updateUserById,
    listUsers
  }
}