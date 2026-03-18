import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { CreditCard, Check, Crown, ExternalLink, Users, CheckCircle2, XCircle } from "lucide-react"
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
  max_equipes: number
  max_empresas: number
  max_manutencoes: number
  max_senhas: number
  max_urls: number
  descricao: string | null
  recursos: string[]
  whatsapp_numero: string | null
  whatsapp_mensagem: string | null
  texto_botao: string
  destaque: boolean
  suporte_email: boolean
  suporte_whatsapp: boolean
  relatorios_avancados: boolean
  links_publicos: boolean
  importacao_excel: boolean
}

export default function Assinaturas() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)
  const [accountStatus, setAccountStatus] = useState<string>('active')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      const { data: profileRaw } = await supabase
        .from('user_profiles')
        .select('plan_id, account_status')
        .eq('user_id', user.id)
        .maybeSingle()

      const profile = profileRaw as any
      if (profile) {
        setCurrentPlanId(profile.plan_id)
        setAccountStatus(profile.account_status || 'active')
      }

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
          {currentPlan ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary border-primary/30">Ativo</Badge>
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
              <Badge className="bg-primary/10 text-primary border-primary/30">Ativo</Badge>
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
                    {plan.preco || <span className="text-primary">Grátis</span>}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Até {plan.max_usuarios} usuário{plan.max_usuarios > 1 ? 's' : ''}
                  </div>

                  <ul className="space-y-2">
                    {plan.recursos.map((recurso, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
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
