import { cn } from "@/lib/utils"

interface PasswordStrengthProps {
  password: string
  className?: string
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: "", color: "" }
    
    let score = 0
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }
    
    if (checks.length) score++
    if (checks.lowercase) score++
    if (checks.uppercase) score++
    if (checks.numbers) score++
    if (checks.symbols) score++
    
    const strengthLevels = [
      { score: 0, label: "", color: "" },
      { score: 1, label: "Muito fraca", color: "bg-destructive" },
      { score: 2, label: "Fraca", color: "bg-orange-500" },
      { score: 3, label: "Média", color: "bg-yellow-500" },
      { score: 4, label: "Forte", color: "bg-blue-500" },
      { score: 5, label: "Muito forte", color: "bg-green-500" },
    ]
    
    return strengthLevels[score]
  }
  
  const strength = getPasswordStrength(password)
  
  if (!password || !strength.label) return null
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Força da senha:</span>
        <span className={cn(
          "font-medium",
          strength.color === "bg-destructive" && "text-destructive",
          strength.color === "bg-orange-500" && "text-orange-600",
          strength.color === "bg-yellow-500" && "text-yellow-600",
          strength.color === "bg-blue-500" && "text-blue-600",
          strength.color === "bg-green-500" && "text-green-600"
        )}>
          {strength.label}
        </span>
      </div>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn(
              "h-2 flex-1 rounded-full",
              level <= strength.score
                ? strength.color
                : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  )
}