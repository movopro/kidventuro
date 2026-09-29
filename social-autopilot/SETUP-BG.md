# Kidventuro social autopilot – настройка

След тези стъпки не е нужна ежедневна работа. Автоматизацията публикува три пъти дневно – около 09:00, 14:00 и 18:00 българско време – и сама отчита зимното/лятното часово време. Проверки на всеки 30 минути довършват само липсващите публикации при временна грешка.

## Как работи сега (от 2026-09-29)

1. **Текстовете** се пишат седмично (Claude, като маркетолог) в `content/queue/<седмица>.json` – по един пост за всеки ден и час – и минават автоматична проверка и правописна проверка (hunspell, en_US).
2. **Видеата** се правят от workflow-а `Kidventuro social studio` веднага щом нова седмица бъде качена в GitHub: анимирани сцени, музика, звукови ефекти и английски глас (Kokoro, работи локално на GitHub машината – текстът не се праща никъде). Готовото видео и Pinterest картинката се качват в Cloudinary.
3. **Публикуването** (`Kidventuro social autopilot`) просто публикува готовите файлове. Ако за някой час няма пост, се взема резервен от `content/evergreen.json`.

## 1. Подготви трите профила

Instagram трябва да е Professional профил (Business или Creator). Pinterest трябва да е Business профил. TikTok профилът трябва да позволява директно публикуване през Buffer.

Pinterest board с точно име: `Family Travel with Kids`.

Не активирай режим „Requires approval“ за каналите в Buffer – той би превърнал публикациите в чернови.

## 2. Buffer

1. Свържи Instagram, Pinterest и TikTok в Buffer.
2. При TikTok избери automatic/direct publishing.
3. https://publish.buffer.com/settings/api → `Personal Access` → `New Key` с разрешения `accountRead`, `postsRead`, `postsWrite`, срок 1 година.
4. Ключът е GitHub secret `BUFFER_API_KEY`. Подменяй го веднъж годишно.

## 3. Cloudinary

`Cloud name`, `API key` и `API secret` от Cloudinary Console са GitHub secrets `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Не ги публикувай в код, чат или README.

## 4. GitHub secrets и variables

https://github.com/movopro/kidventuro/settings/secrets/actions:

- secrets: `BUFFER_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- variable: `PINTEREST_BOARD_NAME` = `Family Travel with Kids`

`OPENAI_API_KEY` вече не е нужен.

## 5. Node 2 (по избор)

Node 2 не публикува за Kidventuro – ключовете в `/opt/social/secrets/kidventuro.env` са остарели. Ако искаш Node 2 да е резервен публикуващ: обнови ключовете там и включи `social-kidventuro.timer`.

## 6. Проверка

- Preview без публикуване: Actions → `Kidventuro social autopilot` → `Run workflow`, `dry_run` включено → свали artifact-а.
- Видеата на седмицата: Actions → `Kidventuro social studio` → artifact `studio-sheets` съдържа снимка на всяка сцена (`sheet.jpg`) и текста на гласа (`narration.txt`).

## Реална цена

- Buffer Free, Cloudinary Free, GitHub Actions (публично хранилище): $0.
- Гласът (Kokoro-82M, Apache-2.0) работи локално: $0.

## AI етикет

Видеата с глас носят етикета „AI-generated“ на TikTok и Instagram (гласът е синтетичен). Графиките са шаблонни, без AI изображения, затова воден знак не се слага. Правилото е в `aiDisclosure()` в `src/studio/schema.mjs`.

## Ограничения

- Buffer personal API key е с максимален срок 1 година.
- Платформите могат да откажат отделна публикация заради модерация или промяна на разрешенията.
- TikTok и Instagram не позволяват автоматично добавяне на trend music през Buffer.
- Автоматизацията не използва детски снимки и не обработва клиентски или детски лични данни.
