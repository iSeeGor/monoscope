# monoscope (МоноАналіз)

CLI для витягнення й аналізу витрат з Monobank: конвертація в EUR за курсом НБУ, групування по категоріях і експорт у CSV + Markdown.

## Встановлення

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# додай MONOBANK_TOKEN з https://api.monobank.ua/
```

## Запуск

```bash
python -m monoscope
```

### Результат

| Куди | Що |
|---|---|
| термінал | підсумок по категоріях у EUR |
| `./output/expenses_*.csv` | детальний список операцій |
| `./output/expenses_*.md` | той самий підсумок, що в CLI, у Markdown |

Імена файлів:
- місяць → `expenses_2026-05.csv` / `.md`
- період → `expenses_2026-05-01_2026-05-15.csv` / `.md`

### CLI-прапорці

```bash
python -m monoscope --csv ./my-report.csv --md ./my-report.md
```

| Прапорець | Опис |
|---|---|
| `--csv PATH` | кастомний шлях до CSV |
| `--md PATH` | кастомний шлях до Markdown-звіту |

## Параметри `.env`

| Змінна | Обовʼязкова | За замовчуванням | Опис |
|---|---|---|---|
| `MONOBANK_TOKEN` | так | — | Персональний токен Monobank API |
| `CARD_TYPE` | ні | `white` | Тип картки: `white`, `black` |
| `REPORT_MONTH` | ні | поточний місяць | Цілий місяць у форматі `YYYY-MM` |
| `REPORT_FROM` | ні | — | Початок періоду `YYYY-MM-DD` (разом з `REPORT_TO`) |
| `REPORT_TO` | ні | — | Кінець періоду `YYYY-MM-DD` (разом з `REPORT_FROM`) |
| `OUTPUT_DIR` | ні | `./output` | Папка для CSV і MD |
| `INCLUDE_HOLDS` | ні | `true` | Включати очікувані операції (`hold=true`) |

### Як обрати період

1. **Нічого не задавати** → поточний місяць (до поточного часу).
2. **`REPORT_MONTH=2026-05`** → 1–31 травня (для поточного місяця — до зараз).
3. **`REPORT_FROM` + `REPORT_TO`** → довільний період, **має пріоритет** над `REPORT_MONTH`.

Дати **включно**. Якщо кінець періоду — сьогодні, він обрізається до поточного часу. Часовий пояс: `Europe/Kyiv`.

Приклад — цілий місяць:

```env
MONOBANK_TOKEN=your_token_here
CARD_TYPE=white
REPORT_MONTH=2026-05
```

Приклад — довільний період:

```env
MONOBANK_TOKEN=your_token_here
CARD_TYPE=white
REPORT_FROM=2026-05-01
REPORT_TO=2026-05-15
INCLUDE_HOLDS=true
```

## Що робить скрипт

1. Бере виписку з обраної картки за період. Якщо період >31 дня — ділить на частини (ліміт Monobank API).
2. Залишає витрати (`amount < 0`).
3. Включає `hold=true` (як у застосунку), але не дублює їх, якщо вже є проведена операція.
4. Конвертує в EUR:
   - EUR-операції — напряму з суми операції;
   - UAH та інші — за курсом НБУ на дату транзакції.
5. Групує по категоріях (MCC → категорія).
6. Виводить підсумок у CLI, CSV і Markdown.

## Markdown-звіт

Файл `.md` — заголовок, метадані (період, картка, сума в EUR і UAH, кількість hold) і таблиця категорій з колонками **Сума EUR** та **Сума UAH**. Зручно переглядати в IDE або на GitHub.

## CSV

Колонки: `date`, `time`, `description`, `comment`, `category`, `mcc`, `amount_original`, `currency_original`, `amount_eur`, `rate_used`, `rate_source`, `hold`, `id`.

`hold=true` — операція ще не проведена остаточно.

## Обмеження Monobank API

- Не частіше **1 запит на 60 секунд** — при `429` зачекай хвилину і повтори. Для періодів >31 дня між запитами пауза ~61 с.
- Свіжі операції можуть зʼявитися в API із затримкою.
- Якщо витрата є в застосунку, але немає в API — перевір `CARD_TYPE` (біла / чорна картка).
