import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Copy, RefreshCw, Settings } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface PasswordGeneratorSimpleProps {
  onPasswordGenerated: (password: string) => void
}

export function PasswordGeneratorSimple({ onPasswordGenerated }: PasswordGeneratorSimpleProps) {
  const [length, setLength] = useState([12])
  const [includeUppercase, setIncludeUppercase] = useState(true)
  const [includeLowercase, setIncludeLowercase] = useState(true)
  const [includeNumbers, setIncludeNumbers] = useState(true)
  const [includeSymbols, setIncludeSymbols] = useState(true)
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [configOpen, setConfigOpen] = useState(false)

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
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={generatePassword}
        className="flex-1"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Gerar Senha
      </Button>
      
      {generatedPassword && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={copyToClipboard}
        >
          <Copy className="w-4 h-4" />
        </Button>
      )}
      
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline">
            <Settings className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Configurações do Gerador</DialogTitle>
          </DialogHeader>
          <Card>
            <CardContent className="space-y-4 p-4">
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
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  )
}