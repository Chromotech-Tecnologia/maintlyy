import { useState, useEffect } from "react"
import { Navigate, Link } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { AppFooter } from "@/components/layout/AppFooter"
import { Button } from "@/components/ui/button"
import {
  Wrench, Shield, Users, FileBarChart, KeyRound, Building2,
  CheckCircle2, ArrowRight, Sparkles, Zap, Star
} from "lucide-react"

interface LandingPlan {
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
  ordem: number
}

const features = [
  { icon: Wrench, title: "Gestão de Manutenções", desc: "Controle completo de manutenções preventivas e corretivas com rastreamento de tempo." },
  { icon: KeyRound, title: "Cofre de Senhas", desc: "Armazene credenciais com criptografia e controle de acesso granular." },
  { icon: Users, title: "Equipes & Permissões", desc: "Gerencie equipes com perfis de permissão personalizados por recurso." },
  { icon: FileBarChart, title: "Relatórios Avançados", desc: "Gere relatórios detalhados com filtros, exportação PDF e links públicos." },
  { icon: Building2, title: "Multi-Empresa", desc: "Gerencie múltiplas empresas e clientes em uma única plataforma." },
  { icon: Shield, title: "Segurança Total", desc: "Verificação por email, tokens OTP e controle de acesso por perfil." },
]

export default function LandingPage() {
  const { user, loading } = useAuth()
  const [trialDays, setTrialDays] = useState(7)
  const [plans, setPlans] = useState<LandingPlan[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const [settingsRes, plansRes] = await Promise.all([
        supabase.from("system_settings").select("value").eq("key", "default_trial_days").single(),
        supabase.from("landing_plans").select("*").eq("ativo", true).order("ordem"),
      ])
      if (settingsRes.data?.value) setTrialDays(parseInt(settingsRes.data.value) || 7)
      if (plansRes.data) setPlans(plansRes.data.map((p: any) => ({ ...p, recursos: Array.isArray(p.recursos) ? p.recursos : [] })))
    }
    fetchData()
  }, [])

  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />

  const freePlans = plans.filter(p => p.categoria === "gratis")
  const paidPlans = plans.filter(p => p.categoria === "pago")

  const handlePlanClick = (plan: LandingPlan) => {
    if (plan.whatsapp_numero) {
      const msg = plan.whatsapp_mensagem || `Olá! Tenho interesse no plano ${plan.nome} do Maintly.`
      window.open(`https://wa.me/${plan.whatsapp_numero}?text=${encodeURIComponent(msg)}`, "_blank")
    } else {
      window.location.href = "/login"
    }
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md">
              <img src="/lovable-uploads/90637fdc-0828-4765-9f53-c726c82d9dac.png" alt="Maintly" className="w-7 h-7" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Maintly</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-md">
                Teste Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 rounded-full opacity-20 blur-3xl" style={{ background: "hsl(221 83% 53% / 0.3)" }} />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: "hsl(250 83% 63% / 0.3)" }} />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Novas funcionalidades toda semana
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight mb-6 text-foreground">
            Gestão de Manutenções
            <span className="block mt-2 bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
              Simples e Profissional
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Controle manutenções, equipes, senhas e relatórios em um só lugar.
            Segurança de nível empresarial com interface intuitiva.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login">
              <Button size="lg" className="gradient-primary text-primary-foreground shadow-lg shadow-primary/25 h-12 px-8 text-base">
                Começar {trialDays} dias grátis
                <ArrowRight className="h-5 w-5 ml-1" />
              </Button>
            </Link>
            <a href="#planos">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                Ver Planos
              </Button>
            </a>
          </div>

          {/* 3D Hero Card */}
          <div className="mt-16 relative mx-auto max-w-3xl">
            <div
              className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-xl p-1 shadow-3d"
              style={{ transform: "perspective(1200px) rotateX(4deg) rotateY(-2deg)" }}
            >
              <div className="rounded-xl bg-gradient-to-br from-card to-muted/50 p-6 sm:p-8">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Manutenções", value: "247", color: "hsl(221 83% 53%)" },
                    { label: "Clientes", value: "38", color: "hsl(142 76% 36%)" },
                    { label: "Equipes", value: "12", color: "hsl(38 92% 50%)" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-4 rounded-xl bg-background/60 border border-border/30">
                      <p className="text-2xl sm:text-3xl font-bold font-display" style={{ color: stat.color }}>{stat.value}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Glow effect */}
            <div className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl -z-10" style={{ background: "var(--gradient-primary)" }} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-foreground">
              Tudo que você precisa
            </h2>
            <p className="text-muted-foreground mt-3 text-lg max-w-xl mx-auto">
              Uma plataforma completa para gestão de manutenções e segurança da informação.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group glass-card p-6 rounded-2xl hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-md shadow-primary/20 group-hover:scale-110 transition-transform">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Always improving */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium mb-4">
            <Zap className="h-4 w-4" />
            Evolução Contínua
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
            Estamos sempre criando novas funcionalidades
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Nossa equipe trabalha continuamente para trazer novas ferramentas e melhorias.
            Você sempre terá acesso às últimas inovações sem custo adicional no seu plano.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="py-20 px-4 sm:px-6 bg-muted/30 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-foreground">
              Planos & Preços
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              Comece grátis por {trialDays} dias. Escolha o plano ideal para você.
            </p>
          </div>

          {/* Free plans */}
          {freePlans.length > 0 && (
            <div className="mb-12">
              <h3 className="text-xl font-display font-semibold text-foreground mb-6 text-center">Planos Gratuitos</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {freePlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} onClick={() => handlePlanClick(plan)} trialDays={trialDays} />
                ))}
              </div>
            </div>
          )}

          {/* Paid plans */}
          {paidPlans.length > 0 && (
            <div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-6 text-center">Planos Profissionais</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {paidPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} onClick={() => handlePlanClick(plan)} trialDays={trialDays} />
                ))}
              </div>
            </div>
          )}

          {plans.length === 0 && (
            <div className="text-center">
              <div className="glass-card max-w-md mx-auto p-8 rounded-2xl">
                <Star className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                  Teste grátis por {trialDays} dias
                </h3>
                <p className="text-muted-foreground mb-6">
                  Acesso completo a todas as funcionalidades sem compromisso.
                </p>
                <Link to="/login">
                  <Button className="gradient-primary text-primary-foreground shadow-md w-full">
                    Começar agora <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Pronto para começar?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Crie sua conta gratuita e explore todas as funcionalidades por {trialDays} dias.
          </p>
          <Link to="/login">
            <Button size="lg" className="gradient-primary text-primary-foreground shadow-lg shadow-primary/25 h-12 px-10 text-base">
              Criar conta grátis <ArrowRight className="h-5 w-5 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-border/50 bg-card/50">
        <AppFooter className="py-6" />
      </div>
    </div>
  )
}

function PlanCard({ plan, onClick, trialDays }: { plan: LandingPlan; onClick: () => void; trialDays: number }) {
  return (
    <div
      className={`relative glass-card rounded-2xl p-6 flex flex-col transition-all duration-300 ${
        plan.destaque ? "ring-2 ring-primary shadow-lg scale-[1.02]" : ""
      }`}
    >
      {plan.destaque && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-primary-foreground text-xs font-semibold shadow-md">
          Mais popular
        </div>
      )}
      <div className="mb-4">
        <h4 className="text-lg font-display font-bold text-foreground">{plan.nome}</h4>
        {plan.descricao && <p className="text-sm text-muted-foreground mt-1">{plan.descricao}</p>}
      </div>
      <div className="mb-5">
        {plan.preco ? (
          <span className="text-3xl font-display font-bold text-foreground">{plan.preco}</span>
        ) : (
          <div>
            <span className="text-3xl font-display font-bold text-foreground">Grátis</span>
            <span className="text-sm text-muted-foreground ml-2">por {trialDays} dias</span>
          </div>
        )}
        {plan.tipo === "equipe" && (
          <p className="text-xs text-muted-foreground mt-1">até {plan.max_usuarios} usuários</p>
        )}
        {plan.tipo === "personalizado" && (
          <p className="text-xs text-muted-foreground mt-1">usuários ilimitados</p>
        )}
      </div>
      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.recursos.map((r, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>{r}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={onClick}
        className={`w-full ${plan.destaque ? "gradient-primary text-primary-foreground shadow-md" : ""}`}
        variant={plan.destaque ? "default" : "outline"}
      >
        {plan.texto_botao}
      </Button>
    </div>
  )
}
