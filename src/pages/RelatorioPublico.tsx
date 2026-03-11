import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Loader2 } from "lucide-react"

export default function RelatorioPublico() {
  const { publicId } = useParams<{ publicId: string }>()
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!publicId) return
    const fetch = async () => {
      const { data, error: err } = await supabase
        .from('generated_reports')
        .select('report_html, title')
        .eq('public_id', publicId)
        .single()

      if (err || !data) {
        setError(true)
      } else {
        setHtml((data as any).report_html)
        document.title = `${(data as any).title} — Maintly`
      }
      setLoading(false)
    }
    fetch()
  }, [publicId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !html) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Relatório não encontrado</h1>
          <p className="text-gray-500">Este link pode ter expirado ou sido removido.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div
        className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-4 sm:p-8"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
