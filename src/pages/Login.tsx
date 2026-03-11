import React, { useState } from "react"
import { Navigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import { loginSchema, signupSchema, type LoginFormData, type SignupFormData } from "@/lib/validations"
import { Eye, EyeOff, Phone, User, Mail, Lock } from "lucide-react"
import { PasswordRequirements, PasswordMatchIndicator, isPasswordValid } from "@/components/ui/password-requirements"

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export default function Login() {
  const { user, signIn, signUp } = useAuth()
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const signupForm = useForm<SignupFormData>({
    defaultValues: { display_name: "", email: "", phone: "", password: "", confirmPassword: "" },
  })

  if (user) return <Navigate to="/" replace />

  const handleSignIn = async (data: LoginFormData) => {
    const { error } = await signIn(data.email, data.password)
    if (error) {
      toast.error(error.message || "Erro ao fazer login")
    } else {
      toast.success("Login realizado com sucesso!")
    }
  }

  const handleSignUp = async (data: SignupFormData) => {
    const result = signupSchema.safeParse(data)
    if (!result.success) {
      const issues = result.error.issues || []
      for (const issue of issues) {
        const field = issue.path?.[0] as keyof SignupFormData | undefined
        if (field) {
          signupForm.setError(field, { message: issue.message })
        }
      }
      return
    }

    // Check if email already exists as a tenant (admin user)
    const { data: existingProfiles } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', data.email)
      .eq('is_admin', true)
      .limit(1)

    if (existingProfiles && existingProfiles.length > 0) {
      toast.error("Este email já está cadastrado no sistema.")
      signupForm.setError("email", { message: "Email já cadastrado" })
      return
    }

    const signUpResult = await signUp(data.email, data.password, data.display_name, data.phone)

    if (signUpResult.error) {
      toast.error(signUpResult.error.message || "Erro ao criar conta")
    } else if (signUpResult.needsConfirmation) {
      toast.success("Cadastro realizado! Verifique seu email para confirmar a conta.", { duration: 8000 })
    } else {
      toast.success("Cadastro realizado! Você tem 7 dias de teste gratuito.")
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail) { toast.error("Digite seu email"); return }
    setForgotLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    setForgotLoading(false)
    if (error) {
      toast.error("Erro ao enviar email: " + error.message)
    } else {
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.")
      setShowForgotPassword(false)
      setForgotEmail("")
    }
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img src="/lovable-uploads/d0885aef-121a-4a46-81cf-7d5f3c5199cc.png" alt="Maintly Logo" className="h-16 mx-auto" />
            </div>
            <CardTitle className="text-xl">Recuperar Senha</CardTitle>
            <CardDescription>Digite seu email para receber o link de recuperação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="email" placeholder="seu@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
            <Button className="w-full" onClick={handleForgotPassword} disabled={forgotLoading}>
              {forgotLoading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
            <div className="text-center">
              <button type="button" className="text-sm text-muted-foreground hover:text-primary underline" onClick={() => setShowForgotPassword(false)}>
                Voltar ao login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src="/lovable-uploads/d0885aef-121a-4a46-81cf-7d5f3c5199cc.png" alt="Maintly Logo" className="h-16 mx-auto" />
          </div>
          <CardDescription>Sistema de Gestão de Manutenções</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <FormField control={loginForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="email" placeholder="seu@email.com" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type={showLoginPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10" {...field} />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowLoginPassword(!showLoginPassword)}>
                            {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                    {loginForm.formState.isSubmitting ? "Entrando..." : "Entrar"}
                  </Button>
                  <div className="text-center">
                    <button type="button" className="text-sm text-muted-foreground hover:text-primary underline" onClick={() => setShowForgotPassword(true)}>
                      Esqueci minha senha
                    </button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <FormField control={signupForm.control} name="display_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Seu nome" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signupForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="email" placeholder="seu@email.com" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signupForm.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="tel" 
                            placeholder="(11) 99999-9999" 
                            className="pl-10" 
                            value={field.value}
                            onChange={(e) => field.onChange(formatPhone(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signupForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type={showSignupPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10" {...field} />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowSignupPassword(!showSignupPassword)}>
                            {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <PasswordRequirements password={field.value} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10" {...field} />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <PasswordMatchIndicator password={signupForm.watch("password")} confirmPassword={field.value} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={signupForm.formState.isSubmitting || !isPasswordValid(signupForm.watch("password")) || signupForm.watch("password") !== signupForm.watch("confirmPassword")}>
                    {signupForm.formState.isSubmitting ? "Criando conta..." : "Criar conta"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
