from django.apps import AppConfig


class GradebookConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gradebook'
    verbose_name = 'Gradebook'

    def ready(self):
        import gradebook.signals

