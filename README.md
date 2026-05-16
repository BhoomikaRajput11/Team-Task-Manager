# Team Task Manager

A full-stack team task management app with role-based access, project tracking, task assignment, and a dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/team-task-manager run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + JWT auth (jsonwebtoken) + bcryptjs
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind CSS (light theme) + Wouter routing
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/index.ts` — Drizzle schema (users, projects, project_members, tasks)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth middleware
- `artifacts/team-task-manager/src/` — React frontend
- `artifacts/team-task-manager/src/contexts/AuthContext.tsx` — auth state management

## Architecture decisions

- JWT stored in localStorage; `setAuthTokenGetter` in `@workspace/api-client-react` auto-attaches Bearer tokens
- Auth state managed via `AuthContext` — login/logout update state immediately without page reload
- Wouter used for routing with auth-aware redirects
- All CSS variables defined in `:root` only (light theme, no dark mode)
- DB schema uses pgEnum for status/priority/role fields

## Product

- Role-based access: admins can create/manage projects, tasks, and members; members view and update their assigned tasks
- Dashboard with project and task statistics
- Project list with progress bars and member counts
- Project detail with task and member management
- Task list with status and priority filters
- Team member directory (admin only)

## Seed accounts

- Admin: `admin@example.com` / `admin123`
- Member: `sarah@example.com` / `member123`
- Member: `james@example.com` / `member123`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Always run `pnpm --filter @workspace/db run push` after changing the DB schema
- Run `pnpm run typecheck:libs` before `pnpm --filter @workspace/api-server run typecheck`
