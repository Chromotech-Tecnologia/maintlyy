

# Plan: Redesign Landing Page + Add Home Link to Login

## Changes

### 1. `src/pages/Login.tsx`
- Add a "Voltar para Home" link (with arrow-left icon) above the card, linking to `/`

### 2. `src/pages/LandingPage.tsx` -- Full Redesign
Complete rewrite for a commercially persuasive, visually stunning landing page:

**Navbar**: Smooth scroll links (Funcionalidades, Planos) + login/CTA buttons

**Hero Section**:
- Larger, more impactful headline with animated gradient text
- Social proof counter strip ("Gerencie manutenções como profissional")
- Animated floating UI mockup cards (not just a static stats box) -- multiple layered cards with perspective transforms creating depth
- Subtle animated background grid/dots pattern

**"Trusted by" / Social Proof Bar**:
- Metrics strip: "500+ manutenções gerenciadas", "99.9% uptime", "Criptografia AES-256"
- Creates credibility immediately

**Features Section -- Redesigned**:
- Two-column layout alternating: large illustration/mockup on one side, feature details on the other
- Each feature has icon, title, description, and a subtle benefit tag
- Hover animations with 3D tilt effect on cards

**"How it Works" Section** (NEW):
- 3-step visual flow: "1. Cadastre-se grátis → 2. Configure sua empresa → 3. Gerencie tudo"
- Connected with animated line/dots between steps
- Simple, persuasive, reduces friction

**Statistics/Impact Section** (NEW):
- Large animated counters: "247+ Manutenções", "38+ Clientes", "99.9% Disponibilidade"
- Gradient background with glassmorphism cards

**Testimonial/Trust Section** (NEW):
- Quote-style block: "A plataforma que sua equipe de manutenção precisava"
- Shield + lock icons showing security certifications
- Trust badges: "Dados criptografados", "Backup automático", "Suporte dedicado"

**"Always Evolving" Section -- Enhanced**:
- Timeline-style layout showing recent features
- Animated sparkle effects

**Plans Section -- Redesigned**:
- Toggle between "Mensal" view (future-proof even if only one period now)
- Cards with gradient borders for highlighted plan
- Hover lift + glow effect on plan cards
- Better visual hierarchy: free plans subtle, paid plans prominent

**Final CTA Section -- Enhanced**:
- Full-width gradient background
- Larger text, countdown urgency ("Comece seus {trialDays} dias grátis agora")
- Floating decorative elements

**Footer**: Existing AppFooter with enhanced styling

All sections use staggered fade-in animations via CSS classes already in the system. The page remains fully responsive (mobile-first grid layouts).

### 3. `src/index.css`
- Add a few utility classes: animated gradient text keyframe, floating animation keyframe, grid background pattern

## No Database or Backend Changes
This is purely a frontend visual redesign.

