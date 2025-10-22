#!/bin/sh
# Міграції
python manage.py makemigrations && python manage.py migrate

# Створюємо суперюзера якщо не існує
python - <<END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username="admin").exists():
    User.objects.create_superuser("admin", "admin@ucu.edu.ya", "secret")
END

# Запуск gunicorn
gunicorn lms_project.wsgi:application --bind 0.0.0.0:$PORT
