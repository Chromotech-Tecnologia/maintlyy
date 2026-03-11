

# Plan: Mobile Fixes, Password Generator Modal, User Hierarchy, Super Admin Enhancements, Sidebar Theme

## Summary of Changes

This plan addresses 7 distinct areas across multiple files.

---

## 1. Fix Mobile Header/Footer Scrolling (Sticky)

**Files**: `src/components/layout/AppLayout.tsx`, `src/index.css`

The header already has `sticky top-0 z-40` but the overall layout needs the content area to be the scrollable container, not the whole page. The mobile bottom nav needs `fixed bottom-0` (already has it via CSS class). The fix is to make the main flex container use `h-screen overflow-hidden` so only the `<main>` scrolls.

- Change outer div from `min-h-screen` to `h-screen overflow-hidden`
- Keep `<main>` as `flex-1 overflow-auto`
- Ensure `-webkit-overflow-scrolling: touch` for smooth iOS scrolling

## 2. Disable Mobile Zoom

**File**: `index.html`

Change the viewport meta tag to include `maximum-scale=1, user-scalable=no`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no" />
```

## 3. Fix Horizontal Overflow on Mobile (Clientes, Export Modal, Perfis)

**Files**: `src/pages/Clientes.tsx`, `src/pages/CofreSenhas.tsx`, `src/pages/PermissionProfiles.tsx`

- **Clientes**: The `grid-cols-2 gap-4` in the form (email/telefone) overflows on small screens. Change to `grid-cols-1 sm:grid-cols-2`.
- **Export Modal**: Already has `max-w-[calc(100vw-2rem)]`. The inner content with checkboxes and badges may overflow. Add `min-w-0 overflow-hidden` to inner items and use `break-all` on long text.
- **PermissionProfiles**: Add `max-w-[calc(100vw-2rem)]` to dialog content and ensure tables/grids don't overflow.

## 4. Password Generator -- Open Modal Instead of Direct Replace

**File**: `src/components/ui/password-generator-simple.tsx`

Current behavior: clicking "Gerar Senha" immediately calls `onPasswordGenerated()` which replaces the form field value.

New behavior:
- Clicking "Gerar Senha" opens a modal showing the generated password
- Modal has: password display, "Copiar" button, "Gerar Novamente" button, "Usar Esta Senha" button (calls `onPasswordGenerated`), "Fechar" button
- Remove the inline copy button; all interaction happens in the modal

## 5. Users Page -- Show All Child Users

**File**: `src/pages/PerfilUsuarios.tsx`

Current bug: `fetchProfiles` uses `permissionProfiles` state which may be empty when `fetchProfiles` runs (race condition -- both fetch on mount but `fetchProfiles` finishes before `fetchPermissionProfiles`).

Fix:
- Fetch permission profiles first, then use the result to filter user profiles
- Also include users who have NO permission_profile_id but were created by this admin (users created via the "Criar Usuario" button get `user_id` from `supabase.auth.signUp` but no `permission_profile_id` initially)
- The filter should show: own profile + all non-admin, non-super-admin users (since RLS already scopes data, the admin only sees their own org's users)

Actually, the real issue is that `permissionProfiles` is empty at the time `fetchProfiles` runs because they load in parallel. The fix is to chain them or use `useEffect` with `permissionProfiles` as dependency.

## 6. Super Admin Panel Enhancements

**Files**: `src/pages/SuperAdminPanel.tsx`, `supabase/functions/admin-operations/index.ts`

### 6a. Add maintenance and empresa counts to stats
Update the edge function `getAdminStats` to also count:
- `manutencoes` (total + last 7 days)
- `empresas_terceiras` (total + last 7 days)
- `user_profiles` subordinates (total + last 7 days)
- `clientes` (total + last 7 days)
- `cofre_senhas` (total + last 7 days)

Stats interface becomes:
```typescript
stats: {
  usuarios: { total: number, recent: number }
  clientes: { total: number, recent: number }
  senhas: { total: number, recent: number }
  manutencoes: { total: number, recent: number }
  empresas: { total: number, recent: number }
}
```

### 6b. Search by sub-user name to find parent admin
Add search that also matches sub-user names/emails. The edge function should return sub-users list for each admin. Frontend filters admins whose sub-users match the search term.

### 6c. Button to view admin's sub-users
Add an expandable section or dialog per admin card showing their sub-users list.

### 6d. Update SuperAdminPanel UI
- Update table headers to include Manutencoes and Empresas columns
- Update mobile cards to show 5 stat items
- Show "total / +recent" format for each metric

## 7. Sidebar Theme -- Follow System Dark/Light

**Files**: `src/index.css`, `src/components/layout/AppSidebar.tsx`

Currently the sidebar has a fixed dark background in both themes. The user wants the sidebar to follow the system theme (light background in light mode, dark in dark mode).

Changes to `src/index.css`:
- Light mode: sidebar uses light colors (background matches card/background, text uses foreground colors)
- Dark mode: sidebar uses dark colors (current dark sidebar style)

The active item left border indicator stays -- only show on the currently active route (already implemented correctly).

---

## Files Summary

| File | Changes |
|------|---------|
| `index.html` | Disable zoom |
| `src/components/layout/AppLayout.tsx` | Fix scrolling container |
| `src/index.css` | Sidebar theme variables for light/dark |
| `src/components/ui/password-generator-simple.tsx` | Modal for generated password |
| `src/pages/Clientes.tsx` | Grid responsive fix |
| `src/pages/CofreSenhas.tsx` | Export modal overflow fixes |
| `src/pages/PermissionProfiles.tsx` | Dialog mobile overflow |
| `src/pages/PerfilUsuarios.tsx` | Fix race condition, show all child users |
| `src/pages/SuperAdminPanel.tsx` | Add metrics, sub-user search, expand sub-users |
| `supabase/functions/admin-operations/index.ts` | Add manutencoes/empresas stats + sub-users list |
| `src/components/layout/AppSidebar.tsx` | Update to use theme-aware classes |

