

# Plan: Card Alignment, Sidebar Theme, Super Admin Fix, Users Subordinate Filter

## 1. Password Cards -- Buttons Aligned to Bottom

**File**: `src/pages/CofreSenhas.tsx`

The card already uses `flex flex-col h-full` and `mt-auto` on the button row. The issue is that the card content area needs `flex-1` properly and the button div needs to always be at the bottom. Will ensure the structure is:
- Card: `flex flex-col h-full`
- CardContent: `flex-1 flex flex-col`
- Button row: `mt-auto pt-3`

This ensures all cards in the same row have buttons perfectly aligned at the bottom regardless of content height.

## 2. Sidebar Menu -- White Text + Left Border Active + Dark/Light Theme

**File**: `src/components/layout/AppSidebar.tsx`, `src/index.css`

Current issue: sidebar text uses `text-sidebar-foreground/60` which appears blue-ish. The active state uses `bg-primary/8 text-primary` which blends in.

Changes:
- Default items: `text-sidebar-foreground` (white/light) at ~70% opacity
- Active item: left border indicator (`border-l-[3px] border-primary`) + subtle light background (`bg-sidebar-accent`) + full white text
- Group labels: lighter opacity
- In light mode, sidebar should use the dark background (keep current `--sidebar-background`), so text stays white. In dark mode, same dark sidebar approach. The sidebar always stays dark -- this matches the reference image.

## 3. Super Admin Panel Error Fix

**File**: `supabase/functions/admin-operations/index.ts` (redeploy)

The edge function is returning 401. The issue is likely that the `supabase.auth.getUser()` call uses the anon-key client. Need to ensure proper auth validation. Will switch to using `supabaseAdmin.auth.getUser()` for token validation to avoid RLS issues on the auth check, and add better error logging.

Also from the data: `site@chromotech.com.br` has `is_admin: true, is_super_admin: false` and should appear. The edge function filters correctly (`is_admin = true` and `!is_super_admin`). The data fetch itself should work once the auth issue is resolved.

## 4. Users Page -- Show Only Admin's Subordinates

**File**: `src/pages/PerfilUsuarios.tsx`

Current filter: `(!p.is_admin && !p.is_super_admin)` -- shows ALL non-admin users globally (broken multi-tenancy).

Fix: Query `permission_profiles` owned by the current admin, then filter `user_profiles` to show only users whose `permission_profile_id` is in that set, plus the admin's own profile. Users with no permission_profile_id who were created by this admin should also show (we can include users with `null` permission_profile_id only if they match some criteria, but for now we include them as orphans the admin should manage).

Updated logic:
```
const myProfileIds = permissionProfiles.map(p => p.id)
const filtered = allProfiles.filter(p =>
  p.user_id === user.id ||
  myProfileIds.includes(p.permission_profile_id)
)
```

This correctly scopes to the admin's own permission profiles.

---

## Files Summary

| File | Change |
|------|--------|
| `src/pages/CofreSenhas.tsx` | Ensure card button row uses `mt-auto` consistently |
| `src/components/layout/AppSidebar.tsx` | White text, left border active state, proper theme colors |
| `supabase/functions/admin-operations/index.ts` | Fix auth validation, redeploy |
| `src/pages/PerfilUsuarios.tsx` | Filter subordinates by admin's permission profiles |

