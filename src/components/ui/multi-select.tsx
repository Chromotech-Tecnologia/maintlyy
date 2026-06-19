import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  allLabel?: string
  className?: string
  disabled?: boolean
  triggerClassName?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nada encontrado.",
  allLabel,
  className,
  disabled,
  triggerClassName,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v))
    else onChange([...value, v])
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between font-normal",
            !value.length && "text-muted-foreground",
            triggerClassName
          )}
        >
          <div className="flex flex-1 items-center gap-1 overflow-hidden">
            {value.length === 0 ? (
              <span className="truncate">{allLabel || placeholder}</span>
            ) : value.length <= 2 ? (
              selectedLabels.map((l) => (
                <Badge key={l} variant="secondary" className="rounded-sm px-1 font-normal text-[10px]">
                  <span className="truncate max-w-[80px]">{l}</span>
                </Badge>
              ))
            ) : (
              <Badge variant="secondary" className="rounded-sm px-1 font-normal text-[10px]">
                {value.length} selecionados
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {value.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={clearAll}
                className="rounded-sm hover:bg-muted p-0.5 inline-flex"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", className)} align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allLabel && (
                <CommandItem
                  value="__all__"
                  onSelect={() => onChange([])}
                  className="cursor-pointer"
                >
                  <Check className={cn("mr-2 h-4 w-4", value.length === 0 ? "opacity-100" : "opacity-0")} />
                  {allLabel}
                </CommandItem>
              )}
              {options.map((opt) => {
                const checked = value.includes(opt.value)
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => toggle(opt.value)}
                    className="cursor-pointer"
                  >
                    <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                    {opt.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
