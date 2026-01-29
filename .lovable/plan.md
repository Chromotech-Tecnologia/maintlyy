
# Plano: Sistema de Permissões Granulares com Visibilidade de Menu e Botões

## ✅ CONCLUÍDO

### Problemas Identificados e Corrigidos

#### 1. ✅ Senhas exibidas incorretamente
- Corrigido em `CofreSenhas.tsx` - Agora usa `getDecryptedPassword(senha.id)` ao exibir senha visível

#### 2. ✅ Permissões não refletem nos menus
- Atualizado `AppSidebar.tsx` - Agora filtra itens do menu usando `canViewSystem` baseado no mapeamento resource_type

#### 3. ✅ Botões de ação não respeitam permissões
- Adicionado botão "Ver" (ícone Eye) em todas as páginas
- Botões Editar/Criar/Excluir agora respeitam permissões `canEditSystem`, `canCreateSystem`, `canDeleteSystem`

#### 4. ✅ Estrutura de permissões expandida
Nova coluna `can_view_details` adicionada à tabela `user_system_permissions`:
- `can_view` = **Ver Menu** (controla visibilidade no sidebar)
- `can_view_details` = **Ver Detalhes** (permite abrir e visualizar registros)
- `can_edit` = **Editar**
- `can_create` = **Criar**
- `can_delete` = **Excluir**

---

## Arquivos Modificados

1. **Migração SQL** - Nova coluna `can_view_details` + função `has_system_permission` atualizada
2. **src/hooks/usePermissions.tsx** - Adicionado `canViewDetailsSystem()`
3. **src/components/layout/AppSidebar.tsx** - Filtro de menus por `canViewSystem`
4. **src/pages/PerfilUsuarios.tsx** - UI de permissões com 5 checkboxes (Ver Menu, Ver Detalhes, Editar, Criar, Excluir)
5. **src/pages/CofreSenhas.tsx** - Fix exibição de senha + botões condicionais
6. **src/pages/Clientes.tsx** - Botões condicionais + dialog de visualização
7. **src/pages/Manutencoes.tsx** - Botões condicionais + dialog de visualização
8. **src/pages/Empresas.tsx** - Botões condicionais + dialog de visualização
9. **src/pages/Equipes.tsx** - Botões condicionais + dialog de visualização
10. **src/pages/TiposManutencao.tsx** - Botões condicionais + dialog de visualização

---

## Fluxo de Permissões Implementado

```
1. Usuário sem "Ver Menu" -> Menu NÃO aparece
2. Usuário com "Ver Menu" apenas -> Menu aparece, vê lista, não pode abrir/editar
3. Usuário com "Ver Detalhes" -> Pode abrir e ver detalhes (botão Ver)
4. Usuário com "Editar" -> Botão Editar aparece
5. Usuário com "Criar" -> Botão Criar/Novo aparece  
6. Usuário com "Excluir" -> Botão Excluir aparece
```

## Mapeamento Resource x Menu

| Menu                  | resource_type       |
|-----------------------|---------------------|
| Dashboard             | dashboard           |
| Manutenções           | manutencoes         |
| Clientes              | clientes            |
| Empresas Terceiras    | empresas_terceiras  |
| Equipes               | equipes             |
| Tipos de Manutenção   | tipos_manutencao    |
| Cofre de Senhas       | cofre_senhas        |
| Perfis de Usuários    | perfis_usuarios     |
| Permissões            | permissoes          |
