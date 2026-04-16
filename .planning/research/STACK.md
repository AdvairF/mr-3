# Stack — Pesquisa de Tecnologias

**Data:** 2026-04-14
**Contexto:** Milestone subsequente — adicionar Kanban, Timeline, Alertas, Templates editáveis e IA ao sistema existente (React 18 + Vite + Supabase).

---

## Kanban de Cobranças

**Recomendado: `@dnd-kit/core` + `@dnd-kit/sortable`**
- Versão: ^6.x (atual ~6.1.0)
- Razão: Mais moderno, acessível, sem dependência do react-beautiful-dnd (descontinuado). Funciona bem com React 18 strict mode. Bundle menor (~15KB gzip vs ~25KB do rbd).
- **NÃO usar:** `react-beautiful-dnd` — em modo de manutenção, com problemas no React 18 strict mode.
- **Alternativa:** `react-kanban` (wrapper simples, menos flexível para customizações complexas)

**Persistência no Supabase:**
- Coluna `posicao` (integer) por card para ordenação dentro da coluna
- Coluna `status_kanban` (text enum) para qual coluna o card está
- Atualização otimista no drag-end, sync com Supabase em background

---

## Timeline / Feed de Atividades

**Recomendado: Implementação própria simples**
- Tabela `eventos_cobranca` no Supabase com: `id`, `devedor_id`, `tipo_evento`, `descricao`, `metadata` (json), `created_at`
- Componente React de timeline com CSS puro (lista ordenada por data)
- **NÃO usar** bibliotecas de timeline pesadas (react-chrono, vis-timeline) — overhead desnecessário para um feed simples
- Supabase Realtime para updates em tempo real (channel por devedor_id)

---

## Alertas / Notificações

**Abordagem recomendada: Polling + Browser Notifications API**
- Polling client-side a cada 5 minutos (verificar prazos próximos)
- `Notification API` do browser para notificações nativas (requer permissão do usuário)
- Fallback: badge/indicador visual no header da aplicação
- **Para lembretes críticos (prazo judicial):** Supabase Edge Function + cron (pg_cron) que marca itens como urgentes
- **NÃO usar** Supabase Realtime para alertas — custo alto, complexidade de reconexão

**Schema:**
```sql
CREATE TABLE alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devedor_id uuid REFERENCES devedores(id),
  tipo text, -- 'parcela_vencendo', 'prazo_judicial', 'sem_contato'
  data_alerta timestamptz,
  lido boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

---

## Templates de Petição Editáveis

**Recomendado: Editor de texto rico com variáveis — `TipTap` (headless) ou abordagem simples com textarea + preview**

**Opção A (simples, recomendada para v1):**
- Textarea com sintaxe de variáveis `{{nome_devedor}}`, `{{valor_divida}}`
- Preview em tempo real mostrando o resultado com dados do devedor
- Templates salvos como texto no Supabase (`tabela templates_peticao`)
- Geração final via docxtemplater (mantém fluxo atual)

**Opção B (rica):**
- `@tiptap/react` ^2.x com extensões de variáveis customizadas
- Mais complexo, melhor experiência de edição
- Recomendado para v2

**Schema:**
```sql
CREATE TABLE templates_peticao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text, -- 'monitoria', 'execucao', 'cobranca', etc.
  conteudo text, -- texto com variáveis {{placeholder}}
  variaveis jsonb, -- lista de variáveis usadas
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

---

## Geração com IA (Arquitetura Agnóstica)

**Recomendação: Interface de provider no Supabase Edge Function**
- Edge Function `gerar-peticao-ia` recebe: tipo, dados do devedor/credor/processo
- Internamente chama o provider escolhido (Anthropic, OpenAI, etc.)
- Retorna texto gerado
- Benefício: chave de API nunca exposta no frontend

**Por que Edge Function e não client-side:**
- Chaves de API de IA NUNCA devem ficar no frontend
- Permite trocar de provider sem alterar o React
- Supabase Edge Functions são gratuitas até 2M invocações/mês

**Interface do provider (pseudocódigo):**
```js
// supabase/functions/gerar-peticao/index.ts
const provider = Deno.env.get('AI_PROVIDER') // 'anthropic' | 'openai'
```

---

## Credenciais (Correção Urgente)

**Problema atual:** Supabase URL e chave hardcoded no source code.

**Solução imediata:**
```js
// vite.config.js — variáveis de ambiente Vite
// .env (não commitado)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_KEY=sb_publishable_xxx

// config/supabase.js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY
```

---

## Confiança nas Recomendações

| Tecnologia | Confiança | Notas |
|------------|-----------|-------|
| @dnd-kit para Kanban | Alta | Padrão de mercado 2024-2025 |
| TipTap para editor | Média | Avaliar complexidade no contexto do projeto |
| Supabase Edge Functions para IA | Alta | Melhor prática para não expor chaves |
| Polling + Notifications API para alertas | Alta | Simples e confiável para SPA sem backend |
| Timeline com tabela própria | Alta | Padrão de event sourcing simplificado |

---
*Pesquisa: 2026-04-14*
