# monoscope (МоноАналіз)

Локальний застосунок для аналізу витрат Monobank і перегляду рахунків ФОП:
FastAPI + React dashboard, CLI, конвертація в EUR за курсом НБУ,
категоризація та експорт CSV/Markdown.

Потрібні Python 3.11+ і Node.js 22+.

## Встановлення

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e '.[api,dev]'

cp .env.example .env
# додай MONOBANK_TOKEN з https://api.monobank.ua/

npm install --prefix apps/web
npm run types:api --prefix apps/web
```

Якщо локально немає Python 3.11+, середовище можна створити через
[uv](https://docs.astral.sh/uv/):

```bash
uv venv --python 3.12
uv pip install -e '.[api,dev]'
```

## Web UI

Запусти backend і frontend у двох терміналах:

```bash
.venv/bin/uvicorn apps.api.monoscope_api.main:create_app \
  --factory --reload --host 127.0.0.1 --port 8000
```

```bash
npm run dev --prefix apps/web
```

Відкрий `http://127.0.0.1:5173`. Токен читає лише backend із `.env`;
frontend його не отримує.

У розділі **Рахунки** показуються доступні рахунки ФОП і баланс, отриманий
під час останнього оновлення списку. Повну виписку за останні 30 днів можна
завантажити вручну; період можна змінити в межах 31 дня, а операції —
відфільтрувати за надходженнями або списаннями.

Звіт витрат на сторінці **Огляд** не формується автоматично — для нього
потрібно натиснути **Сформувати звіт**. Список ФОП-рахунків визначається
автоматично через Monobank `client-info`, кешується на 24 години, а UAH
показується першим. Виписка ФОП також не завантажується автоматично: оберіть
рахунок і натисніть **Завантажити виписку**. Так простий перехід у розділ ФОП
не займає хвилинний statement-ліміт Monobank.

Після ручного завантаження виписки інший запит виписки або звіту може чекати
близько хвилини. Застосунок показує цей стан і послідовно виконує паралельні
запити. Баланс активного рахунку уточнюється за полем `balanceAfter`
найновішої операції.

API-документація доступна на `http://127.0.0.1:8000/docs`.
Запит звіту приймає `cardTypes`: `["white"]`, `["black"]` або
`["white", "black"]`; за замовчуванням використовується `["white"]`.
Якщо Monobank повертає картку одного типу в кількох валютах, для звіту
використовується її гривневий рахунок.

## CLI

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
5. Групує по категоріях: спочатку кастомні правила (description + MCC), потім мапінг MCC → категорія.
6. Виводить підсумок у CLI, CSV і Markdown.

## Кастомні категорії

Крім мапінгу MCC → категорія, є кастомні правила у списку `CUSTOM_RULES` (`monoscope/categories.py`). Правило матчить за підрядком у `description` (без урахування регістру) та, опційно, за MCC:

```python
CUSTOM_RULES: list[Rule] = [
    # тільки якщо description містить "google" І MCC = 7399
    Rule(category="Підписки та AI", description="google", mcc=frozenset({7399})),
    # будь-який MCC, аби description містив "openai"
    Rule(category="Підписки та AI", description="openai"),
]
```

Правила перевіряються по порядку — перше збіглося перемагає. Якщо жодне не підійшло, категорія береться з `MCC_CATEGORIES`. Щоб додати своє правило, допиши рядок `Rule(...)` у список.

## Markdown-звіт

Файл `.md` — заголовок, метадані (період, картка, сума в EUR і UAH, кількість hold) і таблиця категорій з колонками **Сума EUR** та **Сума UAH**. Зручно переглядати в IDE або на GitHub.

## CSV

Колонки: `date`, `time`, `description`, `comment`, `category`, `mcc`,
`amount_original`, `currency_original`, `amount_eur`, `rate_used`,
`rate_source`, `hold`, `id`, `card_type`.

`hold=true` — операція ще не проведена остаточно.

## Обмеження Monobank API

- Не частіше **1 запит на 60 секунд** — при `429` зачекай хвилину і повтори. Для періодів >31 дня між запитами пауза ~61 с.
- Свіжі операції можуть зʼявитися в API із затримкою.
- Якщо витрата є в застосунку, але немає в API — перевір `CARD_TYPE` (біла / чорна картка).

## Перевірки для розробки

```bash
.venv/bin/python -m ruff check .
.venv/bin/python -m pytest
npm run lint --prefix apps/web
npm run test --prefix apps/web
npm run test:e2e --prefix apps/web
npm run build --prefix apps/web
```

Архітектурні та продуктові рішення зберігаються в `docs/`, а постійні
інструкції для агентів — у `.cursor/rules/`.
