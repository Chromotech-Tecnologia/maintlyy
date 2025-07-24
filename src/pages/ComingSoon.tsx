import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Construction } from "lucide-react"

interface ComingSoonProps {
  title: string
  description: string
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-md border-0 shadow-elegant">
        <CardContent className="p-8 text-center space-y-6">
          <div className="p-4 bg-primary/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            <Construction className="h-10 w-10 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground">
              {description}
            </p>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}