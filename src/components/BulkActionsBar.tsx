import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, CheckSquare, X } from "lucide-react"

interface BulkActionsBarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkDelete: () => void
  onBulkStatusChange?: (status: string) => void
  statusOptions?: { value: string; label: string }[]
  canDelete?: boolean
  canEdit?: boolean
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkStatusChange,
  statusOptions,
  canDelete = true,
  canEdit = true,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap p-3 bg-primary/5 border border-primary/20 rounded-xl animate-fade-in">
      <span className="text-sm font-medium text-primary">
        {selectedCount} de {totalCount} selecionado(s)
      </span>
      
      <div className="flex items-center gap-2 ml-auto flex-wrap">
        {selectedCount < totalCount && (
          <Button variant="outline" size="sm" onClick={onSelectAll} className="h-8 rounded-lg text-xs">
            <CheckSquare className="h-3.5 w-3.5 mr-1" />
            Selecionar todos
          </Button>
        )}

        {canEdit && statusOptions && onBulkStatusChange && (
          <Select onValueChange={onBulkStatusChange}>
            <SelectTrigger className="h-8 w-[160px] rounded-lg text-xs">
              <SelectValue placeholder="Alterar status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {canDelete && (
          <Button variant="destructive" size="sm" onClick={onBulkDelete} className="h-8 rounded-lg text-xs">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Excluir ({selectedCount})
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8 w-8 p-0 rounded-lg">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
