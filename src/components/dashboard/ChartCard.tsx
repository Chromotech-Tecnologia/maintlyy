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
    <Card className="border-0 shadow-elegant">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}