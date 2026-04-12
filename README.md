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

## Docker / Coolify Deployment

This repo includes a production Docker setup with:

- Nginx + PHP-FPM (single container)
- Queue worker (`php artisan queue:work`)
- Scheduler worker (`php artisan schedule:work`) for weekly reminders
- Vite assets prebuilt during image build

### Local Docker run (without port 80/8080)

The compose file maps host port **8090** to container port **8081**:

```bash
docker compose up -d --build
```

Open: `http://127.0.0.1:8090`

### Coolify setup

1. Create a new application from this repository.
2. Choose **Dockerfile** (or Docker Compose) deployment.
3. Set the service/container port to **8081** (not 80/8080).
4. Configure environment variables in Coolify (`APP_KEY`, DB credentials, VAPID keys, etc.).
5. Optional startup flags:
   - `RUN_MIGRATIONS=true` to run migrations on deploy (default in this image)
   - `AUTO_GENERATE_APP_KEY=true` only if no `APP_KEY` is provided

If you use MySQL in Coolify, set:

- `DB_CONNECTION=mysql`
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`

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
