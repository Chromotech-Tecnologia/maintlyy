import { useState, useEffect } from "react"
import { searchMatch } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, Building2, Eye, Search } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useAuditLog } from "@/hooks/useAuditLog"
import { usePermissions } from "@/hooks/usePermissions"
import { usePlanLimits } from "@/hooks/usePlanLimits"
import { BulkActionsBar } from "@/components/BulkActionsBar"
import { TablePagination } from "@/components/TablePagination"

interface EmpresaTerceira {
  id: string
  nome_empresa: string
  ativo: boolean
  created_at: string
}

export default function Empresas() {
  const { user } = useAuth()
  const { isAdmin, canViewDetailsSystem, canEditSystem, canCreateSystem, canDeleteSystem } = usePermissions()
  const planLimits = usePlanLimits()
  const [empresas, setEmpresas] = useState<EmpresaTerceira[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingEmpresa, setViewingEmpresa] = useState<EmpresaTerceira | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nomeEmpresa, setNomeEmpresa] = useState("")
  const [ativoEmpresa, setAtivoEmpresa] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchEmpresas = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase.from('empresas_terceiras').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      if (error) throw error
      setEmpresas(data || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmpresas() }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !nomeEmpresa.trim()) return
    try {
      if (editingId) {
        const { error } = await supabase.from('empresas_terceiras').update({ nome_empresa: nomeEmpresa.trim(), ativo: ativoEmpresa }).eq('id', editingId)
        if (error) throw error
        toast.success("Empresa atualizada!")
      } else {
        const { error } = await supabase.from('empresas_terceiras').insert([{ nome_empresa: nomeEmpresa.trim(), ativo: ativoEmpresa, user_id: user.id }])
        if (error) throw error
        toast.success("Empresa criada!")
      }
      setOpen(false); setEditingId(null); setNomeEmpresa(""); setAtivoEmpresa(true); fetchEmpresas()
    } catch (error: any) { toast.error(error.message) }
  }

  const handleEdit = (empresa: EmpresaTerceira) => {
    setNomeEmpresa(empresa.nome_empresa); setAtivoEmpresa(empresa.ativo); setEditingId(empresa.id); setOpen(true)
  }

  const handleView = (empresa: EmpresaTerceira) => { setViewingEmpresa(empresa); setViewDialogOpen(true) }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('empresas_terceiras').delete().eq('id', id)
      if (error) throw error
      toast.success("Empresa excluída!"); fetchEmpresas()
    } catch (error: any) { toast.error(error.message) }
  }

  const filtered = empresas.filter(e => !searchTerm || searchMatch(e.nome_empresa, searchTerm))
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => { setCurrentPage(1) }, [searchTerm, pageSize])

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }
  const toggleSelectAll = () => {
    if (paginatedData.every(e => selectedIds.has(e.id))) setSelectedIds(new Set())
    else setSelectedIds(new Set(paginatedData.map(e => e.id)))
  }
  const selectAllFiltered = () => setSelectedIds(new Set(filtered.map(e => e.id)))

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selectedIds.size} empresa(s)?`)) return
    try {
      for (const id of Array.from(selectedIds)) {
        const { error } = await supabase.from('empresas_terceiras').delete().eq('id', id)
        if (error) throw error
      }
      toast.success(`${selectedIds.size} empresa(s) excluída(s)!`); setSelectedIds(new Set()); fetchEmpresas()
    } catch (error: any) { toast.error(error.message) }
  }

  const handleBulkStatusChange = async (status: string) => {
    try {
      const ativo = status === "ativa"
      for (const id of Array.from(selectedIds)) {
        const { error } = await supabase.from('empresas_terceiras').update({ ativo }).eq('id', id)
        if (error) throw error
      }
      toast.success(`${selectedIds.size} empresa(s) atualizada(s)!`); setSelectedIds(new Set()); fetchEmpresas()
    } catch (error: any) { toast.error(error.message) }
  }

  if (loading) {
    return (<div className="space-y-6 animate-fade-in">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}</div>)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Empresas</h1>
          <p className="page-subtitle">Gerencie as empresas para as quais você presta serviços</p>
        </div>
        
        {(isAdmin || canCreateSystem('empresas_terceiras')) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={(e) => {
                if (!planLimits.loading && !planLimits.canCreateEmpresa) {
                  e.preventDefault(); e.stopPropagation()
                  toast.error(`Limite de empresas atingido (${planLimits.currentEmpresas}/${planLimits.maxEmpresas}). Contrate um plano para cadastrar mais.`)
                  return
                }
              }} className="gradient-primary border-0 shadow-lg shadow-primary/25 rounded-xl h-11 px-5">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Nova Empresa</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar" : "Nova"} Empresa</DialogTitle>
                <DialogDescription>Adicione uma empresa para a qual você presta serviços</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_empresa">Nome da Empresa *</Label>
                  <Input id="nome_empresa" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="Digite o nome da empresa" required />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="ativo_empresa">Empresa ativa</Label>
                  <Switch id="ativo_empresa" checked={ativoEmpresa} onCheckedChange={setAtivoEmpresa} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit">{editingId ? "Atualizar" : "Criar"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes da Empresa</DialogTitle></DialogHeader>
          {viewingEmpresa && (
            <div className="space-y-4">
              <div><Label className="text-muted-foreground">Nome da Empresa</Label><p className="text-lg font-medium">{viewingEmpresa.nome_empresa}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><p className={`font-medium ${viewingEmpresa.ativo ? 'text-green-600' : 'text-destructive'}`}>{viewingEmpresa.ativo ? 'Ativa' : 'Inativa'}</p></div>
              <div><Label className="text-muted-foreground">Data de Criação</Label><p>{new Date(viewingEmpresa.created_at).toLocaleDateString()}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="search-bar">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input placeholder="Buscar por nome da empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-11 bg-card/80 backdrop-blur border-border/50 rounded-xl shadow-sm" />
      </div>

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        totalCount={filtered.length}
        onSelectAll={selectAllFiltered}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkDelete={handleBulkDelete}
        onBulkStatusChange={handleBulkStatusChange}
        statusOptions={[
          { value: "ativa", label: "Ativa" },
          { value: "inativa", label: "Inativa" },
        ]}
        canDelete={isAdmin || canDeleteSystem('empresas_terceiras')}
        canEdit={isAdmin || canEditSystem('empresas_terceiras')}
      />

      {/* Desktop Table */}
      <Card className="glass-card border-0 hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="w-10">
                  <Checkbox checked={paginatedData.length > 0 && paginatedData.every(e => selectedIds.has(e.id))} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead className="font-semibold">Nome da Empresa</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Data de Criação</TableHead>
                <TableHead className="w-24 font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((empresa) => (
                <TableRow key={empresa.id} className={`border-border/30 hover:bg-muted/40 ${selectedIds.has(empresa.id) ? 'bg-primary/5' : ''}`}>
                  <TableCell><Checkbox checked={selectedIds.has(empresa.id)} onCheckedChange={() => toggleSelect(empresa.id)} /></TableCell>
                  <TableCell className="font-medium">{empresa.nome_empresa}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${empresa.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {empresa.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(empresa.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(isAdmin || canViewDetailsSystem('empresas_terceiras')) && (
                        <Button size="sm" variant="ghost" onClick={() => handleView(empresa)} className="h-8 w-8 p-0 rounded-lg"><Eye className="h-3.5 w-3.5" /></Button>
                      )}
                      {(isAdmin || canEditSystem('empresas_terceiras')) && (
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(empresa)} className="h-8 w-8 p-0 rounded-lg"><Edit className="h-3.5 w-3.5" /></Button>
                      )}
                      {(isAdmin || canDeleteSystem('empresas_terceiras')) && (
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(empresa.id)} className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedData.map((empresa) => (
          <div key={empresa.id} className={`mobile-card ${selectedIds.has(empresa.id) ? 'ring-2 ring-primary/30' : ''}`}>
            <div className="flex items-center gap-3">
              <Checkbox checked={selectedIds.has(empresa.id)} onCheckedChange={() => toggleSelect(empresa.id)} />
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{empresa.nome_empresa}</p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${empresa.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {empresa.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(empresa.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              {(isAdmin || canViewDetailsSystem('empresas_terceiras')) && (
                <Button size="sm" variant="outline" onClick={() => handleView(empresa)} className="flex-1 h-9 rounded-lg text-xs"><Eye className="h-3.5 w-3.5 mr-1" />Ver</Button>
              )}
              {(isAdmin || canEditSystem('empresas_terceiras')) && (
                <Button size="sm" variant="outline" onClick={() => handleEdit(empresa)} className="flex-1 h-9 rounded-lg text-xs"><Edit className="h-3.5 w-3.5 mr-1" />Editar</Button>
              )}
              {(isAdmin || canDeleteSystem('empresas_terceiras')) && (
                <Button size="sm" variant="outline" onClick={() => handleDelete(empresa.id)} className="h-9 w-9 p-0 rounded-lg text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <TablePagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalItems={filtered.length} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
      )}
      
      {empresas.length === 0 && (
        <div className="glass-card text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-display font-semibold mb-1">Nenhuma empresa encontrada</h3>
          <p className="text-sm text-muted-foreground">Comece adicionando sua primeira empresa.</p>
        </div>
      )}
    </div>
  )
}
