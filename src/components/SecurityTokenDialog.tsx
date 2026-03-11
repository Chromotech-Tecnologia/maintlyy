import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { Loader2, Mail, ShieldCheck } from "lucide-react"

interface SecurityTokenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerified: () => void
  email: string
}

export function SecurityTokenDialog({ open, onOpenChange, onVerified, email }: SecurityTokenDialogProps) {
  const [otpCode, setOtpCode] = useState("")
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const sendOtp = useCallback(async () => {
    if (!email) return
    setSending(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }
      })
      if (error) throw error
      setCodeSent(true)
      setCooldown(60)
      toast.success("Código de verificação enviado para " + email)
    } catch (error: any) {
      console.error("OTP send error:", error)
      toast.error("Erro ao enviar código: " + error.message)
    } finally {
      setSending(false)
    }
  }, [email])

  // Send OTP when dialog opens
  useEffect(() => {
    if (open && email && !codeSent) {
      sendOtp()
    }
    if (!open) {
      setOtpCode("")
      setCodeSent(false)
      setCooldown(0)
    }
  }, [open, email])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleVerify = async () => {
    if (otpCode.length < 6) {
      toast.error("Digite o código de 6 dígitos")
      return
    }
    setVerifying(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      })
      if (error) throw error
      toast.success("Verificação concluída!")
      onOpenChange(false)
      onVerified()
    } catch (error: any) {
      console.error("OTP verify error:", error)
      toast.error("Código inválido ou expirado")
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verificação de Segurança
          </DialogTitle>
          <DialogDescription>
            Para proteger dados sensíveis, um código de verificação foi enviado para o seu email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">{email}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="otp-code">Código de 6 dígitos</Label>
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-lg tracking-[0.5em] font-mono"
              autoFocus
            />
          </div>

          {codeSent && (
            <p className="text-xs text-muted-foreground text-center">
              O código expira em 5 minutos.{" "}
              {cooldown > 0 ? (
                <span>Reenviar em {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={sending}
                  className="text-primary hover:underline font-medium"
                >
                  Reenviar código
                </button>
              )}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleVerify}
            disabled={verifying || otpCode.length < 6}
          >
            {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {verifying ? "Verificando..." : "Verificar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
