"""
Management command to collect all user-facing field strings (model field verbose_name, help_text,
choices labels, serializer field labels, model verbose_name/plural) and emit a small file
that calls gettext() for each string. This allows `python manage.py makemessages` to
pick them up for localization.

Usage:
    python manage.py extract_field_strings --out backend/locale_field_strings.py

By default it writes to `backend/locale_field_strings.py`.

This script is careful with imports and will skip serializer modules that fail to import.
"""
from pathlib import Path
import importlib
import inspect

from django.core.management.base import BaseCommand
from django.apps import apps
from django.conf import settings


class Command(BaseCommand):
    help = "Extract model/serializer field strings into a file of gettext() calls for makemessages"

    def add_arguments(self, parser):
        parser.add_argument(
            "--out",
            dest="out",
            default=str(Path(settings.BASE_DIR) / "backend" / "locale_field_strings.py"),
            help="Output python file that will contain gettext() calls for discovered strings",
        )

    def handle(self, *args, **options):
        out_path = Path(options["out"]).resolve()
        self.stdout.write(f"Scanning apps for model and serializer strings...\nWriting to: {out_path}")

        strings = set()

        # Scan models
        for app_config in apps.get_app_configs():
            try:
                for model in app_config.get_models():
                    meta = getattr(model, "_meta", None)
                    if meta is None:
                        continue

                    # model verbose names
                    if getattr(meta, "verbose_name", None):
                        strings.add(str(meta.verbose_name))
                    if getattr(meta, "verbose_name_plural", None):
                        strings.add(str(meta.verbose_name_plural))

                    # fields
                    for field in meta.get_fields():
                        # skip many related objects without verbose_name
                        try:
                            vname = getattr(field, "verbose_name", None)
                            if vname:
                                strings.add(str(vname))
                        except Exception:
                            pass

                        try:
                            htext = getattr(field, "help_text", None)
                            if htext:
                                strings.add(str(htext))
                        except Exception:
                            pass

                        # choices
                        try:
                            choices = getattr(field, "choices", None)
                            if choices:
                                for c in choices:
                                    # choices can be nested pairs
                                    if isinstance(c, (list, tuple)) and len(c) >= 2:
                                        label = c[1]
                                        strings.add(str(label))
                                    else:
                                        strings.add(str(c))
                        except Exception:
                            pass
            except Exception as e:
                # if an app raises while introspecting models, skip it but warn
                self.stdout.write(self.style.WARNING(f"Skipping app {app_config.name}: {e}"))

        # Scan serializer modules (attempt to import <app>.serializers)
        for app_config in apps.get_app_configs():
            module_name = f"{app_config.name}.serializers"
            try:
                module = importlib.import_module(module_name)
            except Exception:
                # skip apps without serializers module or import errors
                continue

            # find classes that look like DRF serializers (subclass of rest_framework.serializers.BaseSerializer or Serializer)
            for name, obj in inspect.getmembers(module, inspect.isclass):
                # only classes defined in this module
                if obj.__module__ != module.__name__:
                    continue
                # quick heuristic: has attribute 'Meta' or 'get_fields' or inherits from object
                try:
                    # instantiate safely if possible
                    instance = None
                    try:
                        instance = obj()
                    except Exception:
                        # try without calling if it requires args
                        instance = None

                    # if instance has 'fields' mapping (DRF Serializer), collect label/label_from_field
                    fields = None
                    if instance is not None and hasattr(instance, "fields"):
                        fields = getattr(instance, "fields")
                    else:
                        # some serializers define get_fields as method
                        if hasattr(obj, "get_fields"):
                            try:
                                inst = obj()
                                fields = inst.get_fields()
                            except Exception:
                                fields = None

                    if fields:
                        for fname, f in getattr(fields, "items", lambda: [])():
                            # DRF Field: label, help_text, choices
                            try:
                                if getattr(f, "label", None):
                                    strings.add(str(f.label))
                                if getattr(f, "help_text", None):
                                    strings.add(str(f.help_text))
                                if getattr(f, "choices", None):
                                    for c in f.choices:
                                        # choices may be pairs
                                        if isinstance(c, (list, tuple)) and len(c) >= 2:
                                            strings.add(str(c[1]))
                                        else:
                                            strings.add(str(c))
                            except Exception:
                                pass
                except Exception:
                    # be defensive: don't let one bad serializer break the run
                    continue

        # Remove empty strings and very long ones
        filtered = [s for s in strings if s and isinstance(s, str) and len(s) <= 1000]
        filtered.sort()

        # Write out a tiny python file that calls gettext() for each string. makemessages will see them.
        out_lines = [
            "# Auto-generated by extract_field_strings management command",
            "# Do not edit - re-generate with `python manage.py extract_field_strings`",
            "from django.utils.translation import gettext as _",
            "",
        ]
        for s in filtered:
            # Escape backslashes and quotes
            escaped = s.replace("\\", "\\\\").replace("\"", "\\\"")
            out_lines.append(f"_\"{escaped}\"")

        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text("\n".join(out_lines), encoding="utf-8")

        self.stdout.write(self.style.SUCCESS(f"Wrote {len(filtered)} strings to {out_path}"))
