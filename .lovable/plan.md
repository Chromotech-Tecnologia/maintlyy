

# Plan: Trial Banner, Subscriptions Page, Plan Limits & Super Admin Plan Selection

## Summary

Show a trial banner on all pages for trial tenants, create a subscriptions page, enforce user/team creation limits based on plan, and add a plan selection modal when activating permanent accounts in Super Admin.

## Database Changes

**Add columns to `user_profiles`** to track the assigned plan:

```sql
ALTER TABLE public.user_profiles ADD COLUMN plan_id uuid REFERENCES public.landing_plans(id);
```

**Add `max_equipes` column to `landing_plans`**:

```sql
ALTER TABLE public.landing_plans ADD COLUMN max_equipes integer DEFAULT 0;
```

No new tables needed -- existing `landing_plans` and `user_profiles` are sufficient.

## File Changes

### 1. New: `src/components/TrialBanner.tsx`
- Fetches the current user's `account_status`, `trial_start`, `trial_days` from `user_profiles`
- If `account_status === 'trial'`, calculates remaining days and shows a sticky banner at the top of the content area: "Seu período de teste expira em X dias. Conheça nossos planos"
- Link goes to `/assinaturas`
- Compact, dismissible per session, amber/warning colored

### 2. New: `src/pages/Assinaturas.tsx`
- Shows current active subscription (fetches user's `plan_id` from `user_profiles` joined with `landing_plans`)
- If no plan (trial), shows "Período de Teste" card with remaining days
- Below, shows all available plans from `landing_plans` (same cards as landing page)
- Each plan card has the CTA button (WhatsApp redirect for paid, or current plan indicator)
- Route: `/assinaturas`

### 3. Modified: `src/components/layout/AppLayout.tsx`
- Import and render `<TrialBanner />` above `{children}` in the main content area

### 4. Modified: `src/components/ProtectedRoute.tsx`
- When `accountStatus === 'expired'`, instead of showing a static blocked page, redirect to `/assinaturas` (but still inside AppLayout)
- Actually, keep the expired block screen but add a "Ver Planos" button that links to `/assinaturas`

### 5. Modified: `src/App.tsx`
- Add `/assinaturas` route inside ProtectedRoute/AppLayout

### 6. Modified: `src/components/layout/AppSidebar.tsx` & `MobileNav.tsx`
- Add "Assinaturas" menu item with `CreditCard` icon in the system section

### 7. Modified: `src/pages/SuperAdminPanel.tsx`
- Replace direct `handleActivatePermanent(userId)` call with opening a plan selection modal
- New state: `activateDialog` with `open`, `userId`, `selectedPlanId`
- Modal fetches all active plans from `landing_plans`, lets super admin pick one
- On confirm, calls `activatePermanent` with the selected `planId`

### 8. Modified: `supabase/functions/admin-operations/index.ts`
- `activatePermanent` operation: accept optional `planId`, set `plan_id` on `user_profiles` along with `account_status: 'active'`, `is_permanent: true`

### 9. Modified: `src/pages/PerfilUsuarios.tsx`
- Before opening the create user dialog, check limits:
  - Fetch admin's `plan_id` → join to `landing_plans` to get `tipo` and `max_usuarios`
  - If `tipo === 'individual'` (max_usuarios = 1): block creation, show toast "Seu plano individual não permite criar usuários adicionais"
  - If `tipo === 'equipe'`: count existing sub-users; if >= `max_usuarios`, block with toast "Limite de usuários do plano atingido (X/Y)"
  - If `tipo === 'personalizado'`: same check with the plan's `max_usuarios`
  - If no plan (trial): allow creation (trial has no user limit, or set a reasonable default)

### 10. Modified: `src/pages/Equipes.tsx`
- Same pattern: before creating a new team, check `max_equipes` from the plan
- If limit reached, show toast "Limite de equipes do plano atingido"

### 11. Modified: `src/components/superadmin/PlansManager.tsx`
- Add `max_equipes` field to the create/edit form

## Technical Details

- **Trial banner**: Uses a shared hook or inline fetch in the component. Cached via `useState` to avoid re-fetching on every page. Shows only for `is_admin` users (tenant owners), not sub-users.
- **Plan limits check**: A reusable hook `usePlanLimits()` that returns `{ maxUsers, maxTeams, currentUsers, currentTeams, canCreateUser, canCreateTeam, planName, loading }`. Used in both PerfilUsuarios and Equipes.
- **Expired redirect**: When trial expires, ProtectedRoute still blocks access but shows a "Ver Planos" button. The `/assinaturas` route itself is accessible even for expired accounts (special handling in ProtectedRoute to allow this one route).

