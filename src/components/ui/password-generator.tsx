import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Copy, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface PasswordGeneratorProps {
  onPasswordGenerated: (password: string) => void
}

export function PasswordGenerator({ onPasswordGenerated }: PasswordGeneratorProps) {
  const [length, setLength] = useState([12])
  const [includeUppercase, setIncludeUppercase] = useState(true)
  const [includeLowercase, setIncludeLowercase] = useState(true)
  const [includeNumbers, setIncludeNumbers] = useState(true)
  const [includeSymbols, setIncludeSymbols] = useState(true)
  const [generatedPassword, setGeneratedPassword] = useState("")

  const generatePassword = () => {
    let charset = ""
    
    if (includeUppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    if (includeLowercase) charset += "abcdefghijklmnopqrstuvwxyz"
    if (includeNumbers) charset += "0123456789"
    if (includeSymbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?"

    if (charset === "") {
      toast.error("Selecione pelo menos um tipo de caractere")
      return
    }

    let password = ""
    for (let i = 0; i < length[0]; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }

    setGeneratedPassword(password)
    onPasswordGenerated(password)
    toast.success("Senha forte gerada!")
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword)
    toast.success("Senha copiada para a área de transferência!")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Gerador de Senha Forte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Comprimento: {length[0]}</label>
          <Slider
            value={length}
            onValueChange={setLength}
            max={32}
            min={4}
            step={1}
            className="mt-2"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="uppercase"
              checked={includeUppercase}
              onCheckedChange={(checked) => setIncludeUppercase(checked === true)}
            />
            <label htmlFor="uppercase" className="text-sm">Maiúsculas (A-Z)</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="lowercase"
              checked={includeLowercase}
              onCheckedChange={(checked) => setIncludeLowercase(checked === true)}
            />
            <label htmlFor="lowercase" className="text-sm">Minúsculas (a-z)</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="numbers"
              checked={includeNumbers}
              onCheckedChange={(checked) => setIncludeNumbers(checked === true)}
            />
            <label htmlFor="numbers" className="text-sm">Números (0-9)</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="symbols"
              checked={includeSymbols}
              onCheckedChange={(checked) => setIncludeSymbols(checked === true)}
            />
            <label htmlFor="symbols" className="text-sm">Símbolos (!@#$%)</label>
          </div>
        </div>

        <Button onClick={generatePassword} className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Gerar Senha
        </Button>

        {generatedPassword && (
          <div className="flex items-center space-x-2">
            <div className="flex-1 p-2 bg-muted rounded border font-mono text-sm break-all">
              {generatedPassword}
            </div>
            <Button size="sm" variant="outline" onClick={copyToClipboard}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}