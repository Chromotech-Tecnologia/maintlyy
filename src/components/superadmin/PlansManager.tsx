import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Star, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"

interface Plan {
  id: string
  nome: string
  tipo: string
  categoria: string
  preco: string | null
  max_usuarios: number
  max_equipes: number
  max_manutencoes: number
  max_empresas: number
  descricao: string | null
  recursos: string[]
  offer_free_signup: boolean
  whatsapp_numero: string | null
  whatsapp_mensagem: string | null
  texto_botao: string
  destaque: boolean
  ordem: number
  ativo: boolean
}

const emptyPlan: Omit<Plan, "id"> = {
  nome: "",
  tipo: "individual",
  categoria: "gratis",
  preco: "",
  max_usuarios: 1,
  max_equipes: 0,
  max_manutencoes: 0,
  max_empresas: 0,
  descricao: "",
  recursos: [],
  offer_free_signup: false,
  whatsapp_numero: "",
  whatsapp_mensagem: "",
  texto_botao: "Começar Grátis",
  destaque: false,
  ordem: 0,
  ativo: true,
}

export function PlansManager() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [form, setForm] = useState(emptyPlan)
  const [recursosText, setRecursosText] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; nome: string }>({ open: false, id: "", nome: "" })

  useEffect(() => { fetchPlans() }, [])

  const fetchPlans = async () => {
    setLoading(true)
    // Super admin can see all plans via the policy
    const { data, error } = await supabase
      .from("landing_plans")
      .select("*")
      .order("ordem")
    if (error) { toast.error("Erro ao carregar planos"); console.error(error) }
    else setPlans((data || []).map((p: any) => ({ ...p, recursos: Array.isArray(p.recursos) ? p.recursos : [] })))
    setLoading(false)
  }

  const openCreate = () => {
    setEditingPlan(null)
    setForm(emptyPlan)
    setRecursosText("")
    setDialogOpen(true)
  }

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setForm({ ...plan })
    setRecursosText(plan.recursos.join("\n"))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return }
    setSaving(true)
    const recursos = recursosText.split("\n").map(r => r.trim()).filter(Boolean)
    const payload = {
      nome: form.nome,
      tipo: form.tipo,
      categoria: form.categoria,
      preco: form.preco || null,
      max_usuarios: form.max_usuarios,
      max_equipes: form.max_equipes,
      max_manutencoes: form.max_manutencoes,
      max_empresas: form.max_empresas,
      descricao: form.descricao || null,
      recursos,
      whatsapp_numero: form.whatsapp_numero || null,
      whatsapp_mensagem: form.whatsapp_mensagem || null,
      texto_botao: form.texto_botao || "Começar Grátis",
      destaque: form.destaque,
      ordem: form.ordem,
      ativo: form.ativo,
      offer_free_signup: form.offer_free_signup,
    }

    let error
    if (editingPlan) {
      ({ error } = await supabase.from("landing_plans").update(payload).eq("id", editingPlan.id))
    } else {
      ({ error } = await supabase.from("landing_plans").insert(payload))
    }

    if (error) { toast.error("Erro ao salvar plano"); console.error(error) }
    else {
      toast.success(editingPlan ? "Plano atualizado!" : "Plano criado!")
      setDialogOpen(false)
      fetchPlans()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    const { error } = await supabase.from("landing_plans").delete().eq("id", deleteDialog.id)
    if (error) toast.error("Erro ao excluir plano")
    else { toast.success("Plano excluído!"); fetchPlans() }
    setDeleteDialog({ open: false, id: "", nome: "" })
  }

  const toggleAtivo = async (plan: Plan) => {
    const { error } = await supabase.from("landing_plans").update({ ativo: !plan.ativo }).eq("id", plan.id)
    if (error) toast.error("Erro ao atualizar")
    else fetchPlans()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-semibold">Planos da Landing Page</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Novo Plano
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhum plano cadastrado.</div>
      ) : (
        <div className="grid gap-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={`glass-card ${!plan.ativo ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{plan.nome}</span>
                      {plan.destaque && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]"><Star className="h-3 w-3 mr-0.5" />Destaque</Badge>}
                      <Badge variant="secondary" className="text-[10px]">{plan.tipo}</Badge>
                      <Badge variant={plan.categoria === "gratis" ? "outline" : "default"} className="text-[10px]">
                        {plan.categoria === "gratis" ? "Grátis" : "Pago"}
                      </Badge>
                      {!plan.ativo && <Badge variant="destructive" className="text-[10px]">Inativo</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {plan.preco || "Gratuito"} · {plan.recursos.length} recursos · Botão: "{plan.texto_botao}"
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleAtivo(plan)}>
                      {plan.ativo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteDialog({ open: true, id: plan.id, nome: plan.nome })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            <DialogDescription>Preencha os dados do plano que será exibido na landing page.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Individual" />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input type="number" value={form.ordem} onChange={(e) => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="equipe">Equipe</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gratis">Grátis</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Preço (ex: R$ 49,90/mês)</Label>
                <Input value={form.preco || ""} onChange={(e) => setForm(f => ({ ...f, preco: e.target.value }))} placeholder="R$ 49,90/mês" />
              </div>
              <div>
                <Label>Máx. usuários</Label>
                <Input type="number" value={form.max_usuarios} onChange={(e) => setForm(f => ({ ...f, max_usuarios: parseInt(e.target.value) || 1 }))} min={1} />
              </div>
              <div>
                <Label>Máx. equipes</Label>
                <Input type="number" value={form.max_equipes} onChange={(e) => setForm(f => ({ ...f, max_equipes: parseInt(e.target.value) || 0 }))} min={0} placeholder="0 = ilimitado" />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.descricao || ""} onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ideal para profissionais autônomos" />
            </div>
            <div>
              <Label>Recursos (um por linha)</Label>
              <Textarea value={recursosText} onChange={(e) => setRecursosText(e.target.value)} rows={5} placeholder={"Até 50 manutenções\nCofre de senhas\nRelatórios básicos"} />
            </div>
            <div>
              <Label>Texto do botão</Label>
              <Input value={form.texto_botao} onChange={(e) => setForm(f => ({ ...f, texto_botao: e.target.value }))} placeholder="Começar Grátis" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>WhatsApp (número)</Label>
                <Input value={form.whatsapp_numero || ""} onChange={(e) => setForm(f => ({ ...f, whatsapp_numero: e.target.value }))} placeholder="5511999999999" />
              </div>
            </div>
            <div>
              <Label>Mensagem WhatsApp</Label>
              <Textarea value={form.whatsapp_mensagem || ""} onChange={(e) => setForm(f => ({ ...f, whatsapp_mensagem: e.target.value }))} rows={2} placeholder="Olá! Tenho interesse no plano..." />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.destaque} onCheckedChange={(v) => setForm(f => ({ ...f, destaque: v }))} />
                <Label>Destaque</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm(f => ({ ...f, ativo: v }))} />
                <Label>Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingPlan ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(d => ({ ...d, open }))}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano "{deleteDialog.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
