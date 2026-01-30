import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Shield, Check, X, Building } from "lucide-react"
import { toast } from "sonner"

interface EmpresaPermission {
  id: string
  user_id: string
  empresa_terceira_id: string
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  can_create_manutencao: boolean
}

interface Empresa {
  id: string
  nome_empresa: string
}

interface EmpresaPermissionsTabProps {
  selectedProfile: {
    user_id: string
    is_admin: boolean
    display_name: string | null
  } | null
}

export function EmpresaPermissionsTab({ selectedProfile }: EmpresaPermissionsTabProps) {
  const [empresaPermissions, setEmpresaPermissions] = useState<EmpresaPermission[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])

  useEffect(() => {
    fetchEmpresas()
  }, [])

  useEffect(() => {
    if (selectedProfile && !selectedProfile.is_admin) {
      fetchEmpresaPermissions(selectedProfile.user_id)
    }
  }, [selectedProfile])

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas_terceiras')
        .select('id, nome_empresa')
        .order('nome_empresa')

      if (error) throw error
      setEmpresas(data || [])
    } catch (error) {
      console.error('Erro ao buscar empresas:', error)
    }
  }

  const fetchEmpresaPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_empresa_permissions')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error
      setEmpresaPermissions(data || [])
    } catch (error) {
      console.error('Erro ao buscar permissões de empresas:', error)
    }
  }

  const handleEmpresaPermissionChange = async (
    empresaId: string, 
    permission: 'can_view' | 'can_edit' | 'can_delete' | 'can_create_manutencao', 
    value: boolean
  ) => {
    if (!selectedProfile) return

    try {
      const existingPermission = empresaPermissions.find(p => p.empresa_terceira_id === empresaId)

      if (existingPermission) {
        const updateData: any = { [permission]: value }
        
        // Se desmarcar can_view, desmarcar todas as outras
        if (permission === 'can_view' && !value) {
          updateData.can_edit = false
          updateData.can_delete = false
          updateData.can_create_manutencao = false
        }
        // Se marcar qualquer outra, marcar can_view também
        if (permission !== 'can_view' && value) {
          updateData.can_view = true
        }

        const { error } = await supabase
          .from('user_empresa_permissions')
          .update(updateData)
          .eq('id', existingPermission.id)

        if (error) throw error
      } else {
        const newPermission: any = {
          user_id: selectedProfile.user_id,
          empresa_terceira_id: empresaId,
          can_view: permission === 'can_view' ? value : value,
          can_edit: permission === 'can_edit' ? value : false,
          can_delete: permission === 'can_delete' ? value : false,
          can_create_manutencao: permission === 'can_create_manutencao' ? value : false
        }

        const { error } = await supabase
          .from('user_empresa_permissions')
          .insert(newPermission)

        if (error) throw error
      }

      fetchEmpresaPermissions(selectedProfile.user_id)
      toast.success('Permissão de empresa atualizada!')
    } catch (error: any) {
      console.error('Erro ao atualizar permissão:', error)
      toast.error('Erro ao atualizar permissão')
    }
  }

  const toggleAllEmpresaPermissions = async (enable: boolean) => {
    if (!selectedProfile) return

    try {
      for (const empresa of empresas) {
        const existingPermission = empresaPermissions.find(p => p.empresa_terceira_id === empresa.id)

        if (existingPermission) {
          await supabase
            .from('user_empresa_permissions')
            .update({
              can_view: enable,
              can_edit: enable,
              can_delete: enable,
              can_create_manutencao: enable
            })
            .eq('id', existingPermission.id)
        } else if (enable) {
          await supabase
            .from('user_empresa_permissions')
            .insert({
              user_id: selectedProfile.user_id,
              empresa_terceira_id: empresa.id,
              can_view: enable,
              can_edit: enable,
              can_delete: enable,
              can_create_manutencao: enable
            })
        }
      }

      fetchEmpresaPermissions(selectedProfile.user_id)
      toast.success(enable ? 'Todas as permissões habilitadas!' : 'Todas as permissões desabilitadas!')
    } catch (error: any) {
      console.error('Erro ao atualizar permissões:', error)
      toast.error('Erro ao atualizar permissões')
    }
  }

  const toggleEmpresaPermissions = async (empresaId: string, enable: boolean) => {
    if (!selectedProfile) return

    try {
      const existingPermission = empresaPermissions.find(p => p.empresa_terceira_id === empresaId)

      if (existingPermission) {
        await supabase
          .from('user_empresa_permissions')
          .update({
            can_view: enable,
            can_edit: enable,
            can_delete: enable,
            can_create_manutencao: enable
          })
          .eq('id', existingPermission.id)
      } else {
        await supabase
          .from('user_empresa_permissions')
          .insert({
            user_id: selectedProfile.user_id,
            empresa_terceira_id: empresaId,
            can_view: enable,
            can_edit: enable,
            can_delete: enable,
            can_create_manutencao: enable
          })
      }

      fetchEmpresaPermissions(selectedProfile.user_id)
      toast.success('Permissões atualizadas!')
    } catch (error: any) {
      console.error('Erro ao atualizar permissões:', error)
      toast.error('Erro ao atualizar permissões')
    }
  }

  if (selectedProfile?.is_admin) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            Este usuário é administrador e tem acesso total a todas as empresas terceiras
          </span>
        </div>
      </div>
    )
  }

  if (empresas.length === 0) {
    return (
      <div className="text-center py-8">
        <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          Nenhuma empresa terceira cadastrada.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleAllEmpresaPermissions(true)}
        >
          <Check className="w-4 h-4 mr-2" />
          Marcar Todos
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleAllEmpresaPermissions(false)}
        >
          <X className="w-4 h-4 mr-2" />
          Desmarcar Todos
        </Button>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {empresas.map((empresa) => {
          const permission = empresaPermissions.find(p => p.empresa_terceira_id === empresa.id)
          
          return (
            <div key={empresa.id} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium">{empresa.nome_empresa}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleEmpresaPermissions(empresa.id, true)}
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleEmpresaPermissions(empresa.id, false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`empresa-view-${empresa.id}`}
                    checked={permission?.can_view || false}
                    onCheckedChange={(checked) => 
                      handleEmpresaPermissionChange(empresa.id, 'can_view', !!checked)
                    }
                  />
                  <Label htmlFor={`empresa-view-${empresa.id}`}>Ver</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`empresa-edit-${empresa.id}`}
                    checked={permission?.can_edit || false}
                    onCheckedChange={(checked) => 
                      handleEmpresaPermissionChange(empresa.id, 'can_edit', !!checked)
                    }
                  />
                  <Label htmlFor={`empresa-edit-${empresa.id}`}>Editar</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`empresa-create-${empresa.id}`}
                    checked={permission?.can_create_manutencao || false}
                    onCheckedChange={(checked) => 
                      handleEmpresaPermissionChange(empresa.id, 'can_create_manutencao', !!checked)
                    }
                  />
                  <Label htmlFor={`empresa-create-${empresa.id}`}>Criar Manutenção</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`empresa-delete-${empresa.id}`}
                    checked={permission?.can_delete || false}
                    onCheckedChange={(checked) => 
                      handleEmpresaPermissionChange(empresa.id, 'can_delete', !!checked)
                    }
                  />
                  <Label htmlFor={`empresa-delete-${empresa.id}`}>Excluir</Label>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
