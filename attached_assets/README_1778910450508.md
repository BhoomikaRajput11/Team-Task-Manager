# Team Task Manager

A full-stack team task management application built with React, Express, and PostgreSQL. It supports role-based access control, project management, task assignment, and team collaboration.

---

## Features

- **Authentication** — JWT-based signup and login with secure password hashing (bcrypt)
- **Role-Based Access Control** — Two roles: `admin` and `member`
  - Admins can create/edit/delete projects, tasks, and manage team members
  - Members can view their assigned tasks and update task status
- **Project Management** — Create projects, track status (active / on hold / completed), and monitor progress
- **Task Management** — Create tasks with priority levels, due dates, and assignment to team members
- **Team Management** — Add/remove members from projects
- **Dashboard** — Overview of projects and task completion stats
- **Overdue Detection** — Tasks past their due date are automatically flagged

---

## Tech Stack

### Frontend
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — build tool and dev server
- [Tailwind CSS](https://tailwindcss.com/) — styling
- [Radix UI](https://www.radix-ui.com/) — accessible UI primitives
- [TanStack Query](https://tanstack.com/query) — server state management
- [Wouter](https://github.com/molefrog/wouter) — client-side routing
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) — form validation

### Backend
- [Express 5](https://expressjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- [Drizzle ORM](https://orm.drizzle.team/) — type-safe database queries
- [PostgreSQL](https://www.postgresql.org/) — database
- [JWT](https://jwt.io/) — authentication tokens
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — password hashing
- [Pino](https://getpino.io/) — structured logging

### Monorepo
- [pnpm workspaces](https://pnpm.io/workspaces) — package management
- Shared packages: `@workspace/db`, `@workspace/api-zod`, `@workspace/api-client-react`

---

## Project Structure

```
├── artifacts/
│   ├── api-server/          # Express REST API
│   └── team-task-manager/   # React frontend
├── lib/
│   ├── api-client-react/    # React Query hooks for API calls
│   ├── api-spec/            # API type definitions
│   ├── api-zod/             # Zod validation schemas
│   └── db/                  # Drizzle ORM schema and client
├── scripts/                 # Seed and utility scripts
├── .env                     # Environment variables
└── pnpm-workspace.yaml
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) v8+
- [PostgreSQL](https://www.postgresql.org/) v14+

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/team-task-manager.git
cd team-task-manager
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Copy the example env file and update the values:

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/teamtaskmanager
JWT_SECRET=your-secret-key-here
PORT=8080
NODE_ENV=development
```

### 4. Create the database

```bash
psql -U postgres -c "CREATE DATABASE teamtaskmanager;"
```

### 5. Push the database schema

```bash
pnpm --filter @workspace/db run push
```

### 6. Start the API server

```bash
pnpm --filter @workspace/api-server run dev
```

The API will be available at `http://localhost:8080`.

### 7. Start the frontend

```bash
pnpm --filter @workspace/team-task-manager run dev
```

The app will be available at `http://localhost:5173`.

---

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/signup` | Register a new user | Public |
| POST | `/api/auth/login` | Login and receive JWT | Public |
| GET | `/api/auth/me` | Get current user info | Required |
| GET | `/api/users` | List all users | Admin |

### Projects
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/projects` | List projects | Required |
| POST | `/api/projects` | Create a project | Admin |
| GET | `/api/projects/:id` | Get project details | Required |
| PUT | `/api/projects/:id` | Update a project | Admin |
| DELETE | `/api/projects/:id` | Delete a project | Admin |
| POST | `/api/projects/:id/members` | Add a member | Admin |
| DELETE | `/api/projects/:id/members/:userId` | Remove a member | Admin |

### Tasks
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/tasks` | List tasks | Required |
| POST | `/api/tasks` | Create a task | Admin |
| GET | `/api/tasks/:id` | Get task details | Required |
| PUT | `/api/tasks/:id` | Update a task | Required |
| DELETE | `/api/tasks/:id` | Delete a task | Admin |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/healthz` | Health check |

---

## Database Schema

```
users
  id, name, email, password_hash, role (admin|member), created_at

projects
  id, title, description, status (active|completed|on_hold), created_by_id, created_at

project_members
  id, project_id, user_id, joined_at

tasks
  id, title, description, status (todo|in_progress|completed),
  priority (low|medium|high), due_date, project_id,
  assigned_to_id, created_by_id, created_at
```

---

## Database GUI

You can inspect and manage the database using Drizzle Studio:

```bash
pnpm --filter @workspace/db exec drizzle-kit studio --config ./drizzle.config.ts
```

Then open **https://local.drizzle.studio** in your browser.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm --filter @workspace/api-server run dev` | Start API server in dev mode |
| `pnpm --filter @workspace/team-task-manager run dev` | Start frontend dev server |
| `pnpm --filter @workspace/db run push` | Push schema changes to database |
| `pnpm run build` | Build all packages |
| `pnpm run typecheck` | Run TypeScript type checking |

---

## License

MIT
