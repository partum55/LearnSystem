#!/usr/bin/env python
"""
Скрипт для створення тестових користувачів з відомими паролями
"""
import os
import sys
import django

# Налаштування Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserProfile

User = get_user_model()

# Тестові користувачі з відомими паролями
TEST_USERS = [
    {
        'email': 'admin@university.edu',
        'password': 'admin123',
        'display_name': 'Системний Адміністратор',
        'role': 'SUPERADMIN',
        'locale': 'uk',
    },
    {
        'email': 'teacher1@university.edu',
        'password': 'teacher123',
        'display_name': 'Іван Петренко',
        'role': 'TEACHER',
        'locale': 'uk',
    },
    {
        'email': 'teacher2@university.edu',
        'password': 'teacher123',
        'display_name': 'Олена Коваленко',
        'role': 'TEACHER',
        'locale': 'uk',
    },
    {
        'email': 'student1@university.edu',
        'password': 'student123',
        'display_name': 'Марія Шевченко',
        'role': 'STUDENT',
        'locale': 'uk',
        'student_id': 'ST2024001',
    },
    {
        'email': 'student2@university.edu',
        'password': 'student123',
        'display_name': 'Олександр Бондаренко',
        'role': 'STUDENT',
        'locale': 'uk',
        'student_id': 'ST2024002',
    },
    {
        'email': 'student3@university.edu',
        'password': 'student123',
        'display_name': 'Анна Мельник',
        'role': 'STUDENT',
        'locale': 'uk',
        'student_id': 'ST2024003',
    },
    {
        'email': 'ta@university.edu',
        'password': 'ta123456',
        'display_name': 'Дмитро Сидоренко',
        'role': 'TA',
        'locale': 'uk',
    },
]


def create_test_users(force=False):
    """Створює тестових користувачів"""
    print("\n" + "="*80)
    print("🚀 СТВОРЕННЯ ТЕСТОВИХ КОРИСТУВАЧІВ")
    print("="*80 + "\n")
    
    created_count = 0
    updated_count = 0
    skipped_count = 0
    
    for user_data in TEST_USERS:
        email = user_data['email']
        password = user_data.pop('password')
        
        # Перевіряємо чи існує користувач
        existing_user = User.objects.filter(email=email).first()
        
        if existing_user and not force:
            print(f"⏭️  Пропущено: {email} (вже існує)")
            skipped_count += 1
            continue
        
        if existing_user and force:
            # Оновлюємо існуючого
            for key, value in user_data.items():
                setattr(existing_user, key, value)
            existing_user.set_password(password)
            existing_user.save()
            
            print(f"♻️  Оновлено: {email}")
            print(f"   Пароль: {password}")
            print(f"   Роль: {user_data['role']}")
            updated_count += 1
        else:
            # Створюємо нового
            user = User.objects.create_user(
                email=email,
                password=password,
                **user_data
            )
            
            # Створюємо профіль
            UserProfile.objects.get_or_create(user=user)
            
            print(f"✅ Створено: {email}")
            print(f"   Пароль: {password}")
            print(f"   Роль: {user_data['role']}")
            created_count += 1
        
        print()
    
    print("="*80)
    print(f"📊 РЕЗУЛЬТАТИ:")
    print(f"   ✅ Створено: {created_count}")
    print(f"   ♻️  Оновлено: {updated_count}")
    print(f"   ⏭️  Пропущено: {skipped_count}")
    print("="*80 + "\n")
    
    # Виводимо таблицю з паролями
    print_credentials_table()


def print_credentials_table():
    """Виводить таблицю з обліковими даними"""
    print("\n" + "="*80)
    print("🔑 ОБЛІКОВІ ДАНІ ТЕСТОВИХ КОРИСТУВАЧІВ")
    print("="*80 + "\n")
    
    print(f"{'Email':<30} {'Пароль':<15} {'Роль':<15} {'Ім\'я':<25}")
    print("-" * 80)
    
    for user_data in TEST_USERS:
        # Відновлюємо пароль для виводу
        password = {
            'admin@university.edu': 'admin123',
            'teacher1@university.edu': 'teacher123',
            'teacher2@university.edu': 'teacher123',
            'student1@university.edu': 'student123',
            'student2@university.edu': 'student123',
            'student3@university.edu': 'student123',
            'ta@university.edu': 'ta123456',
        }.get(user_data['email'], 'password123')
        
        print(f"{user_data['email']:<30} {password:<15} {user_data['role']:<15} {user_data['display_name']:<25}")
    
    print("\n" + "="*80)
    print("ℹ️  ВАЖЛИВО: Ці дані тільки для тестування! Не використовуйте у production!")
    print("="*80 + "\n")


def delete_test_users():
    """Видаляє всіх тестових користувачів"""
    print("\n" + "="*80)
    print("🗑️  ВИДАЛЕННЯ ТЕСТОВИХ КОРИСТУВАЧІВ")
    print("="*80 + "\n")
    
    test_emails = [user['email'] for user in TEST_USERS]
    users = User.objects.filter(email__in=test_emails)
    count = users.count()
    
    if count == 0:
        print("ℹ️  Тестових користувачів не знайдено")
        return
    
    print(f"Знайдено {count} тестових користувачів:")
    for user in users:
        print(f"  - {user.email} ({user.role})")
    
    confirm = input("\n❓ Підтвердіть видалення (yes/no): ")
    
    if confirm.lower() == 'yes':
        users.delete()
        print(f"\n✅ Видалено {count} користувачів")
    else:
        print("\n❌ Видалення скасовано")
    
    print()


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Управління тестовими користувачами')
    parser.add_argument('--force', '-f', action='store_true',
                       help='Оновити існуючих користувачів')
    parser.add_argument('--delete', '-d', action='store_true',
                       help='Видалити тестових користувачів')
    parser.add_argument('--show', '-s', action='store_true',
                       help='Показати тільки таблицю паролів')
    
    args = parser.parse_args()
    
    if args.delete:
        delete_test_users()
    elif args.show:
        print_credentials_table()
    else:
        create_test_users(force=args.force)

