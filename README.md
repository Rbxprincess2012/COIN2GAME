# TOP-UP Shop

Проект для интернет-магазина цифровых кодов пополнения и подписок.

## Структура
- `frontend/` — React + Vite приложение
- `backend/` — Node.js + Express сервер

## Установка

1. Установите зависимости для frontend:

```bash
cd frontend
npm install
```

2. Установите зависимости для backend:

```bash
cd ../backend
npm install
```
```

## Запуск

### PostgreSQL

1. Установите PostgreSQL и создайте базу данных `topup`.
2. Скопируйте `.env.example` в `.env` и при необходимости исправьте `DATABASE_URL`.

### Инициализация базы

```bash
cd backend
npm install
npm run db:init
```

### Загрузка товаров из Excel

```bash
npm run db:load
```

### Запустить frontend

```bash
cd frontend
npm install
npm run dev
```

### Запустить backend

```bash
cd backend
npm run dev
```

Frontend доступен по адресу `http://localhost:5173`, backend по адресу `http://localhost:4000`.
