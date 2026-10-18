# Access control
- Company and client lists and mutations rely on tenant-scoped RLS, not creator-only frontend filters, so team admins can share records while preserving the original creator.
- Tenant-admin policy helpers live in the unexposed private schema and derive the caller from auth.uid(), so they cannot be used as public privilege probes.
- Keep tenant ownership distinct from permission-profile admin capability; do not reassign independent accounts or their data to resolve a visibility issue.