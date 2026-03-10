

# Plan: UI Fixes, Dark/Light Mode, Dashboard Improvements, Reports, Auto-Trial, Phone Mask, and Super Admin Fixes

## Overview

This is a large set of changes spanning ~15 files. Below are the grouped implementation steps.

---

## 1. Logo Background Fix (Sidebar + Mobile)

**Files**: `AppSidebar.tsx`, `MobileNav.tsx`, `AppLayout.tsx`

Add a white background circle/container behind the transparent logo in the sidebar, mobile nav drawer, and mobile header. Use `bg-white rounded-lg` wrapping the `<img>`.

## 2. Sidebar Active Menu Highlight Fix

**File**: `AppSidebar.tsx`

The `getNavCls` function uses `bg-sidebar-primary` for active state which blends into the dark sidebar. Change to use a more visible style: `bg-white/15 text-white font-semibold border-l-2 border-primary` or use `gradient-primary` with stronger contrast.

## 3. Cofre de Senhas Mobile Fixes

**File**: `CofreSenhas.tsx`

- **Header buttons overflow**: Wrap the top header in a responsive layout. Move filter controls into a filter icon button that opens a Sheet/Dialog on mobile.
- **View password modal**: Add `max-w-[calc(100vw-2rem)]` and `overflow-x-hidden` to dialog content. Ensure text wraps with `break-all` on URLs/passwords.
- **Form dialog**: Same overflow fix for the create/edit dialog.

## 4. Other Pages Mobile Overflow Fixes

**Files**: `PerfilUsuarios.tsx`, `PermissionProfiles.tsx`, `Clientes.tsx`

Audit and fix any horizontal scroll issues by ensuring dialog content respects mobile width and tables use card layouts on mobile.

## 5. Dashboard Desktop Improvement

**File**: `Dashboard.tsx`

- Fix chart grid layout (the `lg:col-span-4` div is nested inside ChartCard instead of being on ChartCard itself).
- Add more charts: Hours by team (bar), Status distribution (donut), Weekly trend (line).
- Add filter bar at top: Client, Team, Type, Date range selects.
- Use current year dynamically instead of hardcoded 2024.
- Improve visual layout with proper grid spans.

## 6. Reports Page

**New file**: `src/pages/Relatorios.tsx`

Create a reports page where the user can:
- Select report type (Maintenance by Client, Maintenance by Type, Hours Summary, Password Inventory)
- Select fields to include via checkboxes
- Apply filters (client, team, date, type)
- Export to CSV/PDF
- Add route `/relatorios` in `App.tsx` and sidebar/mobile nav entries.

## 7. Phone Mask on Signup

**File**: `Login.tsx`

Add a phone mask function that formats input as `(XX) XXXXX-XXXX` using an `onChange` handler. No new dependency needed -- simple regex-based masking.

## 8. Auto-Approve with 7 Days Trial

**Files**: `useAuth.tsx` (signup logic), `SuperAdminPanel.tsx` (config), `admin-operations/index.ts`

- Change new account `account_status` from `'pending'` to `'trial'`, set `trial_days: 7`, `trial_start: today`.
- Add a settings section in SuperAdminPanel where the super admin can configure `default_trial_days` (stored as a row in a new `system_settings` table or as a constant in the edge function).
- For simplicity, add a configurable input at the top of SuperAdminPanel that updates a `system_settings` row. The signup edge function reads this value.

**Migration**: Create `system_settings` table with a single row for `default_trial_days`.

## 9. Fix Super Admin Panel Not Opening

**File**: `SuperAdminPanel.tsx`

The panel checks `isSuperAdmin` from `usePermissions()` and redirects if false. The issue is likely that `usePermissions` fetches the profile asynchronously, so on first render `isSuperAdmin` is `false` and it redirects before the data loads. Fix by adding a loading state check before the redirect.

## 10. Dark/Light Mode Toggle

**Files**: `App.tsx`, `AppLayout.tsx`, `index.css`

- The `.dark` CSS variables already exist in `index.css`.
- Install `next-themes` (already in dependencies). Wrap app with `ThemeProvider`.
- Add a Sun/Moon toggle button in the header (`AppLayout.tsx`).
- The toggle switches between `light` and `dark` classes on `<html>`.

## 11. Edge Function Redeployment

The `admin-operations` edge function needs redeployment after adding the `getSystemSettings` and setting trial defaults.

---

## Files Summary

| File | Action |
|------|--------|
| `src/index.css` | Minor tweaks for dark mode compatibility |
| `src/App.tsx` | Add ThemeProvider wrapper, `/relatorios` route |
| `src/components/layout/AppLayout.tsx` | White bg behind logo, dark mode toggle in header |
| `src/components/layout/AppSidebar.tsx` | White bg behind logo, fix active menu highlight |
| `src/components/layout/MobileNav.tsx` | White bg behind logo, add Relatorios menu item |
| `src/pages/Dashboard.tsx` | Fix charts, add filters, more chart types, dynamic year |
| `src/pages/CofreSenhas.tsx` | Mobile overflow fixes, filter icon on mobile |
| `src/pages/PerfilUsuarios.tsx` | Mobile overflow fixes |
| `src/pages/Login.tsx` | Phone mask |
| `src/pages/SuperAdminPanel.tsx` | Fix redirect on loading, add default trial days config |
| `src/pages/Relatorios.tsx` | **New** - Reports page |
| `src/hooks/useAuth.tsx` | Auto-trial on signup |
| `supabase/migrations/...` | `system_settings` table |
| `supabase/functions/admin-operations/index.ts` | Add getSettings/updateSettings ops |

