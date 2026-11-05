# Portal de Eventos das Fatecs — Frontend

Interface web da plataforma centralizada de divulgação e gerenciamento de eventos acadêmicos das Faculdades de Tecnologia do Centro Paula Souza (CEETEPS), tendo a **Fatec Shunji Nishimura (Pompeia)** como unidade piloto.

---

## Tecnologias Utilizadas

- **React 19** (`^19.0.0`) + **TypeScript** (`~5.7.2`)
- **Vite 6** (`^6.2.0`) — bundler e servidor de desenvolvimento
- **Tailwind CSS v4** (`^4.0.9`) — estilização utilitária responsiva e acessível
- **React Router v7** (`^7.2.0`) — roteamento SPA com rotas públicas e protegidas
- **Fetch API nativa** — cliente HTTP centralizado sem dependências externas extras

---

## Funcionalidades Implementadas

### Área Pública (Visitantes, Alunos e Comunidade)
- **Agenda Pública de Eventos (`/`)**:
  - Carrega os eventos de `GET /events` e realiza a busca e filtragem localmente na interface.
  - Cálculo automático de status temporal no fuso `America/Sao_Paulo` (**Agendado**, **Em andamento** e **Encerrado**).
  - Busca textual local por título, endereço/localização ou nome da instituição.
  - Filtros combináveis por **Unidade/Instituição** (derivado das instituições presentes nos eventos carregados), **Período** (*Todos*, *Hoje*, *Próximos 7 dias*, *Este mês*) e **Status temporal**.
  - Sincronização dos filtros na URL (`?q=...&institution=...&period=...&status=...`) permitindo compartilhamento de links e preservação do estado ao navegar.
- **Detalhes do Evento (`/eventos/:id`)**:
  - Exibição completa de datas de início e término, endereço, descrição, instituição organizadora e lista de **salas/auditórios** vinculados ao evento.
  - Navegação contextual de retorno para a listagem pública, página da instituição ou painel administrativo (`/admin`), conforme a origem do acesso.
- **Página Pública da Instituição (`/instituicoes/:id`)**:
  - Dados institucionais da unidade Fatec e listagem de todos os eventos publicados por ela.

### Área Institucional e Administrativa (Unidades Fatec e Admin Geral)
- **Autenticação Institucional (`/login`)**:
  - Login via JWT (`POST /login`), validação de expiração do token e tratamento diferenciado entre credenciais inválidas e sessão expirada.
- **Painel da Unidade (`/admin`)**:
  - Resumo de indicadores (KPIs) da unidade: Total de eventos, Agendados, Em andamento e Encerrados.
  - Listagem e gerenciamento dos eventos pertencentes à instituição autenticada (onde ficam as ações de editar, excluir e gerenciar salas).
  - Exclusão de eventos com modal de confirmação acessível (`ConfirmDeleteModal`).
  - Gerenciamento de **Salas do Evento** (`RoomManagerModal`): listagem, adição, renomeação e remoção de salas/auditórios.
- **Cadastro e Edição de Eventos (`/admin/eventos/novo` e `/admin/eventos/:id/editar`)**:
  - Validação por campo com foco automático no primeiro erro e contadores de caracteres alinhados aos limites do banco.
  - Alerta informativo (não-bloqueante) caso já exista outro evento da mesma instituição cadastrado no mesmo intervalo de horário.
  - Aviso de alterações não salvas ao fechar/recarregar a aba (`beforeunload`) e ao clicar nos links de voltar/cancelar do próprio formulário (navegações externas pelo menu superior ou botões de histórico do navegador não são bloqueadas).
- **Administração de Instituições (`/admin/instituicoes`)** *(exclusivo para perfil Administrador Geral)*:
  - Cadastro de novas unidades/instituições com definição de perfil (Unidade padrão ou Administrador Geral).
  - Consulta rápida de instituição por código identificador (`ID`).

---

## Particularidades Técnicas e Limitações Atuais

### Interpretação de Datas e Fuso Horário (`dateUtils.ts`)
- O backend Go atual recebe strings SQL (`YYYY-MM-DD HH:mm:ss`) sem fuso na gravação e devolve timestamps rotulados com sufixo nominal `Z` (`YYYY-MM-DDTHH:mm:ssZ`) sem ter convertido o horário local ao gravar no MariaDB.
- Para evitar deslocamento de 3 horas na exibição e na edição, `src/utils/dateUtils.ts` (`normalizeApiDateString`) adapta tanto strings SQL sem offset quanto strings com `Z` nominal vindas da API atual para o fuso oficial do piloto (`America/Sao_Paulo`, `-03:00`), preservando strings que já tragam offset explícito. Caso o contrato de fuso do backend seja alterado no futuro, essa função deve ser revisada em conjunto.

### Limitações Atuais (Dependentes de Evolução da API)
- **Permissões de eventos para Administrador Geral**: na API atual, apenas a instituição proprietária do evento (`IsEventOwner`) pode editar, excluir ou gerenciar salas de um evento. Portanto, mesmo contas com perfil Administrador Geral gerenciam apenas os eventos da própria unidade em `/admin`.
- **Filtro de instituições na Agenda Pública**: como não há endpoint de listagem geral de todas as instituições, o seletor de unidades na `HomePage` lista apenas as instituições que possuem eventos publicados no retorno de `GET /events`.
- **Funcionalidades fora do contrato atual da API**: cancelamento/reativação de eventos, histórico de remarcações, filtro estruturado por cidade/regional e campo de categoria do evento dependem de evolução no banco de dados e no backend Go, não estando presentes nesta versão.

---

## Estrutura de Pastas

```text
frontend/
├── .env.example                 # Exemplo de variáveis de ambiente
├── index.html                   # Entrada HTML (pt-BR)
├── package.json                 # Dependências e scripts npm
├── tsconfig.json                # Configurações TypeScript
├── vite.config.ts               # Configuração do Vite + Tailwind CSS v4
└── src/
    ├── App.tsx                  # Definição de rotas públicas e protegidas
    ├── main.tsx                 # Ponto de entrada da aplicação React
    ├── index.css                # Importação do Tailwind CSS
    ├── components/
    │   ├── events/              # EventCard, EventFilters, RoomManagerModal, TemporalBadge
    │   ├── layout/              # Navbar, Footer, ProtectedRoute
    │   └── ui/                  # ConfirmDeleteModal, FeedbackStates (Loading, Empty, Error)
    ├── contexts/
    │   └── AuthContext.tsx      # Contexto de sessão JWT e perfil da instituição
    ├── hooks/
    │   └── useNowMs.ts          # Atualização periódica de timestamp para status em tempo real
    ├── pages/
    │   ├── admin/               # LoginPage, AdminDashboard, EventFormPage, InstitutionsAdminPage
    │   └── public/              # HomePage, EventDetailsPage, InstitutionPage
    ├── services/
    │   ├── api.ts               # Cliente HTTP Fetch centralizado e tratamento de erros
    │   ├── authService.ts       # Serviço de login
    │   ├── eventService.ts      # Serviços de eventos e salas
    │   └── institutionService.ts# Serviços de instituições
    ├── types/
    │   └── api.ts               # Contratos de resposta da API, payloads e ViewModels
    └── utils/
        └── dateUtils.ts         # Normalização de datas (America/Sao_Paulo) e filtros de período
```

---

## Pré-requisitos e Configuração Local

1. **Node.js** (versão 20+ recomendada) e **npm**.
2. **Backend da API em Go** rodando localmente (por padrão em `http://localhost:3000`).

### 1. Configurar variáveis de ambiente

Dentro da pasta `frontend/`, copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Conteúdo padrão do `.env`:

```env
VITE_API_URL=http://localhost:3000
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Executar em modo de desenvolvimento

```bash
npm run dev
```

A aplicação ficará disponível em **http://localhost:5173**.

---

## Scripts Disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento do Vite em `http://localhost:5173` |
| `npm run typecheck` | Executa a verificação estática de tipos do TypeScript (`tsc -b --noEmit`) |
| `npm run build` | Compila e gera o bundle otimizado de produção na pasta `dist/` |
| `npm run preview` | Serve localmente o build gerado em `dist/` para validação |

### Nota para Publicação (Deploy SPA)
Como o roteamento utiliza `BrowserRouter` do React Router, o servidor de hospedagem (Nginx, Vercel, Netlify, Apache, etc.) deve estar configurado com fallback para encaminhar todas as rotas da aplicação para `index.html`, permitindo abrir diretamente endereços profundos como `/eventos/1` ou `/admin`.

---

## Integração com a API (Backend Go)

Endpoints da API Go integrados nos serviços de `src/services/`:

- `POST /login` — Autenticação institucional (retorna JWT + dados da instituição)
- `GET /events` — Listagem pública de eventos (utilizada na `HomePage` com filtragem local)
- `GET /event/{event_id}` — Detalhes de um evento e suas salas
- `GET /event/search/{event}` — Busca de eventos por nome *(mapeada em `eventService.ts`, porém a `HomePage` atual filtra localmente os dados de `GET /events`)*
- `GET /event/institution/{institution_id}` — Eventos de uma instituição específica
- `GET /institution/{institution_id}` — Dados públicos de uma instituição
- `POST /institution` — Cadastro de nova instituição *(requer JWT Admin)*
- `POST /event` | `PUT /event/{event_id}` | `DELETE /event/{event_id}` — Criação, edição e exclusão de eventos *(requer JWT da instituição proprietária)*
- `GET /event/{event_id}/room` | `POST /event/{event_id}/room` | `PUT /event/{event_id}/room` | `DELETE /event/{event_id}/room` — Gestão de salas vinculadas ao evento *(requer JWT da instituição proprietária)*
