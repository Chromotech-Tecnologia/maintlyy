

# Plan: Security Tokens via Email + Invite Flow + Export Verification

## Summary

Implement 3 security mechanisms using email-based verification:
1. **Sub-user invite flow** -- admin creates user without password, system sends invite email with link to create password
2. **Tenant signup email validation** -- already partially in place via Supabase, will be reinforced
3. **Export security token** -- before downloading passwords or sensitive reports, send a 6-digit OTP to user's email for verification

## Approach

### Email Sending Strategy

Use **Supabase's built-in auth email system** -- no external email service needed:
- **Invites**: `auth.admin.inviteUserByEmail()` sends Supabase's invite email automatically
- **Export OTP**: `supabase.auth.signInWithOtp({ email, shouldCreateUser: false })` sends a 6-digit code via Supabase's built-in email, then `verifyOtp()` validates it

### 1. Sub-User Invite Flow

**Edge function changes (`admin-operations/index.ts`)**:
- Add `inviteUser` operation that calls `auth.admin.inviteUserByEmail(email, { redirectTo: origin + '/setup-password' })`
- Creates the `user_profiles` record with `account_status: 'pending_invite'`
- No password is set -- the invited user creates their own

**New page: `/setup-password`** (`src/pages/SetupPassword.tsx`):
- Similar to `ResetPassword.tsx` but handles `type=invite` from Supabase URL hash
- Shows logo, name, password + confirm fields with validation
- On submit: calls `supabase.auth.updateUser({ password })` then redirects to `/`

**Modified: `src/pages/PerfilUsuarios.tsx`**:
- Remove password and confirm password fields from the create user form
- Replace with info text: "Um convite será enviado por email para o usuário criar sua senha"
- `handleCreateUser` calls the edge function `inviteUser` operation instead of `supabase.auth.signUp`
- Remove password validation from button disabled state

**Modified: `src/App.tsx`**:
- Add route `/setup-password` outside ProtectedRoute

### 2. Export Security Token (OTP Verification)

**New component: `src/components/SecurityTokenDialog.tsx`**:
- Reusable dialog that:
  1. On open, calls `supabase.auth.signInWithOtp({ email: user.email, options: { shouldCreateUser: false } })`
  2. Shows 6-digit input field with countdown timer (5 min expiry)
  3. On submit, calls `supabase.auth.verifyOtp({ email, token, type: 'email' })`
  4. If valid, calls `onVerified()` callback to proceed with the export
  5. Shows "Reenviar código" button after 60s cooldown
- Props: `open`, `onOpenChange`, `onVerified`, `email`

**Modified: `src/pages/CofreSenhas.tsx`**:
- Wrap `exportSelectedPasswords()` behind OTP verification
- When user clicks "Exportar TXT/CSV", open `SecurityTokenDialog` first
- Only execute export after `onVerified` callback fires

**Modified: `src/pages/Relatorios.tsx`**:
- Same pattern: wrap export behind `SecurityTokenDialog` for `senhas_inventario` report type
- Maintenance reports (non-sensitive) can export without token

**Modified: `src/components/dashboard/DashboardReportExport.tsx`**:
- If report contains sensitive data, require OTP before PDF/image/link generation

### 3. Edge Function Updates

**`admin-operations/index.ts`** -- add `inviteUser` operation:
```typescript
case 'inviteUser': {
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    body.email,
    { redirectTo: body.redirectTo || origin + '/setup-password' }
  )
  if (error) throw error
  // Create profile record
  await supabaseAdmin.from('user_profiles').insert({
    user_id: data.user.id,
    email: body.email,
    display_name: body.displayName,
    is_admin: body.isAdmin || false,
    permission_profile_id: body.permissionProfileId || null,
    account_status: 'pending_invite'
  })
  // Sync permissions from profile...
  result = { data }
  break
}
```

## File Changes Summary

| File | Action |
|------|--------|
| `supabase/functions/admin-operations/index.ts` | Add `inviteUser` operation |
| `src/pages/SetupPassword.tsx` | New -- invite password setup page |
| `src/components/SecurityTokenDialog.tsx` | New -- reusable OTP verification dialog |
| `src/pages/PerfilUsuarios.tsx` | Remove password fields, use invite flow |
| `src/pages/CofreSenhas.tsx` | Add OTP verification before export |
| `src/pages/Relatorios.tsx` | Add OTP verification for password reports |
| `src/components/dashboard/DashboardReportExport.tsx` | Add OTP verification before report generation |
| `src/App.tsx` | Add `/setup-password` route |
| `src/hooks/useAdminOperations.tsx` | Add `inviteUser` method |

## Technical Notes

- Supabase's `signInWithOtp` with `shouldCreateUser: false` uses the built-in SMTP (no external email service needed)
- The OTP is valid for the duration configured in Supabase auth settings (default 5 min)
- `inviteUserByEmail` uses Supabase's invite email template -- customizable in the Supabase dashboard
- The `verifyOtp` call refreshes the session but since the user is already logged in, this just re-validates
- `SecurityTokenDialog` includes a 60-second cooldown between resend requests to prevent spam

