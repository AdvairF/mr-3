# Convenções de Código

## Estilo de Código
- JavaScript (sem TypeScript) — `strict: false` no `jsconfig.json`
- Sem Prettier configurado, sem ESLint customizado — usa os padrões do Vite/CRA
- Objetos `style` inline para toda estilização — sem CSS modules, sem classes utilitárias (Tailwind, etc.)
- React 18 com Vite como ferramenta de build

## Convenções de Nomenclatura
- **Componentes:** PascalCase em arquivos `.jsx` (ex: `ComponentName.jsx`)
- **Utilitários/Helpers:** camelCase em arquivos `.js`
- **Constantes:** SCREAMING_SNAKE_CASE
- **Variáveis de estado:** abreviações curtas em camelCase (ex: `setErr`, `setVal`)

## Padrões Utilizados
- Componentes funcionais exclusivamente (sem componentes de classe)
- Objetos de estilo inline para toda a estilização de UI
- Estrutura monolítica — lógica principal concentrada em `src/mr-3/mr-cobrancas/src/App.jsx` (mais de 6400 linhas)
- Separadores ASCII decorativos nos comentários usados como divisores de seção
- Mistura de português e inglês em comentários e nomes de variáveis

## Tratamento de Erros
- Estratégias mistas: engolir silenciosamente, `console.error` e estado local (`setErr`)
- Sem camada centralizada de tratamento de erros ou error boundary
- Sem padrão padronizado no código

## Comentários e Documentação
- Comentários usam separadores ASCII decorativos para dividir seções visualmente
- Mistura de português e inglês nos comentários
- Sem anotações JSDoc
- Sem padrão formal de documentação aplicado
