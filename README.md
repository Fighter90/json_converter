# ⚙️ JSON Конвертер

[![GitHub](https://img.shields.io/badge/GitHub-Fighter90%2Fjson__converter-blue)](https://github.com/Fighter90/json_converter)
[![Live Demo](https://img.shields.io/badge/Website-Live%20Demo-orange)](https://fighter90.github.io/json_converter/)

Современный веб-сервис для работы с JSON-данными. Работает полностью в браузере — никаких зависимостей от серверов и никакой передачи данных.

---

## 🚀 Возможности

| Функция | Описание |
|---|---|
| ✅ Валидация | Проверка корректности JSON с указанием строки и позиции ошибки |
| 🌲 Дерево | Интерактивное дерево с подсветкой синтаксиса, сворачиванием узлов |
| 📝 Подсветка | Красивый вывод с отступами и цветовым выделением типов |
| ⇥ Форматирование | Автоматическое форматирование с отступами в поле ввода |
| ⟨⟩ Минификация | Сжатие JSON в одну строку |
| 📊 Таблица | Преобразование любого JSON (в т.ч. вложенного) в HTML-таблицу с поиском |
| 📈 Статистика | Размер, глубина, типы данных, количество ключей |
| ⬇ Экспорт | Скачивание результатов в JSON, CSV, TXT |

---

## 📂 Структура проекта

```
json_converter/
├── index.html           # Главная страница
├── css/
│   └── style.css        # Стили (responsive, dark editor)
├── js/
│   ├── utils.js         # Утилиты: flatten, stats, CSV-cells, escapeHtml
│   ├── parser.js        # Парсер/валидатор, подсветка, коллапсируемое дерево
│   ├── converter.js     # format, minify, jsonToCsv, jsonToText, downloadBlob
│   ├── table-builder.js # Построитель таблиц из любого JSON
│   └── app.js           # Главная логика приложения
├── examples/
│   ├── simple.json      # Простой массив объектов
│   ├── nested.json      # Вложенные объекты
│   └── complex.json     # Сложный JSON (заказ, метаданные, edge-cases)
├── test/
│   └── tests.js         # 60+ юнит-тестов (Node.js)
└── README.md
```

---

## 🖥 Использование

### Онлайн
Откройте [https://fighter90.github.io/json_converter/](https://fighter90.github.io/json_converter/)

### Локально
```bash
git clone https://github.com/Fighter90/json_converter.git
cd json_converter
# Откройте index.html в браузере (или запустите локальный сервер)
python3 -m http.server 8080
# → http://localhost:8080
```

### Запуск тестов
```bash
node test/tests.js
```

---

## 📋 Примеры

### Простой массив
```json
[
  {"name": "Alice", "age": 30, "email": "alice@example.com"},
  {"name": "Bob",   "age": 25, "email": "bob@example.com"}
]
```

### Вложенный объект (автоматически разворачивается в таблицу)
```json
{
  "user": {
    "id": 1,
    "profile": { "name": "Alice", "city": "Moscow" }
  },
  "scores": [98, 87, 92]
}
```

### Сложный JSON с edge-cases
— смотрите `examples/complex.json`

---

## 🔧 Технологии

- Чистый **HTML5 / CSS3 / JavaScript (ES5+)** без фреймворков
- [Bootstrap 5.3](https://getbootstrap.com/) — адаптивная вёрстка
- Все вычисления выполняются **локально в браузере**

---

## 👤 Автор

**Fighter90** — [github.com/Fighter90](https://github.com/Fighter90)

- [Live Demo](https://fighter90.github.io/json_converter/)
- [Исходный код](https://github.com/Fighter90/json_converter)

Лицензия: MIT
