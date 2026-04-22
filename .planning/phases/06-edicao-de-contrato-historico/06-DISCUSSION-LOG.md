# Phase 6: Edição de Contrato + Histórico - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 06-edicao-de-contrato-historico
**Areas discussed:** Modo de edição (UX), Histórico: estilo visual, Contratos sem histórico, Cascade: confirmação antes

---

## Modo de edição (UX)

| Option | Description | Selected |
|--------|-------------|----------|
| Botão "Editar Contrato" no header | Botão explícito — header troca para modo edição (campos viram inputs). Salvar/Cancelar aparecem no lugar do botão. | ✓ |
| Ícone de lápis ao lado de cada campo | Cada campo com '✏' individual. Edição inline por campo. | |
| Seção "Editar Contrato" expansível | Card colapsável separado abaixo do header. Header permanece read-only. | |

**User's choice:** Botão "Editar Contrato" no header (Recomendado)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Um form unificado | Header + encargos no mesmo modo edição. Um único Salvar. | ✓ |
| Dois forms separados | Botão 'Editar dados' e outro 'Editar encargos'. | |

**User's choice:** Um form unificado (Recomendado)

---

## Histórico: estilo visual

| Option | Description | Selected |
|--------|-------------|----------|
| Timeline vertical com linha e ícones | Linha vertical à esquerda, ponto/ícone por evento, data + descrição dos campos alterados ao lado. | ✓ |
| Lista de cards compactos | Card cinza claro por evento: data + tipo + campos alterados. Sem linha. | |
| Tabela (data, tipo, campos, usuário) | Tabela com colunas fixas. Mais denso. | |

**User's choice:** Timeline vertical com linha e ícones (Recomendado)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Par antes → depois por campo | Ex: Credor: Banco A → Banco B. Cada campo alterado em uma linha. | ✓ |
| Só listar nomes dos campos alterados | Ex: 'Campos alterados: credor, devedor'. Sem mostrar os valores. | |

**User's choice:** Par antes → depois por campo (Recomendado)

---

## Contratos sem histórico

| Option | Description | Selected |
|--------|-------------|----------|
| Mostrar "Sem histórico disponível" | Seção colapsável vazia com mensagem neutra. Honesto e sem trabalho extra. | ✓ |
| Seed automático: evento genérico 'importado' | Criar automaticamente evento tipo 'criação' retroativo com dados atuais. | |
| Não mostrar a seção Histórico para contratos sem eventos | Condicional: se não houver eventos, seção não aparece. | |

**User's choice:** Mostrar "Sem histórico disponível" (Recomendado)

---

## Cascade: confirmação antes

| Option | Description | Selected |
|--------|-------------|----------|
| Sim — window.confirm() antes do cascade | Padrão já usado no sistema para ações destrutivas. | ✓ |
| Não — aplicar direto com toast de sucesso | Sem dialog. Salvar no form já é confirmação implícita. | |

**User's choice:** Sim — window.confirm() antes do cascade (Recomendado)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Botão Salvar fica loading até completar | Botão desabilitado com spinner. Toast de sucesso ao final. | ✓ |
| Progress bar ou contador de parcelas | Ex: 'Atualizando 12/15 parcelas...'. | |

**User's choice:** Botão Salvar fica loading até completar (Recomendado)

---

## Claude's Discretion

- Layout exato do header card em modo edição
- Ícone visual do evento criacao vs edicao na timeline
- Exibir ou não usuario_id resolvido como nome na timeline
- Truncamento de valores longos no par antes→depois

## Deferred Ideas

- Edição de Documento após criação — milestone futuro
- Exclusão de Contrato — milestone futuro
- Filtro de histórico por tipo_evento — v1.4+
- Mostrar nome do usuário na timeline — Claude decide por ora
