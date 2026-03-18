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
                <CardContent className="p-5 space-y-4 flex flex-col h-full">
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

                  {/* Unified checklist matching landing page */}
                  <ul className="space-y-2 flex-1">
                    {(() => {
                      const limitItems: { icon: string; text: string }[] = []
                      limitItems.push({ icon: "👤", text: plan.max_usuarios >= 999 ? "Usuários ilimitados" : `Até ${plan.max_usuarios} usuário${plan.max_usuarios > 1 ? 's' : ''}` })
                      if (plan.max_empresas > 0) {
                        limitItems.push({ icon: "🏢", text: plan.max_empresas >= 999 ? "Empresas ilimitadas" : `Até ${plan.max_empresas} empresa${plan.max_empresas > 1 ? "s" : ""}` })
                      }
                      if (plan.max_manutencoes > 0 || (plan.max_manutencoes === 0 && plan.categoria === "pago")) {
                        limitItems.push({ icon: "🔧", text: plan.max_manutencoes >= 999 || (plan.max_manutencoes === 0 && plan.categoria === "pago") ? "Manutenções ilimitadas" : `${plan.max_manutencoes} manutenções/mês` })
                      }
                      if (plan.max_equipes > 0) {
                        limitItems.push({ icon: "👥", text: plan.max_equipes >= 999 ? "Equipes ilimitadas" : `Até ${plan.max_equipes} equipe${plan.max_equipes > 1 ? "s" : ""}` })
                      }
                      if (plan.max_senhas > 0) {
                        limitItems.push({ icon: "🔑", text: plan.max_senhas >= 999 ? "Senhas ilimitadas" : `Até ${plan.max_senhas} senha${plan.max_senhas > 1 ? "s" : ""}` })
                      }
                      if (plan.max_urls > 0) {
                        limitItems.push({ icon: "🌐", text: plan.max_urls >= 999 ? "URLs ilimitadas" : `Até ${plan.max_urls} URL${plan.max_urls > 1 ? "s" : ""} monitorada${plan.max_urls > 1 ? "s" : ""}` })
                      }

                      const featureToggleItems = [
                        { icon: "📧", text: "Suporte por email", enabled: plan.suporte_email },
                        { icon: "💬", text: "Suporte exclusivo pelo WhatsApp", enabled: plan.suporte_whatsapp },
                        { icon: "📊", text: "Relatórios avançados com PDF", enabled: plan.relatorios_avancados },
                        { icon: "🔗", text: "Links públicos de relatórios", enabled: plan.links_publicos },
                        { icon: "📥", text: "Importação via Excel", enabled: plan.importacao_excel },
                      ]

                      return (
                        <>
                          {limitItems.map((item, i) => (
                            <li key={`limit-${i}`} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span>{item.icon} {item.text}</span>
                            </li>
                          ))}
                          {featureToggleItems.map((item, i) => (
                            <li key={`feat-${i}`} className={`flex items-start gap-2 text-sm ${!item.enabled ? "text-muted-foreground/60 line-through" : ""}`}>
                              {item.enabled ? (
                                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive/60 mt-0.5 shrink-0" />
                              )}
                              <span>{item.icon} {item.text}</span>
                            </li>
                          ))}
                          {plan.recursos.map((r, i) => {
                            const isExcluded = r.startsWith("~")
                            const label = isExcluded ? r.slice(1).trim() : r
                            return (
                              <li key={`rec-${i}`} className={`flex items-start gap-2 text-sm ${isExcluded ? "text-muted-foreground/60 line-through" : ""}`}>
                                {isExcluded ? (
                                  <XCircle className="h-4 w-4 text-destructive/60 mt-0.5 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                )}
                                <span>{label}</span>
                              </li>
                            )
                          })}
                        </>
                      )
                    })()}
                  </ul>

                  {!isCurrentPlan && (
                    <div className="mt-auto pt-4 border-t border-border/30">
                      <Button 
                        className={`w-full ${plan.destaque ? 'gradient-primary border-0' : ''}`}
                        variant={plan.destaque ? 'default' : 'outline'}
                        onClick={() => handlePlanClick(plan)}
                      >
                        {plan.texto_botao}
                        {plan.categoria === 'pago' && <ExternalLink className="h-4 w-4 ml-2" />}
                      </Button>
                    </div>
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
