from celery import Celery
from celery.schedules import crontab
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')

app = Celery('lms_project')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Periodic tasks schedule
app.conf.beat_schedule = {
    'send-assignment-due-reminders': {
        'task': 'notifications.tasks.send_assignment_due_reminders',
        'schedule': crontab(hour=9, minute=0),  # Every day at 9 AM
    },
    'send-quiz-available-notifications': {
        'task': 'notifications.tasks.send_quiz_available_notifications',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
    },
    'send-grade-notifications': {
        'task': 'notifications.tasks.send_grade_notifications',
        'schedule': crontab(minute='*/10'),  # Every 10 minutes
    },
    'calculate-course-analytics': {
        'task': 'notifications.tasks.calculate_course_analytics',
        'schedule': crontab(hour=2, minute=0),  # Every day at 2 AM
    },
    'cleanup-old-notifications': {
        'task': 'notifications.tasks.cleanup_old_notifications',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),  # Every Sunday at 3 AM
    },
}

app.conf.timezone = 'Europe/Kyiv'

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

