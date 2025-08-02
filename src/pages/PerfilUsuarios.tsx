import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, Users, Shield } from "lucide-react"
import { toast } from "sonner"

interface UserProfile {
  id: string
  user_id: string
  display_name: string | null
  email: string | null
  is_admin: boolean
  created_at: string
}

interface ClientPermission {
  id: string
  user_id: string
  cliente_id: string
  can_view: boolean
  can_edit: boolean
  clientes?: {
    nome_cliente: string
  }
}

interface Cliente {
  id: string
  nome_cliente: string
}

export default function PerfilUsuarios() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [clientPermissions, setClientPermissions] = useState<ClientPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    display_name: "",
    email: "",
    is_admin: false
  })

  useEffect(() => {
    fetchProfiles()
    fetchClientes()
  }, [])

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProfiles(data || [])
    } catch (error) {
      console.error('Erro ao buscar perfis:', error)
      toast.error('Erro ao carregar perfis')
    } finally {
      setLoading(false)
    }
  }

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome_cliente')
        .eq('user_id', user?.id)

      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    }
  }

  const fetchClientPermissions = async (profileUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_client_permissions')
        .select('*')
        .eq('user_id', profileUserId)

      if (error) throw error
      
      // Buscar detalhes dos clientes separadamente
      if (data && data.length > 0) {
        const clienteIds = data.map(p => p.cliente_id)
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nome_cliente')
          .in('id', clienteIds)
        
        // Combinar dados
        const permissionsWithClients = data.map(permission => ({
          ...permission,
          clientes: clientesData?.find(c => c.id === permission.cliente_id)
        }))
        
        setClientPermissions(permissionsWithClients)
      } else {
        setClientPermissions([])
      }
    } catch (error) {
      console.error('Erro ao buscar permissões:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const profileData = {
        user_id: user?.id,
        display_name: formData.display_name,
        email: formData.email,
        is_admin: formData.is_admin
      }

      const { error } = await supabase
        .from('user_profiles')
        .insert(profileData)

      if (error) throw error

      toast.success('Perfil criado com sucesso!')
      setDialogOpen(false)
      setFormData({ display_name: "", email: "", is_admin: false })
      fetchProfiles()
    } catch (error: any) {
      console.error('Erro ao criar perfil:', error)
      toast.error('Erro ao criar perfil: ' + error.message)
    }
  }

  const handlePermissionChange = async (clienteId: string, permission: 'can_view' | 'can_edit', value: boolean) => {
    if (!selectedProfile) return

    try {
      // Verificar se já existe uma permissão para este cliente
      const existingPermission = clientPermissions.find(p => p.cliente_id === clienteId)

      if (existingPermission) {
        // Atualizar permissão existente
        const { error } = await supabase
          .from('user_client_permissions')
          .update({ [permission]: value })
          .eq('id', existingPermission.id)

        if (error) throw error
      } else {
        // Criar nova permissão
        const { error } = await supabase
          .from('user_client_permissions')
          .insert({
            user_id: selectedProfile.user_id,
            cliente_id: clienteId,
            [permission]: value,
            can_view: permission === 'can_view' ? value : false,
            can_edit: permission === 'can_edit' ? value : false
          })

        if (error) throw error
      }

      // Recarregar permissões
      fetchClientPermissions(selectedProfile.user_id)
      toast.success('Permissão atualizada!')
    } catch (error: any) {
      console.error('Erro ao atualizar permissão:', error)
      toast.error('Erro ao atualizar permissão')
    }
  }

  const openPermissionsDialog = (profile: UserProfile) => {
    setSelectedProfile(profile)
    fetchClientPermissions(profile.user_id)
    setPermissionsDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando perfis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Perfis de Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie perfis e permissões de acesso
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Novo Perfil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Perfil</DialogTitle>
              <DialogDescription>
                Crie um novo perfil de usuário com permissões específicas
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="display_name">Nome de Exibição</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Ex: João Silva"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="usuario@exemplo.com"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_admin"
                  checked={formData.is_admin}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_admin: !!checked }))}
                />
                <Label htmlFor="is_admin">Administrador</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Perfil</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {profile.display_name}
                      {profile.is_admin && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Admin
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{profile.email}</CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPermissionsDialog(profile)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Gerenciar Permissões
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Dialog de Permissões */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Permissões de {selectedProfile?.display_name}
            </DialogTitle>
            <DialogDescription>
              Configure quais clientes este usuário pode visualizar e editar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {clientes.map((cliente) => {
              const permission = clientPermissions.find(p => p.cliente_id === cliente.id)
              return (
                <div key={cliente.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{cliente.nome_cliente}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`view-${cliente.id}`}
                        checked={permission?.can_view || false}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(cliente.id, 'can_view', !!checked)
                        }
                      />
                      <Label htmlFor={`view-${cliente.id}`}>Visualizar</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${cliente.id}`}
                        checked={permission?.can_edit || false}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(cliente.id, 'can_edit', !!checked)
                        }
                      />
                      <Label htmlFor={`edit-${cliente.id}`}>Editar</Label>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}