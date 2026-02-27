# My Worship Flow (Laravel API + React)

This repository runs as a Laravel application with:

- React frontend (existing UI preserved, mounted via Laravel Vite)
- OG admin UI flows under `/admin-app` (no Filament panel)
- Laravel API endpoints for auth, members, schedules, songs, notifications, and user approval flows

## Stack

- Laravel 12
- React 18 + TypeScript + Vite 5
- Tailwind CSS + shadcn-ui

## Quick Start

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
npm run build
php artisan serve
```

Then open:

- App frontend: `http://127.0.0.1:8000`
- Admin app: `http://127.0.0.1:8000/admin-app`

## Development (HMR)

Run backend and frontend dev servers in separate terminals:

```bash
php artisan serve
npm run dev
```

## Web Push (VAPID)

This project supports browser push notifications using VAPID.

1. Generate keys:

```bash
php artisan push:vapid-keys
```

2. Add the generated values to `.env`:

- `VAPID_SUBJECT`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

3. Reload config / restart server:

```bash
php artisan config:clear
php artisan serve
```

## Seeded Admin

`php artisan migrate:fresh --seed` creates:

- Email: `admin@myworshipflow.test`
- Password: `password`

The first created user is assigned `admin` role automatically.

## Project Layout

- `resources/js/` React app (migrated from previous `src/`)
- `resources/views/app.blade.php` SPA mount point
- `routes/api.php` Laravel API routes consumed by React hooks
- `database/migrations/` Laravel schema for profiles, roles, songs, schedules, notifications, substitute requests, and push subscriptions

## Auth and Data

- Frontend auth uses Laravel API (`/api/auth/*`) with bearer tokens.
- All React data hooks use Laravel resources/endpoints under `/api/*`.
- Database is configured for SQLite by default in local dev and can be switched to MySQL via `.env` (`DB_CONNECTION=mysql` + host/user/password values).
