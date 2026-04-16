# Arquitetura

**Data da Análise:** 2026-04-14

## Padrão

Aplicação de página única (SPA) monolítica. Toda a lógica da aplicação — autenticação, todas as telas de domínio, regras de negócio, acesso a dados e componentes de UI — vive em um único projeto React. Nenhuma biblioteca de roteamento é utilizada; a navegação é controlada por uma string de estado `tab` no componente raiz `App`. O módulo ativo é alternado via um switch `renderPage(tab)`.

O código-fonte canônico e ativamente desenvolvido é o **projeto aninhado** em `src/mr-3/mr-cobrancas/`, construído com Vite + React 18. O projeto externo na raiz do repositório (`package.json` usando `react-scripts`) é um shell legado que não é o build implantado.

## Camadas

**Apresentação (Componentes de UI):**
- Propósito: Blocos de construção de UI primitivos e reutilizáveis
- Localização: `src/mr-3/mr-cobrancas/src/components/ui/`
- Contém: `Modal.jsx`, `Btn.jsx`, `Inp.jsx`, `Badge.jsx`, `Icons.jsx`
- Exportação barrel: `src/mr-3/mr-cobrancas/src/components/ui/index.js`
- Depende de: nada interno
- Usado por: `App.jsx` e componentes de funcionalidade

**Componentes de Funcionalidade:**
- Propósito: Telas de domínio específico renderizadas pelo switch de roteamento
- Localização: `src/mr-3/mr-cobrancas/src/components/` e inline em `App.jsx`
- Contém: `GerarPeticao.jsx` (geração de documentos), `Dashboard`, `Devedores`, `Credores`, `Processos`, `Calculadora`, `Lembretes`, `Relatorios`, `Regua`, `GestaoUsuarios` — todos definidos como funções nomeadas em `App.jsx`
- Depende de: componentes de UI, utils, config do supabase
- Usado por: `App` raiz via `renderPage(tab)`

**Lógica de Negócio / Utilitários de Domínio:**
- Propósito: Computação pura — correção monetária, formatação, máscaras, constantes
- Localização: `src/mr-3/mr-cobrancas/src/utils/`
- Contém:
  - `correcao.js` — cálculos de correção monetária usando tabelas de índices reais IGPM/IPCA/SELIC/INPC (2020–2026)
  - `formatters.js` — formatador de moeda BRL, formatador de data, formatador de telefone
  - `masks.js` — máscaras de input para CPF, CNPJ, telefone, CEP
  - `constants.js` — todos os enums de domínio (STATUS_DEV, UFS, PROC_TIPOS, TIPOS_LEM, etc.) e templates de formulário vazios (FORM_DEV_VAZIO, DIVIDA_VAZIA, FORM_PROC_VAZIO)
- Depende de: nada interno
- Usado por: `App.jsx`, `GerarPeticao.jsx`

**Camada de Acesso a Dados:**
- Propósito: Toda comunicação com a API REST do Supabase, gerenciamento de token de autenticação
- Localização: `src/mr-3/mr-cobrancas/src/config/supabase.js`
- Contém: `sb()` wrapper genérico de fetch, helpers CRUD `dbGet/dbInsert/dbUpdate/dbDelete`, `signIn/signOut`, `setAuthToken/getAuthToken`
- Depende de: apenas a API `fetch` do navegador
- Usado por: `App.jsx`, `auth/users.js`, `GerarPeticao.jsx`

**Autenticação:**
- Propósito: Login de usuário com estratégia de fallback em três camadas
- Localização: `src/mr-3/mr-cobrancas/src/auth/users.js`
- Contém: `authenticateUser()`, `fetchSystemUsers()`
- Estratégia de auth: (1) JWT do Supabase Auth → (2) consulta direta à tabela `usuarios_sistema` → (3) array `LOCAL_USERS` hardcoded para fallback offline
- Depende de: `config/supabase.js`
- Usado por: componente Login em `App.jsx`

## Fluxo de Dados

**Fluxo de Autenticação:**
1. `App` verifica `sessionStorage("mr_user")` na montagem e restaura JWT via `setAuthToken()`
2. Se não há usuário, renderiza `<Login>` que chama `authenticateUser(email, senha)`
3. Em caso de sucesso, objeto de usuário (com `_token`) armazenado em `sessionStorage` e no estado do `App`
4. `setAuthToken(token)` é chamado para que todas as chamadas `sb()` subsequentes incluam o header JWT Bearer

**Fluxo de Carregamento de Dados:**
1. Após o login, `App.useEffect` chama `carregarTudo()` que dispara 6 chamadas `dbGet()` em paralelo (devedores, credores, processos, andamentos, regua_cobranca, lembretes)
2. Resultados são armazenados em arrays `useState` de nível superior: `devedores`, `credores`, `processos`, `andamentos`, `regua`, `lembretesList`
3. Campos JSON (`dividas`, `contatos`, `acordos`, `parcelas`) armazenados como strings serializadas no Supabase são parseados inline antes de serem armazenados no estado
4. Um intervalo de polling de 60 segundos atualiza silenciosamente todos os dados quando nenhum modal está aberto

**Fluxo de Navegação:**
1. `App` mantém string de estado `tab` (padrão `"dashboard"`)
2. Botões de navegação na sidebar chamam `setTab(id)` diretamente
3. Navegação entre módulos usa um evento DOM customizado: `window.dispatchEvent(new CustomEvent("mr_goto", { detail: "nomedatab" }))` ou `{ detail: { tab, filtroStatus } }`
4. `App` escuta `mr_goto` e chama `setTab()`, então despacha evento `mr_filtro` para estado de filtro

**Fluxo de Escrita:**
1. Componentes de funcionalidade chamam `dbInsert/dbUpdate/dbDelete` diretamente de `config/supabase.js`
2. Em caso de sucesso, componentes atualizam o estado local via `setDevedores` / `setCredores` / `setProcessos` etc. passados como props
3. Algumas mutações chamam o setter do pai diretamente (ex: `onAtualizarDevedor`) para UI otimista

**Fluxo de Geração de Documentos:**
1. `GerarPeticao.jsx` importa `docxtemplater` e `pizzip` dinamicamente em runtime (evita stack overflow CJS do Vite)
2. Constrói um mapa de placeholders a partir dos dados de devedor/credor/dívida
3. Carrega um template `.docx`, substitui os placeholders, aciona download no navegador

## Pontos de Entrada

**Shell HTML:**
- `src/mr-3/mr-cobrancas/index.html` — entrada HTML do Vite, monta div `#root`, carrega `/src/index.jsx`

**Bootstrap JS:**
- `src/mr-3/mr-cobrancas/src/index.jsx` — cria raiz React, renderiza `<App>` em `StrictMode`

**Componente Raiz:**
- `src/mr-3/mr-cobrancas/src/App.jsx` — 6.699 linhas. Contém: `export default function App()`, todos os componentes de página (`Dashboard`, `Devedores`, `Credores`, `Processos`, `Calculadora`, `Lembretes`, `Relatorios`, `Regua`, `GestaoUsuarios`, `Login`), todos os sub-componentes (`AbaAcordos`, `AbaRelatorio`, `FormNovoAcordo`, `ModalPagamento`, `Calculadora`, etc.), estilos CSS inline e definições de ícones SVG

**Tabs de Navegação (cases do switch renderPage):**
- `"dashboard"` → `<Dashboard>`
- `"devedores"` → `<Devedores>`
- `"credores"` → `<Credores>`
- `"calculadora"` → `<Calculadora>`
- `"relatorios"` → `<Relatorios>`
- `"lembretes"` → `<Lembretes>`
- `"regua"` → `<Regua>`
- `"peticao"` → `<GerarPeticao>`
- `"usuarios"` → `<GestaoUsuarios>` (somente admin)

## Principais Abstrações

**`sb(path, method, body, extra)`** — `src/mr-3/mr-cobrancas/src/config/supabase.js`
O wrapper HTTP único para o Supabase. Todas as operações de banco de dados passam por esta função. Usa a variável `_accessToken` no nível do módulo para JWT. Retorna JSON parseado ou lança erro estruturado.

**`dbGet/dbInsert/dbUpdate/dbDelete`** — `src/mr-3/mr-cobrancas/src/config/supabase.js`
Aliases convenientes sobre `sb()`. `dbUpdate` usa o padrão de filtro `?id=eq.{id}` para seleção de linha.

**`authenticateUser(email, senha)`** — `src/mr-3/mr-cobrancas/src/auth/users.js`
Auth em três camadas com degradação graciosa: JWT do Supabase → consulta na tabela → fallback hardcoded local.

**`carregarTudo(silencioso)`** — dentro de `App.jsx` (linha ~6367)
Carregador de dados em paralelo. Chamado no login e a cada 60 segundos. Trata deserialização JSON de campos aninhados.

**`calcularFatorCorrecao / calcularJurosAcumulados`** — `src/mr-3/mr-cobrancas/src/utils/correcao.js`
Motor de correção monetária usando tabelas de índices reais publicados (IGPM, IPCA, SELIC, INPC) de 2020 a 2026. Usado tanto por `App.jsx` quanto por `GerarPeticao.jsx`.

**`mr_goto` CustomEvent** — usado por todo `App.jsx`
Barramento de navegação entre componentes. Qualquer componente pode navegar para uma tab despachando `new CustomEvent("mr_goto", { detail: "nomeDaTab" })`. Evita prop-drilling de `setTab` para componentes profundamente aninhados.

**Estado inline para campos JSON** — padrão em `App.jsx`
Os campos `dividas`, `acordos`, `contatos`, `parcelas` nos devedores são armazenados como strings JSON no Supabase, mas deserializados para arrays no carregamento. Mutações re-serializam via `JSON.stringify()` antes do `dbUpdate`.

**`verificarAtrasados(parcelas)`** — inline em `App.jsx` (linha ~478)
Atualiza status de parcelas vencidas para `"atrasado"` no carregamento de dados. Aplicado ao array de parcelas de cada acordo durante `carregarTudo`.
