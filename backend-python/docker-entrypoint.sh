#!/bin/sh

set -e

echo "Waiting for PostgreSQL..."
while ! nc -z ${DB_HOST:-postgres} ${DB_PORT:-5432}; do
  sleep 0.1
done
echo "PostgreSQL started"

echo "Waiting for Redis..."
while ! nc -z ${REDIS_HOST:-redis} ${REDIS_PORT:-6379}; do
  sleep 0.1
done
echo "Redis started"

# Run migrations
echo "Running database migrations..."
python manage.py makemigrations
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Create superuser if environment variables are set
if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Creating superuser (if not exists): $DJANGO_SUPERUSER_EMAIL"
    python manage.py shell <<EOF
import os
from django.contrib.auth import get_user_model
User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
if email and password:
    if not User.objects.filter(email=email).exists():
        User.objects.create_superuser(email, password)
        print('Superuser created.')
    else:
        print('Superuser already exists.')
else:
    print('Email or password not set, skipping superuser creation.')
EOF
else
    echo "DJANGO_SUPERUSER_EMAIL or DJANGO_SUPERUSER_PASSWORD not set; skipping superuser creation"
fi

# Start Gunicorn
echo "Starting Gunicorn..."
exec gunicorn lms_project.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers ${GUNICORN_WORKERS:-4} \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info

