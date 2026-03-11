import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { PasswordRequirements, PasswordMatchIndicator, isPasswordValid } from "@/components/ui/password-requirements"
import { AppFooter } from "@/components/layout/AppFooter"

export default function SetupPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    // Supabase invite links contain type=invite or type=recovery in the hash
    if (hash.includes("type=invite") || hash.includes("type=recovery") || hash.includes("type=signup")) {
      setIsValid(true)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsValid(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isPasswordValid(password)) {
      toast.error("A senha não atende aos requisitos mínimos")
      return
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      // Update account status from pending_invite to active
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ account_status: 'active' })
          .eq('user_id', user.id)
          .eq('account_status', 'pending_invite')
      }

      toast.success("Senha criada com sucesso! Bem-vindo ao Maintly!")
      navigate("/")
    } catch (error: any) {
      toast.error("Erro ao criar senha: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img src="/lovable-uploads/d0885aef-121a-4a46-81cf-7d5f3c5199cc.png" alt="Maintly Logo" className="h-16 mx-auto" />
            </div>
            <CardTitle>Link inválido</CardTitle>
            <CardDescription>Este link de convite é inválido ou expirou.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/login")}>Voltar ao Login</Button>
          </CardContent>
        </Card>
        <AppFooter className="mt-6" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src="/lovable-uploads/d0885aef-121a-4a46-81cf-7d5f3c5199cc.png" alt="Maintly Logo" className="h-16 mx-auto" />
          </div>
          <CardTitle>Criar sua Senha</CardTitle>
          <CardDescription>Você foi convidado para o Maintly. Crie sua senha para acessar o sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crie uma senha segura"
                  required
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordRequirements password={password} />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordMatchIndicator password={password} confirmPassword={confirmPassword} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !isPasswordValid(password) || password !== confirmPassword}>
              {loading ? "Criando..." : "Criar Senha e Acessar"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <AppFooter className="mt-6" />
    </div>
  )
}
