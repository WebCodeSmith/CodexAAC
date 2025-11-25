# CodexAAC - Site de Gerenciamento de Servidor Tibia

Site completo para gerenciamento de servidor Tibia desenvolvido com Go (backend) e Next.js (frontend).

## 📋 Requisitos

Antes de começar, certifique-se de ter instalado:

- **Go 1.24+** - [Download](https://go.dev/dl/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **pnpm** - Gerenciador de pacotes Node.js
- **MySQL 5.7+ ou 8.0+** - Banco de dados
- **Git** - Controle de versão

## 🚀 Instalação

### 1. Instalar Go 1.24+

#### Windows:

1. Baixe o instalador do Go em: https://go.dev/dl/
2. Execute o instalador e siga as instruções
3. Verifique a instalação abrindo o PowerShell ou CMD e executando:
```bash
go version
```
Deve mostrar algo como: `go version go1.24.0 windows/amd64`

### 2. Instalar Node.js

#### Windows:

1. Baixe o instalador LTS do Node.js em: https://nodejs.org/
2. Execute o instalador e siga as instruções
3. Verifique a instalação:
```bash
node --version
npm --version
```

### 3. Instalar pnpm

Com o Node.js instalado, instale o pnpm globalmente:

```bash
npm install -g pnpm
```

Verifique a instalação:
```bash
pnpm --version
```

### 4. Clonar o Repositório

```bash
git clone <url-do-repositorio>
cd CodexAAC
```

### 5. Configurar o Banco de Dados MySQL

1. Crie um banco de dados MySQL:
```sql
CREATE DATABASE codexaac CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Importe o schema do banco de dados (se houver arquivo SQL):
```bash
mysql -u root -p codexaac < database.sql
```

### 6. Configurar Variáveis de Ambiente

#### Backend

Crie um arquivo `.env` na pasta `backend/`:

```env
# Banco de Dados
DATABASE_URL=mysql://usuario:senha@localhost:3306/codexaac

# JWT (IMPORTANTE: Use uma chave segura em produção!)
JWT_SECRET=sua-chave-secreta-super-segura-aqui

# CORS (origens permitidas, separadas por vírgula)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Caminho para o servidor Tibia (opcional)
# SERVER_PATH=C:/caminho/para/seu/servidor/tibia

# Configurações Opcionais
ACCOUNT_DELETION_GRACE_PERIOD_DAYS=30
MIN_GUILD_LEVEL=8
```

**⚠️ IMPORTANTE:** 
- Substitua `usuario` e `senha` pelas credenciais do seu MySQL
- Gere uma chave JWT segura para produção (pode usar: `openssl rand -base64 32`)
- O `SERVER_PATH` é opcional e deve apontar para a pasta raiz do seu servidor Tibia (onde está o `config.lua`)

#### Frontend

Crie um arquivo `.env.local` na pasta `frontend/` (se necessário):

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 7. Instalar Dependências

#### Backend (Go)

```bash
cd backend
go mod download
```

#### Frontend (Node.js com pnpm)

```bash
cd frontend
pnpm install
```

## 🏃 Como Executar

### Desenvolvimento

#### Terminal 1 - Backend

```bash
cd backend
go run cmd/server/main.go
```

O servidor backend estará rodando em: `http://localhost:8080`

#### Terminal 2 - Frontend

```bash
cd frontend
pnpm dev
```

O frontend estará rodando em: `http://localhost:3000`

### Produção

#### Build do Frontend

```bash
cd frontend
pnpm build
pnpm start
```

#### Build do Backend

```bash
cd backend
go build -o server.exe cmd/server/main.go
./server.exe
```

## 📁 Estrutura do Projeto

```
CodexAAC/
├── backend/                 # API Backend (Go)
│   ├── cmd/
│   │   └── server/
│   │       └── main.go      # Ponto de entrada do servidor
│   ├── internal/
│   │   ├── database/        # Conexão com banco de dados
│   │   ├── handlers/        # Handlers HTTP
│   │   └── jobs/            # Jobs em background
│   ├── pkg/
│   │   ├── auth/            # Autenticação JWT
│   │   ├── config/          # Configurações do servidor
│   │   ├── middleware/      # Middlewares HTTP
│   │   ├── twofactor/       # Autenticação 2FA
│   │   └── utils/           # Utilitários
│   ├── go.mod               # Dependências Go
│   └── .env                 # Variáveis de ambiente
│
├── frontend/                # Aplicação Web (Next.js)
│   ├── app/                 # Next.js App Router
│   │   ├── components/      # Componentes React
│   │   ├── services/        # Serviços API
│   │   └── ...
│   ├── package.json         # Dependências Node.js
│   └── .env.local           # Variáveis de ambiente
│
└── README.md                # Este arquivo
```

## 🔧 Tecnologias Utilizadas

### Backend
- **Go 1.24+** - Linguagem de programação
- **Gorilla Mux** - Roteador HTTP
- **MySQL** - Banco de dados
- **JWT** - Autenticação por tokens
- **TOTP** - Autenticação de dois fatores

### Frontend
- **Next.js 16** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework CSS
- **React 19** - Biblioteca UI

## 📡 Endpoints da API

### Autenticação
- `POST /api/login` - Login de usuário
- `POST /api/register` - Registro de usuário
- `POST /api/logout` - Logout
- `POST /login.php` - Login do cliente Tibia
- `POST /login` - Login do cliente Tibia (alternativo)

### Conta
- `GET /api/account` - Detalhes da conta (autenticado)
- `POST /api/account/delete` - Solicitar exclusão de conta
- `POST /api/account/cancel-deletion` - Cancelar exclusão
- `GET /api/account/settings` - Configurações da conta
- `POST /api/account/settings` - Atualizar configurações

### Personagens
- `GET /api/characters` - Listar personagens
- `POST /api/characters` - Criar personagem
- `GET /api/characters/{name}` - Detalhes do personagem

### Guildas
- `GET /api/guilds` - Listar guildas
- `GET /api/guilds/{name}` - Detalhes da guilda
- `POST /api/guilds` - Criar guilda
- `POST /api/guilds/{name}/invite` - Convidar jogador
- `POST /api/guilds/{name}/accept-invite` - Aceitar convite
- `POST /api/guilds/{name}/leave` - Sair da guilda
- `POST /api/guilds/{name}/kick` - Expulsar jogador

### Admin
- `GET /api/admin/stats` - Estatísticas do servidor
- `GET /api/admin/accounts` - Listar contas
- `GET /api/admin/maintenance` - Status de manutenção
- `POST /api/admin/maintenance` - Ativar/desativar manutenção

### Sistema
- `GET /api/health` - Health check
- `GET /api` - Mensagem de boas-vindas

## 🛠️ Comandos Úteis

### Backend
```bash
# Instalar dependências
go mod download

# Executar servidor
go run cmd/server/main.go

# Build para produção
go build -o server.exe cmd/server/main.go

# Executar testes (se houver)
go test ./...
```

### Frontend
```bash
# Instalar dependências
pnpm install

# Modo desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Executar produção
pnpm start

# Linter
pnpm lint
```

## 🔒 Segurança

- **JWT_SECRET**: Use uma chave forte e única em produção
- **DATABASE_URL**: Não compartilhe credenciais do banco de dados
- **CORS**: Configure apenas origens confiáveis em produção
- **HTTPS**: Use HTTPS em produção

## 🐛 Solução de Problemas

### Erro de conexão com banco de dados
- Verifique se o MySQL está rodando
- Confirme as credenciais no arquivo `.env`
- Verifique se o banco de dados foi criado

### Erro "JWT_SECRET not configured"
- Adicione `JWT_SECRET` no arquivo `.env` do backend
- Reinicie o servidor após adicionar

### Erro ao instalar dependências do frontend
- Certifique-se de ter o Node.js 18+ instalado
- Tente limpar o cache: `pnpm store prune`
- Delete `node_modules` e `pnpm-lock.yaml` e reinstale

### Porta já em uso
- Altere a porta no arquivo `.env` (backend) ou `package.json` (frontend)
- Ou encerre o processo que está usando a porta

## 📝 Licença

Este projeto faz parte do CodexAAC.

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte, abra uma issue no repositório do projeto.

---

**Desenvolvido com ❤️ para a comunidade Tibia**

