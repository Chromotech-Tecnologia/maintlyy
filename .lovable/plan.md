

# Plan: Landing Page + Plans Management (Super Admin)

## Summary

Create a public landing page at `/` (for unauthenticated users), a plans management section in the Super Admin panel, and improve the global footer. Authenticated users hitting `/` will see the Dashboard as before.

## Architecture

```text
/ (root)
├── Unauthenticated → LandingPage (new)
└── Authenticated → Dashboard (existing, inside ProtectedRoute)

/super-admin
└── New tab/section: "Planos" → CRUD for plans table
```

## Database Changes

**New table: `landing_plans`** -- stores editable plan cards shown on the landing page.

```sql
CREATE TABLE public.landing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'individual', -- 'individual' | 'equipe' | 'personalizado'
  categoria text NOT NULL DEFAULT 'gratis', -- 'gratis' | 'pago'
  preco text, -- e.g. "R$ 49,90/mês" or null for free
  max_usuarios integer DEFAULT 1,
  descricao text,
  recursos jsonb NOT NULL DEFAULT '[]', -- ["feature1", "feature2"]
  whatsapp_numero text, -- e.g. "5511999999999"
  whatsapp_mensagem text, -- pre-filled message
  texto_botao text NOT NULL DEFAULT 'Começar Grátis',
  destaque boolean DEFAULT false, -- highlighted plan
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.landing_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can read active plans (public landing page)
CREATE POLICY "Anyone can view active plans" ON public.landing_plans
  FOR SELECT TO anon, authenticated USING (ativo = true);

-- Super admins can manage
CREATE POLICY "Super admins manage plans" ON public.landing_plans
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));
```

## File Changes

### 1. `src/pages/LandingPage.tsx` (new)
Modern landing page with:
- **Hero section**: Logo, tagline, CTA button, gradient background with 3D card mockup
- **Features section**: Grid of feature cards (maintenance management, password vault, teams, reports, permissions, multi-tenant) with icons, glassmorphism
- **Free trial section**: Shows trial days from `system_settings` (`default_trial_days`)
- **Plans section**: Fetches `landing_plans` from Supabase (public/anon), renders cards grouped by free/paid. Each card has name, price, features list, CTA button that redirects to WhatsApp (`https://wa.me/{numero}?text={encoded_message}`) or to `/login` for free plans
- **Footer**: Fixed `AppFooter` with enhanced styling
- Uses system colors, gradients, 3D shadows from existing CSS variables
- Fully responsive (mobile-first)

### 2. `src/App.tsx`
- Add `/` route as `<LandingPage />` outside ProtectedRoute
- Move Dashboard to `/dashboard` inside ProtectedRoute
- Redirect authenticated users from `/` to `/dashboard` (handled in LandingPage component itself)

### 3. `src/pages/SuperAdminPanel.tsx`
Add a new "Planos" section (via Tabs or collapsible card):
- Table listing all plans (active/inactive)
- Create/Edit dialog with fields: nome, tipo (select), categoria (select), preco, max_usuarios, descricao, recursos (multi-line or tag input), whatsapp_numero, whatsapp_mensagem, texto_botao, destaque (switch), ordem, ativo (switch)
- Delete plan with confirmation
- All fields editable including button text and WhatsApp message

### 4. `src/components/layout/AppFooter.tsx`
- Enhanced design: slightly larger, gradient text for brand names, subtle separator line above
- Ensure it's always fixed at bottom on all pages (landing, login, app)

### 5. `src/components/layout/AppLayout.tsx`
- Ensure footer is pinned at bottom (already in main content area, just verify mobile visibility with `pb-24`)

### 6. Navigation updates
- Update `AppSidebar.tsx` and `MobileNav.tsx` to use `/dashboard` as home route instead of `/`
- Update any `navigate('/')` calls to `navigate('/dashboard')`

## Technical Details

- **Trial days on landing**: Fetched via `supabase.from('system_settings').select('value').eq('key', 'default_trial_days').single()` using anon key (public read policy already exists)
- **Plans on landing**: Fetched via `supabase.from('landing_plans').select('*').eq('ativo', true).order('ordem')` using anon key
- **WhatsApp redirect**: `window.open(\`https://wa.me/${plan.whatsapp_numero}?text=${encodeURIComponent(plan.whatsapp_mensagem)}\`, '_blank')`
- **Auth check in LandingPage**: Use `useAuth()` -- if user is authenticated, `<Navigate to="/dashboard" />`
- **Landing page design**: Gradient hero with `gradient-primary`, glassmorphism feature cards, 3D plan cards with `shadow-3d`, smooth scroll animations using existing `animate-fade-in` / `animate-slide-up`

