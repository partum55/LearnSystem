#!/usr/bin/env python
"""
Скрипт для виведення списку користувачів з паролями (для тестування)
"""
import os
import sys
import django

# Налаштування Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


def list_users():
    """Виводить список всіх користувачів"""
    users = User.objects.all().order_by('role', 'email')
    
    if not users.exists():
        print("❌ Користувачів не знайдено")
        return
    
    print("\n" + "="*80)
    print(f"📋 СПИСОК КОРИСТУВАЧІВ (всього: {users.count()})")
    print("="*80)
    
    # Групуємо за роллю
    roles = {}
    for user in users:
        role = user.role
        if role not in roles:
            roles[role] = []
        roles[role].append(user)
    
    # Виводимо по групах
    for role, role_users in roles.items():
        print(f"\n{'='*80}")
        print(f"🎭 {role.upper()} ({len(role_users)} користувачів)")
        print(f"{'='*80}\n")
        
        for user in role_users:
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Ім'я: {user.display_name or 'Не вказано'}")
            print(f"Роль: {user.role}")
            print(f"Активний: {'✅ Так' if user.is_active else '❌ Ні'}")
            print(f"Email підтверджено: {'✅ Так' if user.email_verified else '❌ Ні'}")
            print(f"Мова: {user.locale}")
            print(f"Тема: {user.theme}")
            print(f"Створено: {user.created_at.strftime('%Y-%m-%d %H:%M')}")
            
            # Для тестових користувачів виводимо пароль
            # УВАГА: У production це робити НЕ можна!
            if hasattr(user, '_test_password'):
                print(f"🔑 Пароль: {user._test_password}")
            else:
                print(f"🔑 Пароль: [хешований, не можна отримати]")
            
            print("-" * 80)
    
    print("\n" + "="*80)
    print("ℹ️  ВАЖЛИВО:")
    print("   - Паролі зберігаються у хешованому вигляді")
    print("   - Для тестування можна створити нових користувачів")
    print("   - Використовуйте create_test_users.py для створення")
    print("="*80 + "\n")


def list_users_simple():
    """Простий список для швидкого копіювання"""
    users = User.objects.all().order_by('role', 'email')
    
    print("\n" + "="*80)
    print("📋 ШВИДКИЙ СПИСОК (для копіювання)")
    print("="*80 + "\n")
    
    for user in users:
        print(f"{user.email} | {user.role} | {user.display_name}")
    
    print("\n" + "="*80 + "\n")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Список користувачів системи')
    parser.add_argument('--simple', '-s', action='store_true', 
                       help='Простий формат виводу')
    
    args = parser.parse_args()
    
    if args.simple:
        list_users_simple()
    else:
        list_users()

