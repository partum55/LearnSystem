#!/bin/sh

# 1. Міграції
python manage.py makemigrations
python manage.py migrate

# 2. Збираємо static файли
python manage.py collectstatic --noinput

# 3. Створюємо суперюзера, якщо ще немає
python - <<END
import os
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username=os.environ.get("DJANGO_SUPERUSER_USERNAME")).exists():
    User.objects.create_superuser(
        os.environ.get("DJANGO_SUPERUSER_USERNAME"),
        os.environ.get("DJANGO_SUPERUSER_EMAIL"),
        os.environ.get("DJANGO_SUPERUSER_PASSWORD")
    )
END

# 4. Запуск Gunicorn
gunicorn lms_project.wsgi:application --bind 0.0.0.0:$PORT
