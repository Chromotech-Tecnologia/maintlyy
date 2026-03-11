import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { CreditCard, Check, Clock, Crown, ExternalLink, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Plan {
  id: string
  nome: string
  tipo: string
  categoria: string
  preco: string | null
  max_usuarios: number
  descricao: string | null
  recursos: string[]
  whatsapp_numero: string | null
  whatsapp_mensagem: string | null
  texto_botao: string
  destaque: boolean
}

export default function Assinaturas() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)
  const [accountStatus, setAccountStatus] = useState<string>('active')
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('plan_id, account_status, trial_start, trial_days, is_permanent')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile) {
        setCurrentPlanId(profile.plan_id)
        setAccountStatus(profile.account_status || 'active')

        if (profile.account_status === 'trial' && profile.trial_start && profile.trial_days) {
          const end = new Date(profile.trial_start)
          end.setDate(end.getDate() + profile.trial_days)
          setTrialDaysLeft(Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))))
        }
      }

      // Fetch active plans
      const { data: plansData } = await supabase
        .from('landing_plans')
        .select('*')
        .eq('ativo', true)
        .order('ordem')

      if (plansData) {
        setPlans(plansData.map((p: any) => ({
          ...p,
          recursos: Array.isArray(p.recursos) ? p.recursos : []
        })))
      }

      setLoading(false)
    }
    fetchData()
  }, [user])

  const handlePlanClick = (plan: Plan) => {
    if (plan.categoria === 'gratis') {
      // Free plan - go to login
      return
    }
    if (plan.whatsapp_numero) {
      const msg = encodeURIComponent(plan.whatsapp_mensagem || `Olá! Tenho interesse no plano ${plan.nome}.`)
      window.open(`https://wa.me/${plan.whatsapp_numero}?text=${msg}`, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  const currentPlan = plans.find(p => p.id === currentPlanId)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display">Assinatura</h1>
          <p className="text-sm text-muted-foreground">Gerencie seu plano e assinatura</p>
        </div>
      </div>

      {/* Current Plan Card */}
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-primary" />
            Plano Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accountStatus === 'trial' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  Período de Teste
                </Badge>
                {trialDaysLeft !== null && (
                  <span className="text-sm text-muted-foreground">
                    {trialDaysLeft === 0 ? 'Expira hoje' : `${trialDaysLeft} dia${trialDaysLeft > 1 ? 's' : ''} restante${trialDaysLeft > 1 ? 's' : ''}`}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Escolha um plano abaixo para continuar utilizando o Maintly após o período de teste.
              </p>
            </div>
          ) : accountStatus === 'expired' ? (
            <div className="space-y-3">
              <Badge variant="destructive">Expirado</Badge>
              <p className="text-sm text-muted-foreground">
                Seu período de teste expirou. Escolha um plano para reativar sua conta.
              </p>
            </div>
          ) : currentPlan ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Ativo</Badge>
                <span className="font-semibold text-lg">{currentPlan.nome}</span>
                {currentPlan.preco && <span className="text-muted-foreground">{currentPlan.preco}</span>}
              </div>
              {currentPlan.descricao && <p className="text-sm text-muted-foreground">{currentPlan.descricao}</p>}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Até {currentPlan.max_usuarios} usuário{currentPlan.max_usuarios > 1 ? 's' : ''}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Ativo</Badge>
              <p className="text-sm text-muted-foreground">Conta ativa sem plano específico vinculado.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-4">Planos Disponíveis</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlanId
            return (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden transition-all duration-300 ${
                  plan.destaque ? 'border-primary/50 shadow-lg shadow-primary/10' : 'glass-card'
                } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.destaque && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/60" />
                )}
                <CardContent className="p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-lg">{plan.nome}</h3>
                      {isCurrentPlan && <Badge variant="secondary" className="text-[10px]">Atual</Badge>}
                    </div>
                    {plan.descricao && <p className="text-sm text-muted-foreground mt-1">{plan.descricao}</p>}
                  </div>
                  
                  <div className="text-2xl font-bold">
                    {plan.preco || <span className="text-emerald-600 dark:text-emerald-400">Grátis</span>}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Até {plan.max_usuarios} usuário{plan.max_usuarios > 1 ? 's' : ''}
                  </div>

                  <ul className="space-y-2">
                    {plan.recursos.map((recurso, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{recurso}</span>
                      </li>
                    ))}
                  </ul>

                  {!isCurrentPlan && (
                    <Button 
                      className={`w-full ${plan.destaque ? 'gradient-primary border-0' : ''}`}
                      variant={plan.destaque ? 'default' : 'outline'}
                      onClick={() => handlePlanClick(plan)}
                    >
                      {plan.texto_botao}
                      {plan.categoria === 'pago' && <ExternalLink className="h-4 w-4 ml-2" />}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
