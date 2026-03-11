

# Plan: Enhanced Dashboard Reports with History, Public Links, and Mobile UX

## Summary

Major overhaul of the dashboard report system: add status/empresa filters, create a report history with public sharing links, improve the exported report content (add values on charts, remove status/team charts from report, add detailed analytical table matching the spreadsheet format), separate date filters for analytics vs charts, and optimize mobile layout.

## Database Changes

**New table: `generated_reports`** to store report history and public links.

```sql
CREATE TABLE public.generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  public_id text UNIQUE NOT NULL DEFAULT encode(gen_random_uuid()::text::bytea, 'hex'),
  title text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  report_html text NOT NULL,
  format text NOT NULL DEFAULT 'pdf',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Owner can CRUD
CREATE POLICY "Users manage own reports" ON public.generated_reports
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public view by public_id (for the public page)
CREATE POLICY "Anyone can view by public_id" ON public.generated_reports
  FOR SELECT TO anon, authenticated USING (true);
```

## New Route: Public Report Viewer

- **`/relatorio-publico/:publicId`** — a standalone page (no auth required) that fetches and renders the saved report HTML from `generated_reports` by `public_id`.
- Added outside the `ProtectedRoute` wrapper in `App.tsx`.

## File Changes

### 1. `src/pages/Dashboard.tsx`
- Add **empresa filter** (state `filterEmpresa`, fetch `empresas_terceiras`, add Select in filter bar).
- Add **status filter** (state `filterStatus` with options: Todos, Em andamento, Finalizado, Cancelado).
- Pass `empresas` and status data to the report export component.

### 2. `src/components/dashboard/DashboardReportExport.tsx` (major rewrite)
- **Add empresa + status filters** in the controls section.
- **Remove** "Por Status" pie chart and "Horas por Equipe" bar chart from the exported report (keep only in dashboard).
- **Add `<LabelList>`** to BarChart and values on Pie charts so exported images/PDFs show numeric values on the graphs.
- **Separate date filters**: one pair for the chart period (more months), one pair for the analytical table (less data).
- **Analytical table**: match the uploaded spreadsheet format with columns: Tipo de Manutenção, Mês, Ano, Data, Tempo Dedicado, Descrição (Acesso físico), Status (Finalizada).
- **Multiple empresas**: when multiple selected or "todos", show all empresa names in the header.
- **Report history**: after export, save the report HTML + filters to `generated_reports` table and generate a public link. Show a "Copy Link" button.
- **Export formats**: PDF, PNG, and new "Link Público" option.
- **Mobile layout**: replace fixed `minWidth: 800` with responsive layout. Use accordion-style sections, stacked charts, scrollable containers. Follow app-like mobile style with `max-w-[calc(100vw-2rem)]` dialog.

### 3. `src/pages/RelatorioPublico.tsx` (new)
- Standalone page that loads report by `public_id` from Supabase.
- Renders the saved HTML content with proper branding.
- No authentication required.

### 4. `src/App.tsx`
- Add route `/relatorio-publico/:publicId` outside `ProtectedRoute`.
- Import `RelatorioPublico` page.

## Technical Details

- **Chart values**: Use Recharts `<LabelList>` component on `<Bar>` and custom label on `<Pie>` to render values directly on the charts for PDF/image exports.
- **Report saving**: After `html2canvas` captures the report, the HTML of `reportRef.current.innerHTML` is saved to `generated_reports` along with the applied filters as JSON.
- **Public link format**: `https://{domain}/relatorio-publico/{public_id}`
- **Mobile report dialog**: `DialogContent` uses `max-w-[calc(100vw-1rem)] sm:max-w-5xl` with the report preview using `overflow-x-auto` and charts stacking vertically on small screens.
- **Separate date filters**: Two date filter groups in the export dialog — "Período dos Gráficos" and "Período do Analítico" — each with independent start/end dates.

