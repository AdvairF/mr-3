# Stack Tecnológica

**Data da Análise:** 2026-04-14

## Linguagens e Runtime

**Principal:**
- JavaScript (ES2022+) — todos os arquivos fonte; JSX para componentes React
- SQL — migrações de banco de dados (`migration_credores.sql`, `migration_processos.sql`)

**Runtime:**
- Navegador (SPA client-side, sem servidor Node.js)
- Node.js necessário apenas em tempo de build/desenvolvimento

**Gerenciador de Pacotes:**
- npm
- Lockfile: `package-lock.json` presente tanto na raiz quanto no projeto interno

## Frameworks e Bibliotecas

**Core:**
- React 18.2.0 — framework de UI (`src/mr-3/mr-cobrancas/package.json`)
- React DOM 18.2.0 — renderização DOM

**Build/Dev:**
- Vite 8.0.8 — ferramenta de build e servidor de desenvolvimento (`src/mr-3/mr-cobrancas/vite.config.js`)
- @vitejs/plugin-react 6.0.1 — plugin Vite para React/JSX transform

**Geração de Documentos:**
- docxtemplater 3.68.4 — renderização de templates `.docx` para petições jurídicas
- pizzip 3.2.0 — manipulação de arquivos ZIP/DOCX (dependência do docxtemplater)

## Dependências

**Produção (`src/mr-3/mr-cobrancas/package.json`):**
- `react` ^18.2.0
- `react-dom` ^18.2.0
- `docxtemplater` ^3.68.4
- `pizzip` ^3.2.0

**Dev (`src/mr-3/mr-cobrancas/package.json`):**
- `vite` ^8.0.8
- `@vitejs/plugin-react` ^6.0.1

**`package.json` raiz (legado/wrapper):**
- `react` ^18.2.0
- `react-dom` ^18.2.0
- `react-scripts` 5.0.1 (Create React App — não utilizado pelo projeto interno ativo)

## Configuração

**Build:**
- `src/mr-3/mr-cobrancas/vite.config.js` — config Vite: servidor dev na porta 3000, diretório de saída `build/`
- `src/mr-3/mr-cobrancas/jsconfig.json` — opções do compilador JS: target ESNext, resolução de módulo Bundler, JSX react-jsx, modo strict desativado, allowJs true

**Deploy:**
- `.vercel/project.json` — ID do projeto Vercel `prj_gWu4sdBW3XIviL6e8m9Kebp47MB3`, org `team_accCdWfVuVMlJ2QwpDZ42MLX`, nome do projeto `mr-cobrancas`
- Tanto a raiz quanto `src/mr-3/mr-cobrancas/.vercel/` compartilham a mesma config do Vercel

**Targets de Navegador (package.json raiz):**
- Produção: `>0.2%`, not dead, not op_mini all
- Desenvolvimento: última versão do Chrome

**Variáveis de Ambiente:**
- Nenhum arquivo `.env` detectado no projeto
- URL e chave do Supabase estão hardcoded em `src/mr-3/mr-cobrancas/src/config/supabase.js` (não via variáveis de ambiente)

## Ferramentas de Desenvolvimento

**Build/Servidor de Dev:**
- `vite dev` (porta 3000, abre o navegador automaticamente)
- `vite build` (gera saída em `build/`)
- `vite preview`

**Linting/Formatação:**
- Nenhum arquivo de configuração de ESLint, Prettier ou Biome detectado
- `jsconfig.json` tem `"strict": false` e `"checkJs": false` — nenhuma verificação estática de tipos aplicada

**Testes:**
- Nenhum framework de testes detectado (sem Jest, Vitest ou arquivos de teste)

## Notas sobre a Estrutura do Projeto

O repositório possui uma estrutura aninhada:
- `c:/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/` — shell externo (wrapper CRA legado, não ativo)
- `c:/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/` — a aplicação ativa real

O ponto de entrada da aplicação ativa é `src/mr-3/mr-cobrancas/src/index.jsx`, que monta `App.jsx` no elemento `#root`.

---

*Análise da stack: 2026-04-14*
