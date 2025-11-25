# CodexAAC Backend

Backend API developed in Go with MySQL database.

## Technologies

- **Go 1.21+** - Programming language
- **MySQL** - Database
- **Gorilla Mux** - HTTP router
- **JWT** - Authentication tokens

## Prerequisites

- Go 1.21 or higher
- MySQL 5.7+ or 8.0+

## Installation

1. Install Go dependencies:
```bash
go mod download
```

2. Configure environment variables:
```bash
cp env.example .env
# Edit the .env file with your configurations
```

Required environment variables:
- `DATABASE_URL` - MySQL connection string (format: `mysql://user:password@host:port/database`)
- `PORT` - Server port (default: 8080)
- `JWT_SECRET` - Secret key for JWT tokens (required for production)
- `ENV` - Environment (development/production)
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed origins for CORS

Optional environment variables:
- `ACCOUNT_DELETION_GRACE_PERIOD_DAYS` - Grace period in days before account deletion (default: 30)
- `MIN_GUILD_LEVEL` - Minimum player level required to create a guild (default: 8)

## Running

```bash
go run cmd/server/main.go
```

The server will start on port 8080 (or the port specified in `PORT` environment variable).

## API Endpoints

- `GET /api/health` - Health check
- `GET /api` - Welcome message
- `POST /api/login` - User login
- `POST /api/register` - User registration

## Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go          # Application entry point
├── internal/
│   ├── database/            # Database connection
│   └── handlers/            # Request handlers
├── pkg/
│   ├── auth/                # JWT authentication
│   ├── middleware/          # HTTP middlewares
│   └── utils/               # Utilities
└── go.mod                   # Dependencies
```

## License

This project is part of CodexAAC.
