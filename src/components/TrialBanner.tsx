import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { Clock, X, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function TrialBanner() {
  const { user } = useAuth()
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchTrialInfo = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('account_status, trial_start, trial_days, is_admin, is_permanent')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!data) return
      if (data.account_status !== 'trial' || data.is_permanent) return
      if (!data.is_admin) return // Only show for tenant owners

      if (data.trial_start && data.trial_days) {
        const end = new Date(data.trial_start)
        end.setDate(end.getDate() + data.trial_days)
        const remaining = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        setDaysLeft(Math.max(0, remaining))
        setShow(true)
      }
    }
    fetchTrialInfo()
  }, [user])

  if (!show || dismissed || daysLeft === null) return null

  const isUrgent = daysLeft <= 3

  return (
    <div className={`relative flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm font-medium mb-4 ${
      isUrgent 
        ? "bg-destructive/10 border border-destructive/30 text-destructive" 
        : "bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400"
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {daysLeft === 0 
            ? "Seu período de teste expira hoje!" 
            : `Seu período de teste expira em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}.`}
        </span>
        <Link to="/assinaturas" className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 shrink-0">
          Ver planos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => setDismissed(true)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
