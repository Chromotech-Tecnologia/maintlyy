import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink, FileText, Image, Link2, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Report {
  id: string
  public_id: string
  title: string
  format: string
  created_at: string
}

export function ReportHistory() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      const { data } = await supabase
        .from('generated_reports')
        .select('id, public_id, title, format, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setReports((data as any) || [])
      setLoading(false)
    }
    fetch()
  }, [user])

  const copyLink = async (publicId: string) => {
    const url = `${window.location.origin}/relatorio-publico/${publicId}`
    await navigator.clipboard.writeText(url)
    toast({ title: "Link copiado!" })
  }

  const deleteReport = async (id: string) => {
    await supabase.from('generated_reports').delete().eq('id', id)
    setReports(r => r.filter(x => x.id !== id))
    toast({ title: "Relatório removido" })
  }

  const formatIcon = (f: string) => {
    if (f === 'png') return <Image className="h-4 w-4 text-green-500" />
    if (f === 'link') return <Link2 className="h-4 w-4 text-blue-500" />
    return <FileText className="h-4 w-4 text-red-500" />
  }

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>

  if (reports.length === 0) return <div className="py-8 text-center text-sm text-muted-foreground">Nenhum relatório gerado ainda.</div>

  return (
    <div className="space-y-2">
      {reports.map(r => (
        <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            {formatIcon(r.format)}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{r.title}</p>
              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('pt-BR')} • {r.format.toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(r.public_id)} title="Copiar link">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/relatorio-publico/${r.public_id}`, '_blank')} title="Abrir">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteReport(r.id)} title="Excluir">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
