

# Plan: Fix Account Creation, Rename "Empresa Terceira", and Prepare Redesign

## Issues Identified

### 1. Account creation error (ZodError)
The project uses **zod v4** (`^4.0.9`) but `@hookform/resolvers` v3 does **not** support zod v4. The ZodError in the screenshot shows the validation throwing an uncaught error with zod v4's new error format. The fix is to wrap the signup validation to handle errors gracefully, or more correctly, **use zod v4's compatibility layer** (`zod/v4/mini`) or downgrade validation to manual handling that catches errors properly.

**Root cause**: `zodResolver` from `@hookform/resolvers` v3 expects zod v3 error shapes. Zod v4 throws `ZodError` with a different structure, causing uncaught promise rejections.

**Fix**: Replace `zodResolver(signupSchema)` with a custom resolver that uses zod v4's `safeParse` correctly, or simplify signup validation to avoid the incompatibility. The simplest reliable fix is to bypass zodResolver for signup and validate manually in the submit handler with a try/catch around `signupSchema.parse()`.

### 2. Rename "Empresa Terceira" → "Empresa"
All UI labels across ~9 files need updating. The internal field names (`empresa_terceira_id`, table `empresas_terceiras`) stay the same — only visible text changes.

**Files to update**:
- `src/components/layout/AppSidebar.tsx` — sidebar menu title + resource map
- `src/pages/Empresas.tsx` — page title, dialog title, empty state
- `src/pages/Clientes.tsx` — form labels, view dialog
- `src/pages/Manutencoes.tsx` — form label
- `src/pages/CofreSenhas.tsx` — form label, comments
- `src/pages/PermissionProfiles.tsx` — SYSTEM_RESOURCES label
- `src/components/permissions/EmpresaPermissionsTab.tsx` — empty state text, admin text
- `src/components/permissions/ProfileAccessEditor.tsx` — empty state text
- `src/components/permissions/ProfileAccessDialog.tsx` — (internal, no visible label change needed)
- `src/components/ExcelImport.tsx` — template column name
- `src/pages/Dashboard.tsx` — any references

### 3. Tipos de Manutenção visibility
Currently `tipos_manutencao` RLS requires `user_id = auth.uid()` or admin or system permission. The user wants all authenticated users to see all tipos. This requires a **new RLS policy** on `tipos_manutencao`:
```sql
CREATE POLICY "All authenticated users can view tipos"
ON tipos_manutencao FOR SELECT TO authenticated
USING (true);
```

### 4. Redesign (mobile app-like + desktop modern) + Dashboard analítico
This is a massive scope item. Will be planned separately after the above fixes are implemented.

---

## Implementation Steps

1. **Fix signup ZodError** — Remove `zodResolver` from signup form. Validate manually in `handleSignUp` with try/catch around `signupSchema.safeParse()`, showing field errors via `signupForm.setError()`.

2. **Rename "Empresa Terceira" → "Empresa"** — Update all UI-facing labels in the 9+ files listed above. Keep internal field/table names unchanged.

3. **Add RLS policy for tipos_manutencao** — Run SQL migration to allow all authenticated users to SELECT from `tipos_manutencao`.

4. **Redesign + Dashboard** — Deferred to a follow-up implementation after these fixes are confirmed working.

