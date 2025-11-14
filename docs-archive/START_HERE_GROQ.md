# 🚀 ШВИДКИЙ СТАРТ - Groq API

## ⚡ 3 команди = AI працює

```bash
# 1. Отримати ключ
open https://console.groq.com/keys

# 2. Додати ключ
echo "LLAMA_API_KEY=gsk_ваш_ключ" >> .env

# 3. Запустити
./start.sh --with-ai
```

**Готово! → http://localhost:3000 → Courses → 🤖 AI Generator**

---

## 📚 Документація

- **GROQ_SETUP_QUICK.md** - детальні інструкції (5 хв)
- **GROQ_API_READY.md** - повний гайд
- **start.sh --help** - всі опції запуску

---

## ✅ Переваги

- ✅ Безкоштовно (14,400 запитів/день)
- ✅ Швидко (20-30 сек на курс)
- ✅ Без завантажень (0 MB)
- ✅ Llama 3.1 70B

---

## 🆘 Проблеми?

```bash
# Перевірити ключ
cat .env | grep LLAMA_API_KEY

# Логи
docker logs lms-ai-service

# Перезапуск
docker-compose restart ai-service
```

**Детально**: GROQ_API_READY.md

