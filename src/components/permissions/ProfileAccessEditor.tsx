import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Building, Check, ChevronDown, ChevronRight, Key, X } from "lucide-react"

interface Cliente {
  id: string
  nome_cliente: string
}

interface Empresa {
  id: string
  nome_empresa: string
}

interface Senha {
  id: string
  nome_acesso: string
  login?: string
  cliente_id?: string
}

export type ClientAccessRow = {
  cliente_id: string
  can_view?: boolean
  can_edit?: boolean
  can_create?: boolean
  can_delete?: boolean
}

export type EmpresaAccessRow = {
  empresa_terceira_id: string
  can_view?: boolean
  can_edit?: boolean
  can_delete?: boolean
  can_create_manutencao?: boolean
}

export type PasswordAccessRow = {
  senha_id: string
  can_view?: boolean
  can_edit?: boolean
}

interface ProfileAccessEditorProps {
  active?: boolean
  resetKey?: string

  clientAccess: ClientAccessRow[]
  setClientAccess: React.Dispatch<React.SetStateAction<ClientAccessRow[]>>

  empresaAccess: EmpresaAccessRow[]
  setEmpresaAccess: React.Dispatch<React.SetStateAction<EmpresaAccessRow[]>>

  passwordAccess: PasswordAccessRow[]
  setPasswordAccess: React.Dispatch<React.SetStateAction<PasswordAccessRow[]>>
}

export function ProfileAccessEditor({
  active = true,
  resetKey,
  clientAccess,
  setClientAccess,
  empresaAccess,
  setEmpresaAccess,
  passwordAccess,
  setPasswordAccess,
}: ProfileAccessEditorProps) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [senhasPorCliente, setSenhasPorCliente] = useState<Record<string, Senha[]>>({})
  const [expandedClientes, setExpandedClientes] = useState<Set<string>>(new Set())
  const [loadingClientes, setLoadingClientes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!active) return

    const load = async () => {
      const [clientesRes, empresasRes] = await Promise.all([
        supabase.from("clientes").select("id, nome_cliente").order("nome_cliente"),
        supabase.from("empresas_terceiras").select("id, nome_empresa").order("nome_empresa"),
      ])

      setClientes(clientesRes.data || [])
      setEmpresas(empresasRes.data || [])
      setSenhasPorCliente({})
      setExpandedClientes(new Set())
      setLoadingClientes(new Set())
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, resetKey])

  const getClientPerm = (clienteId: string) => clientAccess.find((p) => p.cliente_id === clienteId) || null

  const setClientPerm = (clienteId: string, perm: keyof Omit<ClientAccessRow, "cliente_id">, value: boolean) => {
    setClientAccess((prev) => {
      const existing = prev.find((p) => p.cliente_id === clienteId)
      if (existing) {
        const updated: ClientAccessRow = { ...existing, [perm]: value }

        if (perm === "can_view" && !value) {
          updated.can_edit = false
          updated.can_create = false
          updated.can_delete = false
        } else if (perm !== "can_view" && value) {
          updated.can_view = true
        }

        return prev.map((p) => (p.cliente_id === clienteId ? updated : p))
      }

      const newPerm: ClientAccessRow = {
        cliente_id: clienteId,
        can_view: false,
        can_edit: false,
        can_create: false,
        can_delete: false,
        [perm]: value,
      }

      if (perm !== "can_view" && value) newPerm.can_view = true
      return [...prev, newPerm]
    })
  }

  const toggleAllClients = (enable: boolean) => {
    if (enable) {
      setClientAccess(
        clientes.map((c) => ({
          cliente_id: c.id,
          can_view: true,
          can_edit: true,
          can_create: true,
          can_delete: true,
        }))
      )
    } else {
      setClientAccess([])
    }
  }

  const getEmpresaPerm = (empresaId: string) => empresaAccess.find((p) => p.empresa_terceira_id === empresaId) || null

  const setEmpresaPerm = (
    empresaId: string,
    perm: keyof Omit<EmpresaAccessRow, "empresa_terceira_id">,
    value: boolean
  ) => {
    setEmpresaAccess((prev) => {
      const existing = prev.find((p) => p.empresa_terceira_id === empresaId)
      if (existing) {
        const updated: EmpresaAccessRow = { ...existing, [perm]: value }

        if (perm === "can_view" && !value) {
          updated.can_edit = false
          updated.can_delete = false
          updated.can_create_manutencao = false
        } else if (perm !== "can_view" && value) {
          updated.can_view = true
        }

        return prev.map((p) => (p.empresa_terceira_id === empresaId ? updated : p))
      }

      const newPerm: EmpresaAccessRow = {
        empresa_terceira_id: empresaId,
        can_view: false,
        can_edit: false,
        can_delete: false,
        can_create_manutencao: false,
        [perm]: value,
      }

      if (perm !== "can_view" && value) newPerm.can_view = true
      return [...prev, newPerm]
    })
  }

  const toggleAllEmpresas = (enable: boolean) => {
    if (enable) {
      setEmpresaAccess(
        empresas.map((e) => ({
          empresa_terceira_id: e.id,
          can_view: true,
          can_edit: true,
          can_delete: true,
          can_create_manutencao: true,
        }))
      )
    } else {
      setEmpresaAccess([])
    }
  }

  const fetchSenhasByCliente = async (clienteId: string) => {
    if (senhasPorCliente[clienteId]) return

    setLoadingClientes((prev) => new Set(prev).add(clienteId))
    try {
      const { data } = await supabase
        .from("cofre_senhas")
        .select("id, nome_acesso, login, cliente_id")
        .eq("cliente_id", clienteId)
        .order("nome_acesso")

      setSenhasPorCliente((prev) => ({ ...prev, [clienteId]: data || [] }))
    } finally {
      setLoadingClientes((prev) => {
        const s = new Set(prev)
        s.delete(clienteId)
        return s
      })
    }
  }

  const toggleCliente = (clienteId: string) => {
    setExpandedClientes((prev) => {
      const s = new Set(prev)
      if (s.has(clienteId)) {
        s.delete(clienteId)
      } else {
        s.add(clienteId)
        fetchSenhasByCliente(clienteId)
      }
      return s
    })
  }

  const getPasswordPerm = (senhaId: string) => passwordAccess.find((p) => p.senha_id === senhaId) || null

  const setPasswordPerm = (senhaId: string, perm: keyof Omit<PasswordAccessRow, "senha_id">, value: boolean) => {
    setPasswordAccess((prev) => {
      const existing = prev.find((p) => p.senha_id === senhaId)
      if (existing) {
        const updated: PasswordAccessRow = { ...existing, [perm]: value }
        if (perm === "can_view" && !value) updated.can_edit = false
        if (perm === "can_edit" && value) updated.can_view = true
        return prev.map((p) => (p.senha_id === senhaId ? updated : p))
      }

      const newPerm: PasswordAccessRow = { senha_id: senhaId, can_view: false, can_edit: false, [perm]: value }
      if (perm === "can_edit" && value) newPerm.can_view = true
      return [...prev, newPerm]
    })
  }

  const toggleAllSenhasForCliente = (clienteId: string, enable: boolean) => {
    const senhas = senhasPorCliente[clienteId] || []

    if (enable) {
      setPasswordAccess((prev) => {
        const updated = [...prev]
        senhas.forEach((s) => {
          const idx = updated.findIndex((p) => p.senha_id === s.id)
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], can_view: true, can_edit: true }
          } else {
            updated.push({ senha_id: s.id, can_view: true, can_edit: true })
          }
        })
        return updated
      })
      return
    }

    setPasswordAccess((prev) => prev.filter((p) => !senhas.some((s) => s.id === p.senha_id)))
  }

  const clientesComView = useMemo(() => {
    return clientes.filter((c) => {
      const perm = getClientPerm(c.id)
      return perm?.can_view
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, clientAccess])

  const hasClientes = clientes.length > 0
  const hasEmpresas = empresas.length > 0

  return (
    <Tabs defaultValue="clientes" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="clientes">Clientes</TabsTrigger>
        <TabsTrigger value="empresas">Empresas</TabsTrigger>
        <TabsTrigger value="senhas">Senhas</TabsTrigger>
      </TabsList>

      <TabsContent value="clientes" className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => toggleAllClients(true)} disabled={!hasClientes}>
            <Check className="w-4 h-4 mr-2" /> Marcar Todos
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => toggleAllClients(false)} disabled={!hasClientes}>
            <X className="w-4 h-4 mr-2" /> Desmarcar Todos
          </Button>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {!hasClientes ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente cadastrado.</p>
          ) : (
            clientes.map((cliente) => {
              const perm = getClientPerm(cliente.id)
              return (
                <div key={cliente.id} className="p-3 border border-border rounded-lg">
                  <p className="font-medium mb-3">{cliente.nome_cliente}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {([
                      { key: "can_view", label: "Ver" },
                      { key: "can_edit", label: "Editar" },
                      { key: "can_create", label: "Criar" },
                      { key: "can_delete", label: "Excluir" },
                    ] as const).map((p) => (
                      <div key={p.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`ca-${p.key}-${cliente.id}`}
                          checked={!!perm?.[p.key]}
                          onCheckedChange={(checked) => setClientPerm(cliente.id, p.key, !!checked)}
                        />
                        <Label htmlFor={`ca-${p.key}-${cliente.id}`}>{p.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </TabsContent>

      <TabsContent value="empresas" className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => toggleAllEmpresas(true)} disabled={!hasEmpresas}>
            <Check className="w-4 h-4 mr-2" /> Marcar Todos
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => toggleAllEmpresas(false)} disabled={!hasEmpresas}>
            <X className="w-4 h-4 mr-2" /> Desmarcar Todos
          </Button>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {!hasEmpresas ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma empresa terceira cadastrada.</p>
          ) : (
            empresas.map((empresa) => {
              const perm = getEmpresaPerm(empresa.id)
              return (
                <div key={empresa.id} className="p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{empresa.nome_empresa}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {([
                      { key: "can_view", label: "Ver" },
                      { key: "can_edit", label: "Editar" },
                      { key: "can_create_manutencao", label: "Criar Manutenção" },
                      { key: "can_delete", label: "Excluir" },
                    ] as const).map((p) => (
                      <div key={p.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`ea-${p.key}-${empresa.id}`}
                          checked={!!perm?.[p.key]}
                          onCheckedChange={(checked) => setEmpresaPerm(empresa.id, p.key, !!checked)}
                        />
                        <Label htmlFor={`ea-${p.key}-${empresa.id}`}>{p.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </TabsContent>

      <TabsContent value="senhas" className="space-y-4">
        {clientesComView.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum cliente com acesso de visualização.</p>
            <p className="text-sm text-muted-foreground mt-2">Configure na aba “Clientes” primeiro.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {clientesComView.map((cliente) => {
              const isExpanded = expandedClientes.has(cliente.id)
              const isLoading = loadingClientes.has(cliente.id)
              const senhas = senhasPorCliente[cliente.id] || []

              return (
                <Collapsible key={cliente.id} open={isExpanded} onOpenChange={() => toggleCliente(cliente.id)}>
                  <div className="border border-border rounded-lg">
                    <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Key className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{cliente.nome_cliente}</span>
                      </div>
                      {isExpanded && senhas.length > 0 && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button type="button" variant="outline" size="sm" onClick={() => toggleAllSenhasForCliente(cliente.id, true)}>
                            <Check className="w-3 h-3 mr-1" /> Todas
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => toggleAllSenhasForCliente(cliente.id, false)}>
                            <X className="w-3 h-3 mr-1" /> Nenhuma
                          </Button>
                        </div>
                      )}
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-2 border-t border-border">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                            <span className="ml-2 text-sm text-muted-foreground">Carregando senhas...</span>
                          </div>
                        ) : senhas.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma senha cadastrada para este cliente.</p>
                        ) : (
                          <div className="space-y-3">
                            {senhas.map((senha) => {
                              const perm = getPasswordPerm(senha.id)
                              return (
                                <div key={senha.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                  <div>
                                    <p className="font-medium text-sm">{senha.nome_acesso}</p>
                                    {senha.login && <p className="text-xs text-muted-foreground">Login: {senha.login}</p>}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`pa-view-${senha.id}`}
                                        checked={!!perm?.can_view}
                                        onCheckedChange={(checked) => setPasswordPerm(senha.id, "can_view", !!checked)}
                                      />
                                      <Label htmlFor={`pa-view-${senha.id}`} className="text-xs">
                                        Ver
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`pa-edit-${senha.id}`}
                                        checked={!!perm?.can_edit}
                                        onCheckedChange={(checked) => setPasswordPerm(senha.id, "can_edit", !!checked)}
                                      />
                                      <Label htmlFor={`pa-edit-${senha.id}`} className="text-xs">
                                        Editar
                                      </Label>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
