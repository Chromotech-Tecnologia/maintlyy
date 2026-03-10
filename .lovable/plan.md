

# Plan: Multi-Tenant SaaS with Super Admin Panel

## Summary

Transform Maintly into a multi-tenant SaaS where each new signup creates an independent admin account (tenant owner) who manages their own data. Alexandre's account (`alexandre@chromotech.com.br`) becomes the **Super Admin** (platform owner) with a dedicated panel to manage all tenant accounts.

---

## Architecture Changes

### 1. New Concept: `is_super_admin`

Add a `is_super_admin` boolean to `user_profiles` to distinguish:
- **Super Admin** (alexandre): sees/manages ALL tenants, has platform admin panel
- **Tenant Admin** (new signups): `is_admin = true`, manages only their own data
- **Tenant Users** (created by tenant admins): scoped by permissions as today

### 2. Database Migration

```sql
-- Add super_admin flag
ALTER TABLE user_profiles ADD COLUMN is_super_admin boolean DEFAULT false;

-- Set alexandre as super admin
UPDATE user_profiles SET is_super_admin = true 
WHERE email = 'alexandre@chromotech.com.br';

-- Add account status fields for tenant management
ALTER TABLE user_profiles ADD COLUMN account_status text DEFAULT 'active';
ALTER TABLE user_profiles ADD COLUMN trial_days integer DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN trial_start date;
ALTER TABLE user_profiles ADD COLUMN is_permanent boolean DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN phone text;

-- RLS: Super admin can see ALL user_profiles
CREATE POLICY "Super admins can view all profiles"
ON user_profiles FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND is_super_admin = true)
);

-- Super admin can update any profile
CREATE POLICY "Super admins can update all profiles" 
ON user_profiles FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND is_super_admin = true)
);
```

### 3. Signup Form Changes (`Login.tsx`)

Add fields to signup form:
- **Nome** (display_name) - required
- **Telefone** - required
- **Confirmação de senha** - must match password
- Update `signupSchema` in `validations.ts` accordingly

On signup, create `user_profiles` with `is_admin = true` (tenant admin), `account_status = 'pending'`.

### 4. ProtectedRoute Changes

Update to handle:
- `is_super_admin` → full access + super admin panel
- `is_admin` (tenant) → access as today, but only own data
- `account_status = 'disabled'` → show "account disabled" message
- `account_status = 'pending'` → show "awaiting activation" message

### 5. New Page: `SuperAdminPanel.tsx`

Visible only to `is_super_admin`. Based on the uploaded image reference, it will show a table with:

| Column | Description |
|--------|-------------|
| Nome | display_name |
| Email | email |
| Status Email | Confirmado/Pendente (from auth) |
| Telefone | phone field |
| Status | Ativo/Desabilitado/Período teste |
| Criado em | created_at |
| Ações (dropdown) | Alterar senha, Configurar período teste, Ativar permanente, Desabilitar, Excluir |

Actions use the existing `admin-operations` edge function (extended with new operations: `disableUser`, `deleteUser`).

### 6. Edge Function Updates (`admin-operations`)

Add operations:
- `disableUser` → update `account_status` to `disabled`, call `admin.updateUserById` to ban
- `deleteUser` → delete user from auth + cascade profile
- `setTrialPeriod` → set `trial_days` + `trial_start`
- `activatePermanent` → set `is_permanent = true`, `account_status = 'active'`

Check `is_super_admin` instead of just `is_admin` for these operations.

### 7. Sidebar Update

Add "Painel Admin" menu item (Crown icon) visible only when `is_super_admin = true`. Route: `/super-admin`.

### 8. Data Isolation

The existing RLS policies already scope data by `user_id = auth.uid()`. Each tenant admin creates records with their own `user_id`, so data is already isolated. No RLS changes needed for data tables.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/...` | Add `is_super_admin`, `account_status`, `trial_*`, `phone` columns + RLS |
| `src/lib/validations.ts` | Add `display_name`, `phone`, `confirmPassword` to signup schema |
| `src/pages/Login.tsx` | Add name, phone, confirm password fields to signup |
| `src/hooks/useAuth.tsx` | Pass name/phone on signup, set `is_admin = true` for new accounts |
| `src/pages/SuperAdminPanel.tsx` | **New** - full admin panel with user table + actions |
| `src/components/ProtectedRoute.tsx` | Handle `account_status`, `is_super_admin` |
| `src/hooks/usePermissions.tsx` | Add `isSuperAdmin` flag |
| `src/components/layout/AppSidebar.tsx` | Add "Painel Admin" for super admin |
| `src/components/layout/MobileNav.tsx` | Add "Painel Admin" for super admin |
| `src/App.tsx` | Add `/super-admin` route |
| `supabase/functions/admin-operations/index.ts` | Add disable/delete/trial/activate operations |

