# Estrutura de Diretórios

**Data da Análise:** 2026-04-14

## Layout Raiz

```
mr-cobrancas/                    # Raiz do projeto externo (shell legado react-scripts)
├── package.json                 # Config CRA legada — react-scripts, não usada em dev/build
├── public/                      # Assets estáticos para o shell legado (não usado no build ativo)
├── src/
│   ├── index.html               # Entrada HTML CRA legada (não usada)
│   └── mr-3/
│       └── mr-cobrancas/        # PROJETO ATIVO — todo desenvolvimento acontece aqui
├── node_modules/                # Dependências do projeto externo (legado)
└── .planning/codebase/          # Documentação de arquitetura GSD
```

**Importante:** O código-fonte implantável e ativo está no **projeto aninhado** em `src/mr-3/mr-cobrancas/`. O projeto externo é um wrapper legado. Todo desenvolvimento, builds e deploys usam o projeto interno.

## Layout do Projeto Ativo

```
src/mr-3/mr-cobrancas/           # Projeto Vite + React ativo
├── index.html                   # Ponto de entrada HTML do Vite
├── vite.config.js               # Config do Vite (porta 3000, outDir: build)
├── package.json                 # Dependências ativas: React 18, docxtemplater, pizzip, vite
├── jsconfig.json                # Config de caminhos JS
├── migration_credores.sql       # Migração de schema Supabase para tabela credores
├── migration_processos.sql      # Migração de schema Supabase para tabela processos
├── build/                       # Saída compilada (commitada, usada para deploy)
│   ├── index.html
│   └── assets/
│       ├── index-BeW_5ov1.js    # Bundle principal
│       ├── chunk-B3K2TuZy.js    # Chunk dividido
│       ├── docxtemplater-*.js   # Bundle do docxtemplater
│       └── js-BtsK1W8Z.js
├── public/
│   └── index.html               # HTML público (fallback)
└── src/
    ├── index.jsx                # Bootstrap React — createRoot → <App>
    ├── App.jsx                  # Componente raiz + TODOS os módulos de página (6.699 linhas)
    ├── auth/
    │   └── users.js             # authenticateUser(), fetchSystemUsers()
    ├── config/
    │   └── supabase.js          # Cliente Supabase, sb(), dbGet/Insert/Update/Delete, signIn/Out
    ├── utils/
    │   ├── constants.js         # Enums de domínio, templates de formulário vazios
    │   ├── correcao.js          # Motor de correção monetária + tabelas de índices reais
    │   ├── formatters.js        # fmt(), fmtDate(), phoneFmt()
    │   └── masks.js             # maskCPF(), maskCNPJ(), maskTel(), maskCEP()
    └── components/
        ├── GerarPeticao.jsx     # Módulo de geração de documentos (docxtemplater)
        └── ui/
            ├── index.js         # Re-exportação barrel de todos os primitivos de UI
            ├── Modal.jsx        # Modal com blur de fundo
            ├── Btn.jsx          # Primitivo de botão
            ├── Inp.jsx          # Primitivo de input + objeto de config INP
            ├── Badge.jsx        # BadgeDev, BadgeProc — badges de status
            └── Icons.jsx        # Biblioteca de ícones SVG (objeto I) + FontLink
```

## Diretórios-Chave

**`src/mr-3/mr-cobrancas/src/`** — Todo o código-fonte da aplicação.

**`src/mr-3/mr-cobrancas/src/config/`:**
- Arquivo único: `supabase.js`
- Toda comunicação com Supabase: wrapper REST fetch, auth, helpers CRUD
- Não adicionar configurações não relacionadas aqui — é exclusivamente o módulo de acesso a dados

**`src/mr-3/mr-cobrancas/src/auth/`:**
- Arquivo único: `users.js`
- Somente lógica de autenticação: validação de credenciais, busca de perfil, fallback local

**`src/mr-3/mr-cobrancas/src/utils/`:**
- Funções puras sem efeitos colaterais e sem dependências do React
- `constants.js` — todas as constantes de domínio e objetos de formulário vazios
- `correcao.js` — tabelas de índices monetários e cálculos de correção
- `formatters.js` — formatação de exibição (BRL, datas, telefone)
- `masks.js` — máscaras de input de teclado

**`src/mr-3/mr-cobrancas/src/components/ui/`:**
- Somente primitivos de apresentação reutilizáveis
- Importe todos via barrel: `import { Modal, Btn, Inp, BadgeDev } from "./components/ui/index.js"`

**`src/mr-3/mr-cobrancas/src/components/`:**
- Componentes de funcionalidade grandes demais para embutir em `App.jsx`
- Atualmente apenas `GerarPeticao.jsx` foi extraído

**`src/mr-3/mr-cobrancas/build/`:**
- Saída do build de produção, commitada no repositório
- Usada diretamente para deploy no Vercel (deploy estático)

## Convenções de Nomenclatura

**Arquivos:**
- Componentes React: PascalCase `.jsx` — `Modal.jsx`, `GerarPeticao.jsx`, `Badge.jsx`
- Módulos utilitários/config: camelCase `.js` — `supabase.js`, `formatters.js`, `constants.js`, `correcao.js`
- Arquivos de exportação barrel: `index.js`
- Arquivos de backup: `App.13-04-backup.js`, `App.before-recovery.js` (informal, com data)

**Diretórios:**
- Todos minúsculos, uma palavra: `auth/`, `config/`, `utils/`, `components/`, `ui/`

**Funções e Variáveis:**
- Componentes React: PascalCase (`Dashboard`, `Login`, `Devedores`)
- Funções utilitárias: camelCase (`calcularFatorCorrecao`, `authenticateUser`, `maskCPF`)
- Constantes/enums: SCREAMING_SNAKE_CASE (`STATUS_DEV`, `PROC_TIPOS`, `FORM_DEV_VAZIO`)
- Helpers do Supabase: aliases curtos em camelCase (`sb`, `dbGet`, `dbInsert`, `dbUpdate`, `dbDelete`)
- Objeto de ícones: chave de letra única `I` com chaves curtas em notação de ponto (`I.dash`, `I.dev`, `I.calc`)

**Tabelas do Banco (Supabase):**
- snake_case plural: `devedores`, `credores`, `processos`, `andamentos`, `lembretes`, `regua_cobranca`, `usuarios_sistema`

## Arquivos-Chave

**Bootstrap:**
- `src/mr-3/mr-cobrancas/index.html` — shell HTML, monta `#root`
- `src/mr-3/mr-cobrancas/src/index.jsx` — criação da raiz React

**Aplicação Principal:**
- `src/mr-3/mr-cobrancas/src/App.jsx` — 6.699 linhas. Contém todos os módulos de página inline. A única fonte de verdade para todas as telas de domínio. Extremamente grande — todos os componentes de página (`Dashboard`, `Devedores`, `Credores`, `Processos`, `Calculadora`, `Lembretes`, `Relatorios`, `Regua`, `GestaoUsuarios`) são definidos aqui como funções de nível superior junto com `export default function App()`.

**Acesso a Dados:**
- `src/mr-3/mr-cobrancas/src/config/supabase.js` — cliente REST Supabase, auth, wrappers CRUD

**Lógica de Domínio:**
- `src/mr-3/mr-cobrancas/src/utils/correcao.js` — tabelas e fórmulas de correção monetária (maior utilitário)
- `src/mr-3/mr-cobrancas/src/utils/constants.js` — todas as enumerações de domínio e templates de objetos vazios

**Geração de Documentos:**
- `src/mr-3/mr-cobrancas/src/components/GerarPeticao.jsx` — gerador de petições DOCX (importação dinâmica do docxtemplater)

**Schema:**
- `src/mr-3/mr-cobrancas/migration_credores.sql` — DDL da tabela credores no Supabase
- `src/mr-3/mr-cobrancas/migration_processos.sql` — DDL da tabela processos no Supabase

**Config de Build:**
- `src/mr-3/mr-cobrancas/vite.config.js` — config do Vite (porta 3000 em dev, saída de build em `build/`)

## Onde Adicionar Novo Código

**Novo módulo de página (nova tab/tela):**
1. Defina a função do componente em `src/mr-3/mr-cobrancas/src/App.jsx` próximo a telas relacionadas, OU
2. Extraia para `src/mr-3/mr-cobrancas/src/components/NovaFuncionalidade.jsx` e importe em `App.jsx`
3. Adicione entrada ao array `NAV` (linha ~6433) com `id`, `label`, `icon`, `color`, `bg`
4. Adicione `case "nova_tab": return <NovaFuncionalidade ...>` ao switch `renderPage()` (linha ~6445)
5. Passe os dados necessários como props do estado do `App` (`devedores`, `credores`, etc.)

**Novas constantes de domínio ou templates de formulário:**
- Adicione em `src/mr-3/mr-cobrancas/src/utils/constants.js`

**Novo cálculo monetário/financeiro:**
- Adicione em `src/mr-3/mr-cobrancas/src/utils/correcao.js`

**Novo utilitário de formatação ou máscara:**
- `src/mr-3/mr-cobrancas/src/utils/formatters.js` para formatação de exibição
- `src/mr-3/mr-cobrancas/src/utils/masks.js` para máscaras de input

**Novo primitivo de UI reutilizável:**
- Crie `src/mr-3/mr-cobrancas/src/components/ui/NomeDoComponente.jsx`
- Exporte de `src/mr-3/mr-cobrancas/src/components/ui/index.js`

**Nova interação com tabela Supabase:**
- Use os existentes `dbGet/dbInsert/dbUpdate/dbDelete` de `src/mr-3/mr-cobrancas/src/config/supabase.js`
- Adicione arquivo SQL de schema em `src/mr-3/mr-cobrancas/migration_<nometabela>.sql`

**Novo gatilho de navegação entre módulos:**
- Despache `window.dispatchEvent(new CustomEvent("mr_goto", { detail: "id_da_tab" }))` — sem necessidade de alterar props

## Diretórios Especiais

**`build/`:**
- Propósito: Saída do build de produção do Vite
- Gerado: Sim (`vite build`)
- Commitado: Sim (usado para deploy estático no Vercel)

**`.planning/codebase/`:**
- Propósito: Documentação de arquitetura GSD
- Gerado: Pelas ferramentas GSD
- Commitado: Sim

**`.vercel/`** (em `src/mr-3/mr-cobrancas/.vercel/`):
- Propósito: Metadados de vinculação do projeto Vercel
- Gerado: Pelo CLI do Vercel
- Commitado: Contém `project.json` (IDs do projeto/org)
