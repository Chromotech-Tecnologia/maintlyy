import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface MissingItem {
  label: string
  route: string
}

interface PrerequisiteWarningProps {
  missingItems: MissingItem[]
  context: string
}

export function PrerequisiteWarning({ missingItems, context }: PrerequisiteWarningProps) {
  if (missingItems.length === 0) return null

  return (
    <Alert className="border-amber-500/30 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="text-sm">
        <span className="font-medium">Para criar {context}, você precisa cadastrar primeiro:</span>
        <ul className="mt-1.5 space-y-0.5">
          {missingItems.map((item) => (
            <li key={item.label}>
              <a href={item.route} className="text-primary underline underline-offset-2 hover:text-primary/80">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
