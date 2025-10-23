#!/bin/sh

# 1. Міграції
python manage.py makemigrations
python manage.py migrate

# 2. Збираємо static файли
python manage.py collectstatic --noinput

# 3. Створюємо суперюзера, якщо задані змінні оточення і користувача ще немає
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

# 4. Запуск Gunicorn
gunicorn lms_project.wsgi:application --bind 0.0.0.0:$PORT
