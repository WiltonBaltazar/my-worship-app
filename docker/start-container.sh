#!/usr/bin/env sh
set -eu

cd /var/www/html

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    echo "No .env or .env.example found; relying on container environment variables."
    touch .env
  fi
fi

# Ensure runtime directories are writable.
mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwx storage bootstrap/cache

if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
  mkdir -p database
  touch database/database.sqlite
  chown -R www-data:www-data database
fi

# Generate key only when explicitly requested and APP_KEY is missing.
if [ "${AUTO_GENERATE_APP_KEY:-false}" = "true" ] && ! grep -q "^APP_KEY=base64:" .env; then
  php artisan key:generate --force
fi

# Run migrations automatically when explicitly enabled.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  php artisan migrate --force
fi

php artisan storage:link || true

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
