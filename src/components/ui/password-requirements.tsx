import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordRequirementsProps {
  password: string
}

const requirements = [
  { label: "Mínimo 6 caracteres", test: (p: string) => p.length >= 6 },
  { label: "Uma letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { label: "Uma letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Um número", test: (p: string) => /\d/.test(p) },
]

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  if (!password) return null

  return (
    <div className="space-y-1 mt-2">
      {requirements.map((req) => {
        const met = req.test(password)
        return (
          <div key={req.label} className="flex items-center gap-2 text-xs">
            {met ? (
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-destructive shrink-0" />
            )}
            <span className={cn(met ? "text-emerald-500" : "text-destructive")}>
              {req.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function isPasswordValid(password: string): boolean {
  return requirements.every((r) => r.test(password))
}

interface PasswordMatchIndicatorProps {
  password: string
  confirmPassword: string
}

export function PasswordMatchIndicator({ password, confirmPassword }: PasswordMatchIndicatorProps) {
  if (!confirmPassword) return null

  const match = password === confirmPassword

  return (
    <div className="flex items-center gap-2 text-xs mt-1">
      {match ? (
        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      ) : (
        <X className="h-3.5 w-3.5 text-destructive shrink-0" />
      )}
      <span className={cn(match ? "text-emerald-500" : "text-destructive")}>
        {match ? "Senhas conferem" : "Senhas não conferem"}
      </span>
    </div>
  )
}
