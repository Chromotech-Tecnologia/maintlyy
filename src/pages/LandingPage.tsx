import { useState, useEffect, useRef } from "react"
import { Navigate, Link } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { AppFooter } from "@/components/layout/AppFooter"
import testimonial1 from "@/assets/testimonial-1.png"
import testimonial2 from "@/assets/testimonial-2.png"
import testimonial3 from "@/assets/testimonial-3.png"
import testimonial4 from "@/assets/testimonial-4.png"
import testimonial5 from "@/assets/testimonial-5.png"
import { Button } from "@/components/ui/button"
import {
  Wrench, Shield, Users, FileBarChart, KeyRound, Building2,
  CheckCircle2, ArrowRight, Sparkles, Zap, Star, Lock,
  Clock, BarChart3, UserPlus, Settings, MonitorSmartphone,
  ShieldCheck, Database, Headphones, ChevronRight, ChevronLeft
} from "lucide-react"

interface LandingPlan {
  id: string
  nome: string
  tipo: string
  categoria: string
  preco: string | null
  max_usuarios: number
  max_empresas: number
  max_manutencoes: number
  descricao: string | null
  recursos: string[]
  whatsapp_numero: string | null
  whatsapp_mensagem: string | null
  texto_botao: string
  destaque: boolean
  ordem: number
  offer_free_signup: boolean
}

const features = [
  { icon: Wrench, title: "Gestão de Manutenções", desc: "Controle completo de manutenções preventivas e corretivas com rastreamento de tempo real.", tag: "Produtividade" },
  { icon: KeyRound, title: "Cofre de Senhas", desc: "Armazene credenciais com criptografia AES-256 e controle de acesso granular por usuário.", tag: "Segurança" },
  { icon: Users, title: "Equipes & Permissões", desc: "Gerencie equipes com perfis de permissão personalizados por recurso e por empresa.", tag: "Colaboração" },
  { icon: FileBarChart, title: "Relatórios Avançados", desc: "Gere relatórios detalhados com filtros, exportação PDF e links públicos compartilháveis.", tag: "Análise" },
  { icon: Building2, title: "Multi-Empresa", desc: "Gerencie múltiplas empresas e clientes em uma única plataforma centralizada.", tag: "Escalabilidade" },
  { icon: Shield, title: "Segurança Total", desc: "Verificação por email, tokens OTP e controle de acesso por perfil de permissão.", tag: "Confiança" },
]

const steps = [
  { icon: UserPlus, number: "01", title: "Crie sua conta", desc: "Cadastro rápido e gratuito. Sem cartão de crédito." },
  { icon: Settings, number: "02", title: "Configure sua empresa", desc: "Adicione equipes, clientes e tipos de manutenção." },
  { icon: MonitorSmartphone, number: "03", title: "Gerencie tudo", desc: "Controle manutenções, senhas e relatórios em um só lugar." },
]

const stats = [
  { value: "10x", label: "mais rápido", desc: "que planilhas manuais" },
  { value: "100%", label: "seguro", desc: "criptografia de ponta" },
  { value: "24/7", label: "disponível", desc: "acesso em qualquer lugar" },
  { value: "0", label: "instalação", desc: "100% na nuvem" },
]

const trustBadges = [
  { icon: ShieldCheck, title: "Dados Criptografados", desc: "AES-256 em todas as senhas" },
  { icon: Database, title: "Backup Automático", desc: "Seus dados sempre seguros" },
  { icon: Headphones, title: "Suporte Dedicado", desc: "Ajuda quando precisar" },
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

  const handlePlanClick = (plan: LandingPlan) => {
    if (plan.offer_free_signup) {
      window.location.href = "/login"
    } else if (plan.whatsapp_numero) {
      const msg = plan.whatsapp_mensagem || `Olá! Tenho interesse no plano ${plan.nome} do Maintly.`
      window.open(`https://wa.me/${plan.whatsapp_numero}?text=${encodeURIComponent(msg)}`, "_blank")
    } else {
      window.location.href = "/login"
    }
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden dark scroll-smooth" data-theme="dark" style={{ colorScheme: "dark" }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-md border border-border/50">
              <img src="/lovable-uploads/90637fdc-0828-4765-9f53-c726c82d9dac.png" alt="Maintly" className="w-7 h-7" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">Maintly</span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#funcionalidades" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Como funciona</a>
            <a href="#planos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Planos</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-white hover:text-white">Entrar</Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="gradient-primary text-white shadow-md">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-[500px] h-[500px] rounded-full animate-pulse-glow blur-[120px]" style={{ background: "hsl(var(--primary) / 0.15)" }} />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full animate-pulse-glow blur-[100px]" style={{ background: "hsl(250 83% 63% / 0.1)", animationDelay: "1.5s" }} />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
                <Sparkles className="h-4 w-4" />
                Novas funcionalidades toda semana
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-display font-bold tracking-tight mb-6 text-foreground leading-[1.1]">
                Gestão de
                <br />
                Manutenções
                <span className="block mt-1 bg-clip-text text-transparent animate-gradient-text" style={{
                  backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(250 83% 63%), hsl(var(--primary)))",
                  backgroundSize: "200% 200%"
                }}>
                  Inteligente e Segura
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
                Controle manutenções, equipes, senhas e relatórios em uma plataforma
                <strong className="text-foreground"> profissional, segura</strong> e fácil de usar.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                <Link to="/login">
                  <Button size="lg" className="gradient-primary text-primary-foreground shadow-lg shadow-primary/25 h-13 px-8 text-base font-semibold">
                    Começar {trialDays} dias grátis
                    <ArrowRight className="h-5 w-5 ml-1" />
                  </Button>
                </Link>
                <a href="#funcionalidades">
                  <Button variant="outline" size="lg" className="h-13 px-8 text-base">
                    Conhecer recursos
                  </Button>
                </a>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                ✓ Sem cartão de crédito &nbsp;&nbsp; ✓ Configuração em 2 minutos &nbsp;&nbsp; ✓ Cancele quando quiser
              </p>
            </div>

            {/* Right: Floating mockup cards */}
            <div className="relative hidden lg:block h-[420px]">
              {/* Main card */}
              <div className="absolute top-6 left-8 right-4 animate-float">
                <div className="glass-card rounded-2xl p-5 border border-border/60 shadow-3d">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Dashboard</p>
                      <p className="text-xs text-muted-foreground">Visão geral do mês</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Manutenções", value: "247", color: "hsl(var(--primary))" },
                      { label: "Concluídas", value: "189", color: "hsl(var(--success))" },
                      { label: "Em andamento", value: "58", color: "hsl(var(--warning))" },
                    ].map((s) => (
                      <div key={s.label} className="text-center p-3 rounded-xl bg-background/70 border border-border/30">
                        <p className="text-xl font-bold font-display" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Small floating card - password vault */}
              <div className="absolute bottom-16 left-0 animate-float-delayed">
                <div className="glass-card rounded-xl p-4 border border-border/60 shadow-lg w-52">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold text-foreground">Cofre de Senhas</p>
                  </div>
                  <div className="space-y-1.5">
                    {["Servidor AWS", "Painel Admin", "VPN Corp"].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-[11px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-success" />
                        <span className="text-muted-foreground">{item}</span>
                        <span className="ml-auto text-muted-foreground">••••••</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Small floating card - team */}
              <div className="absolute bottom-4 right-0 animate-float" style={{ animationDelay: "1s" }}>
                <div className="glass-card rounded-xl p-4 border border-border/60 shadow-lg w-48">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold text-foreground">Equipe TI</p>
                  </div>
                  <div className="flex -space-x-2">
                    {["bg-primary", "bg-success", "bg-warning", "bg-destructive"].map((bg, i) => (
                      <div key={i} className={`w-7 h-7 rounded-full ${bg} border-2 border-card flex items-center justify-center`}>
                        <span className="text-[9px] text-primary-foreground font-bold">{["JP", "MR", "AS", "LC"][i]}</span>
                      </div>
                    ))}
                    <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                      <span className="text-[9px] text-muted-foreground font-medium">+3</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Glow */}
              <div className="absolute inset-8 rounded-3xl opacity-15 blur-3xl -z-10" style={{ background: "var(--gradient-primary)" }} />
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-8 px-4 sm:px-6 border-y border-border/50 bg-muted/30">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 sm:gap-14">
          {[
            { icon: Clock, text: "Economia de 10h/semana" },
            { icon: ShieldCheck, text: "Criptografia AES-256" },
            { icon: Zap, text: "99.9% de disponibilidade" },
            { icon: Users, text: "Equipes de todos os tamanhos" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-muted-foreground">
              <item.icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-20 sm:py-28 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20">
              <Zap className="h-4 w-4" />
              Funcionalidades
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-foreground">
              Tudo que você precisa
              <span className="block text-primary mt-1">em um só lugar</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-lg max-w-2xl mx-auto">
              Uma plataforma completa para gestão de manutenções, segurança da informação e colaboração da equipe.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative glass-card p-6 rounded-2xl hover:shadow-lg transition-all duration-500 hover:-translate-y-1"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                    {f.tag}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-md shadow-primary/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Saiba mais <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/30 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-foreground">
              Comece em <span className="text-primary">3 passos simples</span>
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              De zero a produtivo em menos de 5 minutos.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden sm:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

            {steps.map((step, i) => (
              <div key={step.number} className="relative text-center group">
                <div className="relative z-10 mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="absolute top-0 right-0 sm:right-auto sm:-top-2 sm:left-1/2 sm:translate-x-4 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  PASSO {step.number}
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-primary)", opacity: 0.04 }} />
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <p className="text-4xl sm:text-5xl font-display font-bold text-primary mb-1">{stat.value}</p>
                  <p className="text-sm font-semibold text-foreground">{stat.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-foreground">
              Segurança que você pode <span className="text-primary">confiar</span>
            </h2>
            <p className="text-muted-foreground mt-3 text-lg max-w-2xl mx-auto">
              Seus dados estão protegidos com as mesmas tecnologias usadas por grandes empresas.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {trustBadges.map((badge) => (
              <div key={badge.title} className="glass-card rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                  <badge.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-base font-display font-semibold text-foreground mb-1">{badge.title}</h3>
                <p className="text-sm text-muted-foreground">{badge.desc}</p>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div className="mt-14 text-center">
            <div className="glass-card rounded-2xl p-8 sm:p-10 max-w-3xl mx-auto border border-primary/10">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
              <blockquote className="text-xl sm:text-2xl font-display font-semibold text-foreground leading-snug">
                "A plataforma que sua equipe de manutenção precisava para
                <span className="text-primary"> ser mais produtiva e segura.</span>"
              </blockquote>
              <p className="text-sm text-muted-foreground mt-4">
                Desenvolvido para profissionais que valorizam organização e segurança.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Always Evolving */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium mb-4 border border-success/20">
            <Zap className="h-4 w-4" />
            Evolução Contínua
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
            Estamos sempre criando novas funcionalidades
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Nossa equipe trabalha continuamente para trazer novas ferramentas e melhorias.
            Você sempre terá acesso às últimas inovações.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {["Relatórios PDF", "Cofre Avançado", "Multi-Empresa", "Perfis de Permissão", "Importação Excel", "Links Públicos"].map((feat) => (
              <span key={feat} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/15">
                <CheckCircle2 className="h-3 w-3" />
                {feat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Plans */}
      <PlansCarousel plans={plans} trialDays={trialDays} onPlanClick={handlePlanClick} />

      {/* Final CTA */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-primary)", opacity: 0.06 }} />
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="glass-card rounded-3xl p-10 sm:p-14 border border-primary/10 shadow-3d">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/25">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
              Pronto para transformar
              <span className="block text-primary">sua gestão de manutenções?</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              Junte-se a profissionais que já otimizaram sua rotina.
              Comece seus <strong className="text-foreground">{trialDays} dias grátis</strong> agora.
            </p>
            <Link to="/login">
              <Button size="lg" className="gradient-primary text-primary-foreground shadow-lg shadow-primary/25 h-14 px-10 text-lg font-semibold">
                Criar conta grátis <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-4">
              ✓ Sem cartão de crédito &nbsp;&nbsp; ✓ Cancele quando quiser
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-border/50 bg-card/50">
        <AppFooter className="py-6" />
      </div>
    </div>
  )
}

const testimonials = [
  {
    name: "Ricardo Almeida",
    role: "Gerente de Manutenção",
    company: "TechServ Soluções",
    photo: testimonial1,
    rating: 5,
    text: "O Maintly transformou completamente a forma como gerenciamos nossas manutenções. Antes usávamos planilhas e WhatsApp, agora temos tudo centralizado. Reduzimos o tempo de resposta em 60% nos primeiros 3 meses.",
  },
  {
    name: "Carla Mendonça",
    role: "Diretora de Operações",
    company: "Grupo Facilities Plus",
    photo: testimonial2,
    rating: 5,
    text: "A segurança do cofre de senhas e o controle de permissões por equipe foram decisivos para escolhermos o Maintly. Gerenciamos 3 filiais com total controle e visibilidade de tudo que acontece.",
  },
  {
    name: "Lucas Ferreira",
    role: "Técnico de TI",
    company: "InfoMaint Tecnologia",
    photo: testimonial3,
    rating: 5,
    text: "Eu trabalho sozinho e o Maintly me deu a organização que faltava. Os relatórios com link público são perfeitos para enviar ao cliente. Super prático e bonito!",
  },
  {
    name: "Fernanda Costa",
    role: "Coordenadora de Facilities",
    company: "MegaCorp Engenharia",
    photo: testimonial4,
    rating: 5,
    text: "Já testei diversas ferramentas e nenhuma tinha a combinação de facilidade e funcionalidades do Maintly. O perfil de permissões é incrível — cada colaborador vê só o que precisa.",
  },
  {
    name: "Marcelo Teixeira",
    role: "Proprietário",
    company: "MT Manutenções Elétricas",
    photo: testimonial5,
    rating: 5,
    text: "Comecei no plano gratuito e em 2 semanas já migrei para o Equipe. A produtividade da minha equipe aumentou muito. O suporte também é excelente, sempre rápido e atencioso.",
  },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "text-amber-400 fill-amber-400" : "text-border"}`}
        />
      ))}
    </div>
  )
}

function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const featured = testimonials[activeIndex]

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-primary)", opacity: 0.04 }} />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium mb-4 border border-amber-500/20">
            <Star className="h-4 w-4 fill-current" />
            Avaliações reais
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-foreground">
            O que nossos clientes <span className="text-primary">dizem</span>
          </h2>
          <p className="text-muted-foreground mt-3 text-lg max-w-2xl mx-auto">
            Profissionais de manutenção que já transformaram sua rotina com o Maintly.
          </p>
        </div>

        {/* Featured testimonial */}
        <div className="glass-card rounded-3xl p-8 sm:p-10 border border-primary/10 shadow-3d max-w-4xl mx-auto mb-10 transition-all duration-700 ease-in-out" key={activeIndex}>
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start animate-fade-in">
            <div className="shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-4 ring-primary/20 shadow-lg">
                <img src={featured.photo} alt={featured.name} className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <StarRating rating={featured.rating} />
              <blockquote className="text-lg sm:text-xl text-foreground leading-relaxed mt-3 font-medium">
                "{featured.text}"
              </blockquote>
              <div className="mt-4">
                <p className="font-display font-bold text-foreground">{featured.name}</p>
                <p className="text-sm text-muted-foreground">{featured.role} · {featured.company}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail selector */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          {testimonials.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-500 ${
                i === activeIndex
                  ? "glass-card ring-2 ring-primary shadow-lg scale-105"
                  : "hover:bg-muted/50 opacity-70 hover:opacity-100"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl overflow-hidden ring-2 transition-all duration-500 ${
                i === activeIndex ? "ring-primary" : "ring-border group-hover:ring-primary/50"
              }`}>
                <img src={t.photo} alt={t.name} className="w-full h-full object-cover" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-foreground leading-tight">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.company}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Average rating */}
        <div className="text-center mt-10">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-muted/50 border border-border/50">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span className="text-sm font-semibold text-foreground">5.0</span>
            <span className="text-sm text-muted-foreground">· Nota média dos clientes</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function PlansCarousel({ plans, trialDays, onPlanClick }: { plans: LandingPlan[]; trialDays: number; onPlanClick: (plan: LandingPlan) => void }) {
  const [startIndex, setStartIndex] = useState(0)
  const maxVisible = 3
  const canGoLeft = startIndex > 0
  const canGoRight = startIndex + maxVisible < plans.length

  const goLeft = () => setStartIndex(i => Math.max(0, i - 1))
  const goRight = () => setStartIndex(i => Math.min(plans.length - maxVisible, i + 1))

  const visiblePlans = plans.slice(startIndex, startIndex + maxVisible)

  return (
    <section id="planos" className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/30 scroll-mt-24 pt-28">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20">
            <Star className="h-4 w-4" />
            Planos
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-foreground">
            Planos & Preços
          </h2>
          <p className="text-muted-foreground mt-3 text-lg">
            Comece grátis por {trialDays} dias. Escolha o plano ideal para você.
          </p>
        </div>

        {plans.length === 0 ? (
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
        ) : (
          <div className="relative px-8 sm:px-12">
            {/* Navigation arrows */}
            {plans.length > maxVisible && (
              <>
                <button
                  onClick={goLeft}
                  disabled={!canGoLeft}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full glass-card border border-border/60 flex items-center justify-center text-foreground hover:bg-primary/10 transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed shadow-md"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={goRight}
                  disabled={!canGoRight}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full glass-card border border-border/60 flex items-center justify-center text-foreground hover:bg-primary/10 transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed shadow-md"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            <div className="overflow-hidden">
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500 ease-in-out"
              >
                {visiblePlans.map((plan) => (
                  <div key={plan.id} className="animate-fade-in">
                    <PlanCard plan={plan} onClick={() => onPlanClick(plan)} trialDays={trialDays} />
                  </div>
                ))}
              </div>
            </div>

            {/* Indicator dots */}
            {plans.length > maxVisible && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {plans.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i >= startIndex && i < startIndex + maxVisible
                        ? "w-6 bg-primary"
                        : "w-1.5 bg-border"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function PlanCard({ plan, onClick, trialDays }: { plan: LandingPlan; onClick: () => void; trialDays: number }) {
  return (
    <div
      className={`relative glass-card rounded-2xl p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        plan.destaque ? "ring-2 ring-primary shadow-lg scale-[1.02]" : ""
      }`}
    >
      {plan.destaque && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-primary-foreground text-xs font-semibold shadow-md">
          ⭐ Mais popular
        </div>
      )}
      {plan.categoria === "gratis" && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-success text-success-foreground text-xs font-semibold shadow-md">
          ✨ Grátis
        </div>
      )}
      <div className="mb-4 mt-1">
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
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
          {plan.max_usuarios > 0 && <span>👤 {plan.max_usuarios === 999 ? "Ilimitados" : `Até ${plan.max_usuarios}`} usuário{plan.max_usuarios > 1 ? "s" : ""}</span>}
          {plan.max_empresas > 0 && <span>🏢 {plan.max_empresas === 999 ? "Ilimitadas" : `Até ${plan.max_empresas}`} empresa{plan.max_empresas > 1 ? "s" : ""}</span>}
          {plan.max_manutencoes > 0 && <span>🔧 {plan.max_manutencoes}/mês</span>}
          {plan.max_manutencoes === 0 && plan.categoria === "pago" && <span>🔧 Ilimitadas</span>}
        </div>
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
