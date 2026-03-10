import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface ChartCardProps {
  title: string
  description?: string
  icon?: LucideIcon
  children: React.ReactNode
}

export function ChartCard({ title, description, icon: Icon, children }: ChartCardProps) {
  return (
    <Card className="glass-card border-0">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
          <div>
            <CardTitle className="text-base font-display font-semibold">{title}</CardTitle>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}
