

## Problem

The `NotFoundError: Failed to execute 'removeChild' on 'Node'` error occurs because Radix UI's `Select` portals its dropdown content to `document.body`, but when used inside a `Dialog` (which also uses a portal), DOM cleanup conflicts arise. When a Select value changes and React re-renders the Dialog content, the portaled Select nodes are no longer children of the expected parent, causing the crash.

## Solution

Modify the `SelectContent` component in `src/components/ui/select.tsx` to accept an optional `portal` prop (default `true`). When `portal={false}`, skip the `SelectPrimitive.Portal` wrapper. Then, update all `SelectContent` instances inside the maintenance Dialog form in `src/pages/Manutencoes.tsx` to use `portal={false}`.

## Changes

### 1. `src/components/ui/select.tsx`
- Add an optional `portal?: boolean` prop to `SelectContent`
- When `portal` is `false`, render content directly without `SelectPrimitive.Portal`

### 2. `src/pages/Manutencoes.tsx`
- Add `portal={false}` to all `<SelectContent>` inside the Dialog (lines ~385, 399, 414, 473) — the form Select components for Cliente, Empresa, Tipo, and Status

This is a minimal, targeted fix that doesn't affect Select components used outside dialogs.

