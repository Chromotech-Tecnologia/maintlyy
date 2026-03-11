import React, { useState, useEffect, useRef } from "react"
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
import { Eye, EyeOff, Phone, User, Mail, Lock, CheckCircle2, ArrowLeft } from "lucide-react"
import { PasswordRequirements, PasswordMatchIndicator, isPasswordValid } from "@/components/ui/password-requirements"
import { AppFooter } from "@/components/layout/AppFooter"

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
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const signupForm = useForm({
    defaultValues: { display_name: "", email: "", phone: "" },
  })

  const watchedEmail = signupForm.watch("email")

  useEffect(() => {
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current)
    setEmailExists(false)

    if (!isValidEmail(watchedEmail)) return

    setCheckingEmail(true)
    emailCheckTimer.current = setTimeout(async () => {
      try {
        const { data } = await supabase.rpc('check_email_exists', { _email: watchedEmail })
        setEmailExists(!!data)
      } catch {
        // ignore
      } finally {
        setCheckingEmail(false)
      }
    }, 500)

    return () => { if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current) }
  }, [watchedEmail])

  if (user) return <Navigate to="/dashboard" replace />

  const handleSignIn = async (data: LoginFormData) => {
    const { error } = await signIn(data.email, data.password)
    if (error) {
      toast.error(error.message || "Erro ao fazer login")
    } else {
      toast.success("Login realizado com sucesso!")
    }
  }

  const handleSignUp = async (data: any) => {
    if (!data.display_name || !data.email || !data.phone) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }
    if (!isValidEmail(data.email)) {
      toast.error("Email inválido")
      return
    }
    if (emailExists) return

    // Generate a random temporary password (user will set their own via email)
    const tempPassword = crypto.randomUUID() + 'A1!'

    const signUpResult = await signUp(data.email, tempPassword, data.display_name, data.phone)

    if (signUpResult.error) {
      const msg = signUpResult.error.message || ""
      if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")) {
        setEmailExists(true)
      } else {
        toast.error(msg || "Erro ao criar conta")
      }
    } else {
      // Send password reset email so user can set their own password
      await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      setSignupSuccess(true)
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
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
        <AppFooter className="mt-6" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <a href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4 self-center">
        <ArrowLeft className="h-4 w-4" />
        Voltar para Home
      </a>
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
                      {isValidEmail(field.value) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {checkingEmail ? (
                            <span className="text-xs text-muted-foreground">Verificando...</span>
                          ) : emailExists ? (
                            <span className="text-xs text-destructive flex items-center gap-1">✗ Já existe uma conta com este email</span>
                          ) : (
                            <span className="text-xs text-success flex items-center gap-1">✓ Email disponível</span>
                          )}
                        </div>
                      )}
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
                  {signupSuccess ? (
                    <div className="text-center space-y-4 py-4">
                      <div className="flex justify-center">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <CheckCircle2 className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Cadastro realizado!</h3>
                        <p className="text-sm text-muted-foreground">
                          Enviamos um email para <strong>{signupForm.getValues("email")}</strong> com um link para criar sua senha e acessar o sistema.
                        </p>
                        <p className="text-xs text-muted-foreground">Verifique também a pasta de spam.</p>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => { setSignupSuccess(false); signupForm.reset() }}>
                        Voltar
                      </Button>
                    </div>
                  ) : (
                    <Button type="submit" className="w-full" disabled={
                      signupForm.formState.isSubmitting || 
                      !isValidEmail(signupForm.watch("email")) ||
                      emailExists ||
                      checkingEmail ||
                      !signupForm.watch("display_name") ||
                      !signupForm.watch("phone")
                    }>
                      {signupForm.formState.isSubmitting ? "Criando conta..." : "Criar conta"}
                    </Button>
                  )}
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <AppFooter className="mt-6" />
    </div>
  )
}
