
# Plano: Sistema de Permissoes Granulares com Visibilidade de Menu e Botoes

## Problemas Identificados

### 1. Senhas exibidas incorretamente
No arquivo `CofreSenhas.tsx`, linha 1132, ao mostrar a senha na tela, usa `senha.senha` que esta **encriptada**:
```tsx
{visiblePasswords.has(senha.id) ? senha.senha : "••••••••"}
```
Deveria usar a senha **descriptografada** via `getDecryptedPassword(senha.id)`.

### 2. Permissoes nao refletem nos menus
- A sidebar (`AppSidebar.tsx`) nao esta usando as permissoes de sistema (`canViewSystem`) para filtrar os itens do menu principal
- A logica atual retorna `true` para todos os itens, ignorando as permissoes configuradas

### 3. Botoes de acao nao respeitam permissoes
- Os botoes Editar, Excluir e Criar aparecem mesmo quando o usuario nao tem permissao
- Falta um botao "Ver" para visualizar sem editar
- As paginas Manutencoes, Equipes, TiposManutencao e Empresas nao verificam permissoes para exibir/esconder botoes

### 4. Estrutura de permissoes precisa ser expandida
O sistema atual tem apenas "Ver" que precisa ser dividido em:
- **Ver Menu**: Controla se o item aparece no menu lateral
- **Ver Detalhes**: Permite abrir e visualizar registros (sem editar)
- **Editar**: Permite modificar registros
- **Criar**: Permite criar novos registros  
- **Excluir**: Permite deletar registros

---

## Solucao Proposta

### Parte 1: Banco de Dados
Adicionar nova coluna `can_view_details` na tabela `user_system_permissions`:
- `can_view` = Ver Menu (controla visibilidade no sidebar)
- `can_view_details` = Ver Detalhes (pode abrir registros)
- `can_edit` = Editar
- `can_create` = Criar
- `can_delete` = Excluir

### Parte 2: Hook de Permissoes
Atualizar `usePermissions.tsx`:
- Adicionar funcao `canViewDetailsSystem(resource)`
- Expor todas as funcoes de permissao

### Parte 3: Sidebar (Controle de Menu)
Atualizar `AppSidebar.tsx`:
- Usar `canViewSystem` para cada item de menu
- Mapear cada titulo para seu resource_type correspondente

### Parte 4: Corrigir Exibicao de Senha
Em `CofreSenhas.tsx`:
- Usar `getDecryptedPassword()` ao exibir senha visivel

### Parte 5: Adicionar Botao "Ver" e Controlar Botoes
Atualizar todas as paginas para:
- Adicionar botao "Ver" (icone Eye) que abre modal somente leitura
- Esconder botao "Editar" se `!canEditSystem(resource)`
- Esconder botao "Criar" se `!canCreateSystem(resource)`
- Esconder botao "Excluir" se `!canDeleteSystem(resource)`
- O botao "Ver" aparece se `canViewDetailsSystem(resource)` ou se so tem permissao de ver

Paginas afetadas:
- `Clientes.tsx`
- `Manutencoes.tsx`
- `Empresas.tsx`
- `Equipes.tsx`
- `TiposManutencao.tsx`
- `CofreSenhas.tsx`

### Parte 6: Interface de Permissoes
Atualizar `PerfilUsuarios.tsx`:
- Renomear label "Ver" para "Ver Menu"
- Adicionar checkbox "Ver Detalhes"
- Atualizar handlers para incluir nova permissao

---

## Detalhes Tecnicos

### Migracao SQL
```sql
ALTER TABLE public.user_system_permissions 
ADD COLUMN IF NOT EXISTS can_view_details boolean DEFAULT false;
```

### Mapeamento Resource x Menu
```text
| Menu                  | resource_type       |
|-----------------------|---------------------|
| Dashboard             | dashboard           |
| Manutencoes           | manutencoes         |
| Clientes              | clientes            |
| Empresas Terceiras    | empresas_terceiras  |
| Equipes               | equipes             |
| Tipos de Manutencao   | tipos_manutencao    |
| Cofre de Senhas       | cofre_senhas        |
| Perfis de Usuarios    | perfis_usuarios     |
| Permissoes            | permissoes          |
```

### Fluxo de Permissoes
```text
1. Usuario sem "Ver Menu" -> Menu NAO aparece
2. Usuario com "Ver Menu" apenas -> Menu aparece, ve lista, nao pode abrir/editar
3. Usuario com "Ver Detalhes" -> Pode abrir e ver detalhes (botao Ver)
4. Usuario com "Editar" -> Botao Editar aparece
5. Usuario com "Criar" -> Botao Criar/Novo aparece  
6. Usuario com "Excluir" -> Botao Excluir aparece
```

---

## Arquivos a Modificar

1. **Migracao SQL** - Nova coluna `can_view_details`
2. **src/integrations/supabase/types.ts** - Atualizar tipos
3. **src/hooks/usePermissions.tsx** - Adicionar `canViewDetailsSystem`
4. **src/components/layout/AppSidebar.tsx** - Filtrar menus por permissao
5. **src/pages/PerfilUsuarios.tsx** - UI de permissoes com novo campo
6. **src/pages/CofreSenhas.tsx** - Fix senha + botoes + dialog ver
7. **src/pages/Clientes.tsx** - Botoes condicionais + ver
8. **src/pages/Manutencoes.tsx** - Botoes condicionais + ver
9. **src/pages/Empresas.tsx** - Botoes condicionais + ver
10. **src/pages/Equipes.tsx** - Botoes condicionais + ver
11. **src/pages/TiposManutencao.tsx** - Botoes condicionais + ver

---

## Resultado Esperado

- Senhas exibidas corretamente ao clicar no icone de olho
- Menus aparecem/desaparecem baseado na permissao "Ver Menu"
- Botao "Ver" permite visualizar sem editar
- Botoes Editar/Criar/Excluir respeitam permissoes
- Interface de permissoes mostra 5 opcoes: Ver Menu, Ver Detalhes, Editar, Criar, Excluir
