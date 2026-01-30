
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

#### 5. ✅ Criação e edição de usuários
- Adicionadas policies RLS para permitir admins criarem e atualizarem user_profiles:
  - `Admins can insert any profile` (INSERT)
  - `Admins can update any profile` (UPDATE)

#### 6. ✅ Formulário de Manutenções - Cliente Primeiro
- Invertida ordem dos campos: Cliente primeiro, Empresa Terceira segundo
- Empresa Terceira é selecionada automaticamente com base no cliente escolhido
- Campo Empresa Terceira fica desabilitado quando cliente selecionado

#### 7. ✅ Permissões de Empresas Terceiras
- Adicionadas colunas `can_edit` e `can_delete` em `user_empresa_permissions`
- Criado componente `EmpresaPermissionsTab` para gerenciar permissões por empresa
- Adicionada nova aba "Empresas" no dialog de permissões
- Usuários com permissão de criar clientes podem ver lista de empresas

#### 8. ✅ Permissões Granulares de Senhas por Cliente
- Criado componente `PasswordPermissionsTab` com interface expandida
- Para cada cliente, lista todas as senhas com checkboxes individuais (Ver, Editar)
- Usa tabela `user_password_permissions` para controle granular
- Interface colapsível por cliente com carregamento sob demanda

---

## Arquivos Modificados

1. **Migração SQL** - Nova coluna `can_view_details` + função `has_system_permission` atualizada
2. **Migração SQL 2** - Policies para admins em user_profiles + colunas em user_empresa_permissions
3. **src/hooks/usePermissions.tsx** - Adicionado `canViewDetailsSystem()`
4. **src/components/layout/AppSidebar.tsx** - Filtro de menus por `canViewSystem`
5. **src/pages/PerfilUsuarios.tsx** - UI de permissões com 4 abas (Clientes, Empresas, Sistema, Senhas)
6. **src/pages/CofreSenhas.tsx** - Fix exibição de senha + botões condicionais
7. **src/pages/Clientes.tsx** - Botões condicionais + dialog de visualização
8. **src/pages/Manutencoes.tsx** - Cliente primeiro + empresa auto-selecionada
9. **src/pages/Empresas.tsx** - Botões condicionais + dialog de visualização
10. **src/pages/Equipes.tsx** - Botões condicionais + dialog de visualização
11. **src/pages/TiposManutencao.tsx** - Botões condicionais + dialog de visualização
12. **src/components/permissions/PasswordPermissionsTab.tsx** - NOVO - Aba de permissões de senhas
13. **src/components/permissions/EmpresaPermissionsTab.tsx** - NOVO - Aba de permissões de empresas

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

## Estrutura de Permissões Atualizada

```
Módulo Sistema (user_system_permissions):
  - Ver Menu, Ver Detalhes, Editar, Criar, Excluir

Clientes (user_client_permissions):
  - Por cliente: Ver, Editar, Criar, Excluir

Empresas Terceiras (user_empresa_permissions):
  - Por empresa: Ver, Editar, Criar Manutenção, Excluir

Senhas (user_password_permissions):
  - Por senha individual: Ver, Editar
  - Agrupadas por cliente na interface
```
