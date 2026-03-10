import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  gradient?: 'primary' | 'warm' | 'success' | 'danger'
  trend?: {
    value: number
    isPositive: boolean
  }
}

const gradientMap = {
  primary: 'gradient-primary',
  warm: 'gradient-warm',
  success: 'gradient-success',
  danger: 'gradient-danger',
}

export function StatCard({ title, value, description, icon: Icon, gradient = 'primary', trend }: StatCardProps) {
  return (
    <div className={cn("stat-card-3d", gradientMap[gradient])}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider">{title}</p>
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="text-3xl font-display font-bold text-white">{value}</div>
        {description && (
          <p className="text-xs text-white/60 mt-1">{description}</p>
        )}
        {trend && (
          <div className={cn("text-xs mt-2 font-medium", trend.isPositive ? 'text-white/90' : 'text-white/70')}>
            {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}% do mês anterior
          </div>
        )}
      </div>
    </div>
  )
}
