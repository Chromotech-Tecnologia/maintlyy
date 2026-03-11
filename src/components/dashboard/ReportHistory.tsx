import { useState, useEffect, useRef } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink, FileDown, Image, Link2, Share2, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

interface Report {
  id: string
  public_id: string
  title: string
  format: string
  created_at: string
  report_html?: string
}

export function ReportHistory() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const renderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    const fetchReports = async () => {
      const { data } = await supabase
        .from('generated_reports')
        .select('id, public_id, title, format, created_at, report_html')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setReports((data as any) || [])
      setLoading(false)
    }
    fetchReports()
  }, [user])

  const getPublicUrl = (publicId: string) => `${window.location.origin}/relatorio-publico/${publicId}`

  const copyLink = async (publicId: string) => {
    await navigator.clipboard.writeText(getPublicUrl(publicId))
    toast({ title: "Link copiado!" })
  }

  const shareReport = async (report: Report) => {
    const url = getPublicUrl(report.public_id)
    if (navigator.share) {
      try {
        await navigator.share({ title: report.title, text: `Relatório: ${report.title}`, url })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      toast({ title: "Link copiado para compartilhar!" })
    }
  }

  const downloadAs = async (report: Report, format: 'pdf' | 'png') => {
    if (!report.report_html) {
      toast({ title: "Erro", description: "HTML do relatório não disponível.", variant: "destructive" })
      return
    }
    setProcessingId(report.id)
    try {
      // Render HTML offscreen
      const container = renderRef.current
      if (!container) return
      container.innerHTML = report.report_html
      container.style.display = 'block'

      const canvas = await html2canvas(container, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      })

      container.style.display = 'none'
      container.innerHTML = ''

      const dateStr = new Date(report.created_at).toISOString().split('T')[0]

      if (format === 'png') {
        const link = document.createElement('a')
        link.download = `relatorio_${dateStr}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      } else {
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('p', 'mm', 'a4')
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width

        if (pdfHeight <= pdf.internal.pageSize.getHeight()) {
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
        } else {
          let position = 0
          const pageHeight = pdf.internal.pageSize.getHeight()
          while (position < pdfHeight) {
            if (position > 0) pdf.addPage()
            pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, pdfHeight)
            position += pageHeight
          }
        }
        pdf.save(`relatorio_${dateStr}.pdf`)
      }

      toast({ title: `${format.toUpperCase()} baixado!` })
    } catch (error) {
      console.error('Erro ao baixar:', error)
      toast({ title: "Erro", description: "Falha ao gerar arquivo.", variant: "destructive" })
    } finally {
      setProcessingId(null)
    }
  }

  const deleteReport = async (id: string) => {
    await supabase.from('generated_reports').delete().eq('id', id)
    setReports(r => r.filter(x => x.id !== id))
    toast({ title: "Relatório removido" })
  }

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>

  if (reports.length === 0) return <div className="py-8 text-center text-sm text-muted-foreground">Nenhum relatório gerado ainda.</div>

  return (
    <>
      {/* Offscreen render container */}
      <div
        ref={renderRef}
        className="bg-white text-gray-900 p-8 rounded-xl"
        style={{ position: 'fixed', left: '-9999px', top: 0, width: 700, display: 'none' }}
      />

      <div className="space-y-2">
        {reports.map(r => (
          <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <FileDown className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => downloadAs(r, 'pdf')}
                disabled={processingId === r.id}
                title="Baixar PDF"
              >
                <FileDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => downloadAs(r, 'png')}
                disabled={processingId === r.id}
                title="Baixar Imagem"
              >
                <Image className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(r.public_id)} title="Copiar link">
                <Link2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shareReport(r)} title="Compartilhar">
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(getPublicUrl(r.public_id), '_blank')} title="Abrir">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteReport(r.id)} title="Excluir">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}