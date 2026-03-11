import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Copy, RefreshCw, Settings, Check } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"

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
  const [modalOpen, setModalOpen] = useState(false)
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
    if (!modalOpen) setModalOpen(true)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword)
    toast.success("Senha copiada para a área de transferência!")
  }

  const usePassword = () => {
    onPasswordGenerated(generatedPassword)
    setModalOpen(false)
    toast.success("Senha aplicada!")
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
      
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline">
            <Settings className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Configurações do Gerador</DialogTitle>
          </DialogHeader>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div>
                <label className="text-sm font-medium">Comprimento: {length[0]}</label>
                <Slider value={length} onValueChange={setLength} max={32} min={4} step={1} className="mt-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="uppercase" checked={includeUppercase} onCheckedChange={(c) => setIncludeUppercase(c === true)} />
                  <label htmlFor="uppercase" className="text-sm">Maiúsculas (A-Z)</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="lowercase" checked={includeLowercase} onCheckedChange={(c) => setIncludeLowercase(c === true)} />
                  <label htmlFor="lowercase" className="text-sm">Minúsculas (a-z)</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="numbers" checked={includeNumbers} onCheckedChange={(c) => setIncludeNumbers(c === true)} />
                  <label htmlFor="numbers" className="text-sm">Números (0-9)</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="symbols" checked={includeSymbols} onCheckedChange={(c) => setIncludeSymbols(c === true)} />
                  <label htmlFor="symbols" className="text-sm">Símbolos (!@#$%)</label>
                </div>
              </div>
              <Button type="button" onClick={() => { generatePassword(); setConfigOpen(false) }} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Gerar Senha
              </Button>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Modal de senha gerada */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Senha Gerada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all select-all text-center">
              {generatedPassword}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={copyToClipboard} className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                Copiar
              </Button>
              <Button type="button" variant="outline" onClick={generatePassword} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Gerar Novamente
              </Button>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Fechar
            </Button>
            <Button type="button" onClick={usePassword}>
              <Check className="w-4 h-4 mr-2" />
              Usar Esta Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
