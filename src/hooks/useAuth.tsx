import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signUp: (email: string, password: string, displayName: string, phone: string) => Promise<{ error?: any; needsConfirmation?: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, displayName: string, phone: string) => {
    const redirectUrl = `${window.location.origin}/`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    })

    if (error) return { error }

    // Email already registered
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { error: { message: 'Este email já está cadastrado. Tente fazer login.' } }
    }

    // If session exists (autoconfirm), create profile as tenant admin with free plan
    if (data.session && data.user) {
      try {
        // Find default free plan
        let planId: string | null = null
        const { data: freePlan } = await supabase
          .from('landing_plans')
          .select('id')
          .eq('offer_free_signup', true)
          .eq('ativo', true)
          .order('ordem')
          .limit(1)
          .maybeSingle()

        if (freePlan) {
          planId = freePlan.id
        }

        await supabase.from('user_profiles').insert([{
          user_id: data.user.id,
          email: email,
          display_name: displayName,
          phone: phone,
          is_admin: true,
          account_status: 'active',
          plan_id: planId,
        }])
      } catch (profileError) {
        console.error('Erro ao criar perfil:', profileError)
      }
    }

    const needsConfirmation = !data.session
    return { error: null, needsConfirmation }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
