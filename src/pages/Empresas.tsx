import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Building2, Eye } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"

interface EmpresaTerceira {
  id: string
  nome_empresa: string
  created_at: string
}

export default function Empresas() {
  const { user } = useAuth()
  const { isAdmin, canViewDetailsSystem, canEditSystem, canCreateSystem, canDeleteSystem } = usePermissions()
  const [empresas, setEmpresas] = useState<EmpresaTerceira[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingEmpresa, setViewingEmpresa] = useState<EmpresaTerceira | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nomeEmpresa, setNomeEmpresa] = useState("")

  const fetchEmpresas = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('empresas_terceiras')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEmpresas(data || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmpresas()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !nomeEmpresa.trim()) return

    try {
      if (editingId) {
        const { error } = await supabase
          .from('empresas_terceiras')
          .update({ nome_empresa: nomeEmpresa.trim() })
          .eq('id', editingId)
        
        if (error) throw error
        toast.success("Empresa atualizada!")
      } else {
        const { error } = await supabase
          .from('empresas_terceiras')
          .insert([{ 
            nome_empresa: nomeEmpresa.trim(),
            user_id: user.id 
          }])
        
        if (error) throw error
        toast.success("Empresa criada!")
      }

      setOpen(false)
      setEditingId(null)
      setNomeEmpresa("")
      fetchEmpresas()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleEdit = (empresa: EmpresaTerceira) => {
    setNomeEmpresa(empresa.nome_empresa)
    setEditingId(empresa.id)
    setOpen(true)
  }

  const handleView = (empresa: EmpresaTerceira) => {
    setViewingEmpresa(empresa)
    setViewDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('empresas_terceiras')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      toast.success("Empresa excluída!")
      fetchEmpresas()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empresas Terceiras</h1>
          <p className="text-muted-foreground">Gerencie as empresas para as quais você presta serviços</p>
        </div>
        
        {(isAdmin || canCreateSystem('empresas_terceiras')) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar" : "Nova"} Empresa Terceira</DialogTitle>
                <DialogDescription>
                  Adicione uma empresa para a qual você presta serviços como terceirizado
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_empresa">Nome da Empresa *</Label>
                  <Input
                    id="nome_empresa"
                    value={nomeEmpresa}
                    onChange={(e) => setNomeEmpresa(e.target.value)}
                    placeholder="Digite o nome da empresa"
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingId ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Empresa</DialogTitle>
          </DialogHeader>
          {viewingEmpresa && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Nome da Empresa</Label>
                <p className="text-lg font-medium">{viewingEmpresa.nome_empresa}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Data de Criação</Label>
                <p>{new Date(viewingEmpresa.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lista de Empresas
          </CardTitle>
          <CardDescription>
            {empresas.length} empresas registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Empresa</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.map((empresa) => (
                <TableRow key={empresa.id}>
                  <TableCell className="font-medium">{empresa.nome_empresa}</TableCell>
                  <TableCell>
                    {new Date(empresa.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(isAdmin || canViewDetailsSystem('empresas_terceiras')) && (
                        <Button size="sm" variant="ghost" onClick={() => handleView(empresa)} title="Ver detalhes">
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      {(isAdmin || canEditSystem('empresas_terceiras')) && (
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(empresa)} title="Editar">
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {(isAdmin || canDeleteSystem('empresas_terceiras')) && (
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(empresa.id)} title="Excluir">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {empresas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma empresa encontrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}