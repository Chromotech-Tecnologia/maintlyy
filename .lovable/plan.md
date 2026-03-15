

## Plano: Substituir trial por plano grátis + limites de senhas

### Contexto
Hoje o sistema usa um período de teste (trial) de 7 dias. O pedido é substituir isso por um **plano grátis mínimo** permanente, com limites rígidos. Quando um limite é atingido, a mensagem varia:
- **Manutenções**: "Aguarde a virada do mês ou contrate um plano"
- **Outros recursos**: "Você precisa contratar um plano"

Também será adicionado o campo `max_senhas` (cofre de senhas) editável nos planos.

### Alterações no Banco de Dados

1. **Migração**: Adicionar coluna `max_senhas integer DEFAULT 0` na tabela `landing_plans` (0 = ilimitado, mesmo padrão dos outros limites)

### Alterações no Super Admin (PlansManager.tsx)

2. Adicionar campo "Máx. senhas" no grid de inputs do formulário de plano, ao lado dos outros limites

### Alterações no Signup (useAuth.tsx)

3. Trocar a lógica de criação de perfil no cadastro:
   - Em vez de `account_status: 'trial'`, usar `account_status: 'active'`
   - Buscar o plano grátis (plano com `offer_free_signup = true` ou `categoria = 'gratis'`) e atribuir o `plan_id` automaticamente
   - Remover `trial_days` e `trial_start`

### Alterações no usePlanLimits (usePlanLimits.tsx)

4. Expandir o hook para incluir:
   - `maxEmpresas`, `currentEmpresas`, `canCreateEmpresa`
   - `maxManutencoes`, `currentManutencoesMes`, `canCreateManutencao`
   - `maxSenhas`, `currentSenhas`, `canCreateSenha`
   - Buscar `max_manutencoes, max_empresas, max_senhas` do plano
   - Contar manutenções do mês atual para o limite mensal
   - Remover lógica de "trial sem plano" (agora todo usuário terá plano)

### Alterações nas Páginas de Ação

5. **Manutencoes.tsx**: Antes de abrir o dialog de criar, checar `canCreateManutencao`. Se não pode, mostrar toast: "Limite de manutenções do mês atingido. Aguarde a virada do mês ou contrate um plano."

6. **Empresas.tsx**: Checar `canCreateEmpresa`. Toast: "Limite de empresas atingido. Contrate um plano para cadastrar mais."

7. **CofreSenhas.tsx**: Checar `canCreateSenha`. Toast: "Limite de senhas atingido. Contrate um plano para cadastrar mais."

8. **Equipes.tsx**: Já tem limite. Ajustar mensagem para: "Limite de equipes atingido. Contrate um plano para criar mais."

9. **PerfilUsuarios.tsx**: Já tem limite. Ajustar mensagem para: "Contrate um plano para adicionar mais usuários."

### Remoção/Ajuste do Trial

10. **ProtectedRoute.tsx**: Remover lógica de `trial` e `expired` (não existem mais). Manter `disabled` e `cancelled`.

11. **TrialBanner.tsx**: Remover ou transformar em banner de "plano grátis" mostrando limites (ou simplesmente remover, pois não há mais trial).

12. **LandingPage.tsx**: Remover referências a "7 dias grátis" / "trial". Atualizar CTA para "Comece agora — é grátis".

13. **Assinaturas.tsx**: Remover seção de "Período de Teste" do card de plano atual.

### Resumo das Mensagens por Recurso

```text
Recurso         | Mensagem ao atingir limite
----------------|-----------------------------------------------
Manutenções     | "Aguarde a virada do mês ou contrate um plano"
Empresas        | "Contrate um plano para cadastrar mais"
Senhas          | "Contrate um plano para cadastrar mais"
Equipes         | "Contrate um plano para criar mais"
Usuários        | "Contrate um plano para adicionar mais"
```

