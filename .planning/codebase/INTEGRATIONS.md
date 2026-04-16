# Integrações Externas

**Data da Análise:** 2026-04-14

## APIs e Serviços

**Supabase (Backend-as-a-Service):**
- URL base da API REST: `https://nzzimacvelxzstarwqty.supabase.co`
- Cliente: wrapper customizado baseado em `fetch` (sem SDK do Supabase JS instalado)
- Implementação: `src/mr-3/mr-cobrancas/src/config/supabase.js`
- Endpoints utilizados:
  - `GET/POST/PATCH/DELETE /rest/v1/{tabela}` — CRUD para todas as tabelas de dados
  - `POST /auth/v1/token?grant_type=password` — login com email/senha
  - `POST /auth/v1/logout` — encerrar sessão
- Header de autenticação: `apikey` + `Authorization: Bearer {token}`
- Chave de API: chave publicável armazenada diretamente no código-fonte (não via variável de ambiente)

**ViaCEP (Consulta de CEP Brasileiro):**
- URL: `https://viacep.com.br/ws/{cep}/json/`
- Uso: Preenchimento automático de campos de endereço (logradouro, bairro, cidade, uf) a partir do CEP
- Chamado em: `src/mr-3/mr-cobrancas/src/App.jsx` (formulários de cadastro/edição de devedor)
- Sem chave de API

**BrasilAPI (Consulta de CNPJ):**
- URL: `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`
- Uso: Preenchimento automático de dados da empresa a partir do CNPJ
- Chamado em: `src/mr-3/mr-cobrancas/src/App.jsx` (linhas ~1906 e ~3099)
- Sem chave de API

**WhatsApp (deep-link wa.me):**
- Padrão de URL: `https://wa.me/55{telefone}?text={mensagemCodificada}`
- Uso: Abre conversa no WhatsApp com mensagem pré-preenchida para lembretes de pagamento e agendamentos
- Chamado em: `src/mr-3/mr-cobrancas/src/App.jsx` (múltiplos locais)
- Sem chave de API — abre pelo navegador/app via hyperlink

**Google Fonts:**
- URL: `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap`
- Uso: Tipografia — carregado via tag `<link>` no componente `FontLink` em `src/mr-3/mr-cobrancas/src/App.jsx`

## Banco de Dados

**Provedor:** Supabase (baseado em PostgreSQL)

**Conexão:**
- Chamadas diretas à API REST via `fetch` nativo (sem ORM, sem biblioteca cliente do Supabase)
- Funções auxiliares: `dbGet`, `dbInsert`, `dbUpdate`, `dbDelete` em `src/mr-3/mr-cobrancas/src/config/supabase.js`
- Todas as consultas usam sintaxe de query string PostgREST (ex: `?id=eq.{id}`, `?order=id.asc`)

**Tabelas Conhecidas (a partir de migrações e código-fonte):**
- `devedores` — registros de devedores (CPF/CNPJ, endereço, contato, informações de dívida)
- `credores` — registros de credores (com colunas de endereço/qualificação adicionadas via `migration_credores.sql`)
- `processos` — processos jurídicos (com colunas extras adicionadas via `migration_processos.sql`)
- `usuarios_sistema` — usuários do sistema (email, senha, nome, oab, role)
- `lembretes` — lembretes/tarefas de acompanhamento
- `contatos` — registros de log de contatos

**Migrações:**
- `src/mr-3/mr-cobrancas/migration_credores.sql` — adiciona colunas de endereço e qualificação à tabela `credores`
- `src/mr-3/mr-cobrancas/migration_processos.sql` — adiciona `instancia`, `numero_origem`, datas, `observacoes` à tabela `processos`
- Migrações são executadas manualmente via Editor SQL do Painel do Supabase (sem executor de migrações automático)

**Armazenamento de Arquivos:**
- Nenhuma integração de armazenamento em nuvem detectada
- Arquivos `.docx` são gerados no navegador via `docxtemplater` + `pizzip` e baixados diretamente

## Autenticação

**Provedor:** Supabase Auth + fallbacks legados

**Estratégia (3 camadas com fallback):**
1. **Supabase Auth (primário):** `POST /auth/v1/token?grant_type=password` com email/senha; retorna JWT `access_token` armazenado em memória (variável no nível do módulo)
2. **Fallback de banco legado:** Consulta direta à tabela `usuarios_sistema` comparando email + senha em texto plano (inseguro, para compatibilidade retroativa)
3. **Fallback hardcoded local:** Array `LOCAL_USERS` em memória em `src/mr-3/mr-cobrancas/src/auth/users.js` — fornece acesso offline

**Armazenamento do Token:** Apenas em memória (variável `_accessToken` em `src/mr-3/mr-cobrancas/src/config/supabase.js`) — não persiste em localStorage ou cookies; perdido ao recarregar a página

**Persistência de Sessão:** Nenhuma — o usuário precisa fazer login novamente após recarregar a página

**Roles:** `admin` / `user` (armazenado em `usuarios_sistema.role` ou metadados do usuário no Supabase)

**Arquivos de implementação:**
- `src/mr-3/mr-cobrancas/src/config/supabase.js` — `signIn`, `signOut`, gerenciamento de token
- `src/mr-3/mr-cobrancas/src/auth/users.js` — `authenticateUser`, `fetchSystemUsers`

## Outras Integrações

**Geração de Documentos (no navegador):**
- `docxtemplater` + `pizzip` — gera arquivos `.docx` de petições a partir de templates Word
- Carregado via importação dinâmica para evitar stack overflow do Vite/CJS: `import("docxtemplater")`, `import("pizzip")`
- Implementação: `src/mr-3/mr-cobrancas/src/components/GerarPeticao.jsx`

**Deploy:**
- Plataforma: Vercel
- ID do Projeto: `prj_gWu4sdBW3XIviL6e8m9Kebp47MB3`
- Org: `team_accCdWfVuVMlJ2QwpDZ42MLX`
- Config: `src/mr-3/mr-cobrancas/.vercel/project.json`

**Índices Monetários (dados embutidos):**
- Taxas mensais de IGP-M, IPCA, SELIC e INPC de 2020 até início de 2026 estão hardcoded em `src/mr-3/mr-cobrancas/src/utils/correcao.js`
- Sem API externa para dados de índices — as taxas são mantidas manualmente no código-fonte

**Webhooks:**
- Nenhum detectado (sem endpoints de webhook de entrada, sem registro de webhook)

**Filas / Jobs em Background:**
- Nenhum detectado

**Cache:**
- Nenhum detectado (sem Redis, sem service worker, sem cache em localStorage)

---

*Auditoria de integrações: 2026-04-14*
