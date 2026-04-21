# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Unbiased AI Dashboard (artifacts/unbiased-ai)

A React + Vite web app for AI bias detection and fairness analysis. Integrated from two GitHub sources:
- **Base**: spacedragon51/Unbiased-AI — dashboard, homepage, domain analysis components
- **Healthcare enhancement**: Prajwal-SM-2005/Unbiased-AI — melanoma AI prediction, image upload, Fitzpatrick skin tone analysis

### Features
- **Homepage**: Landing page with hero, services, about, features sections; responsive nav; sign in/register buttons
- **Auth**: localStorage-based auth (sign in / sign up), no external auth provider
- **Dashboard** (protected): Domain selector (Healthcare / Banking / Job Screening), bias detection pipeline, CSV uploader, fairness panels, audit trail, alerts, model versions
  - Healthcare: melanoma image prediction with Fitzpatrick skin type fairness analysis
  - Banking: loan approval system with INR-based fairness-aware evaluation
  - Job Screening: resume screener pipeline with 5-step bias mitigation
- **HamburgerMenu** (logged in only): Edit Profile, Settings, Dashboard, Alerts, Home, Sign Out
- **Profile page**: Edit display name and email
- **Settings page**: Theme, language, notifications, data retention
- **Theme**: dark (default) / light toggle; tokens from repo1 design system (primary: `199 95% 55%`, accent: `162 88% 45%`)
- **i18n**: English only via react-i18next

### Architecture
- All Supabase/Firebase dependencies replaced with localStorage
- All sonner toasts replaced with alerts or audit log entries
- All shadcn Button/Input/Label references in JobScreeningDemo/LoanApprovalSystem replaced with native HTML
- Auth: `useAuth` hook with `AuthProvider` context (localStorage-backed)
- Audit log: `useAuditLog` hook (localStorage, last 100 events, custom DOM events)
- i18n: `src/i18n/index.ts` + `src/i18n/en.ts`
- Routing: React Router DOM with BrowserRouter, protected routes via `ProtectedRoute`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
