# Еднократно активиране на Kidventuro social autopilot

След тези стъпки не е нужна ежедневна работа. Автоматизацията публикува около 09:17 и 18:17 по българско време и сама отчита зимното/лятното часово време. Втори автоматичен опит в 09:47 и 18:47 довършва само липсващите публикации при временна грешка.

## 1. Подготви трите профила

Instagram трябва да е Professional профил (Business или Creator), за да има надеждно автоматично публикуване. Pinterest трябва да е Business профил. TikTok профилът трябва да позволява директно публикуване през Buffer.

Създай Pinterest board с точно име:

`Family Travel with Kids`

Не активирай режим „Requires approval“ за каналите в Buffer. Той би превърнал публикациите в чернови.

## 2. Свържи каналите с Buffer Free

1. Отвори https://buffer.com/ и създай безплатен профил.
2. Потвърди имейла.
3. Свържи точно тези три канала: Instagram, Pinterest и TikTok.
4. При всеки OAuth екран разреши публикуване.
5. При TikTok избери automatic/direct publishing, не notification publishing.
6. Отвори https://publish.buffer.com/settings/api.
7. Избери `Personal Access` → `New Key`.
8. Име: `Kidventuro GitHub Autopilot`.
9. Остави само разрешенията `accountRead`, `postsRead` и `postsWrite`.
10. Срок: `1 year`.
11. Копирай ключа веднага. Той става GitHub secret `BUFFER_API_KEY`.

Безплатният план позволява 3 канала, 10 чакащи публикации на канал и 3000 API заявки за 30 дни. Системата използва `shareNow`, затова лимитът от 10 чакащи публикации не се натрупва. Очакваното потребление е под 700 Buffer заявки месечно, включително автоматичните проверки за повторение.

Веднъж годишно създай нов Buffer ключ със същите три разрешения и замени само `BUFFER_API_KEY` в GitHub.

## 3. Създай безплатен Cloudinary профил

1. Отвори https://cloudinary.com/users/register_free и създай Free профил.
2. В Cloudinary Console отвори API Keys.
3. Копирай `Cloud name`, `API key` и `API secret`.
4. Не публикувай тези стойности в код, чат или README.

Те стават следните GitHub secrets:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Системата качва готови файлове без платени трансформации и изтрива всичко над 45 дни. Това е далеч под безплатните 25 Cloudinary credits при нормален трафик.

## 4. Добави OpenAI с минимален разход

1. Отвори https://platform.openai.com/api-keys.
2. Създай отделен Project/API key само за тази автоматизация.
3. Постави малък месечен spending limit в OpenAI billing.
4. Копирай ключа като GitHub secret `OPENAI_API_KEY`.

Тази стъпка е препоръчителна, но не е задължителна. Без ключ системата използва вградения локален генератор и струва $0 за текст. С модела `gpt-5-nano` очакваният текстов разход при 60 генерирания месечно е приблизително $0.02–$0.05 според реалната дължина на отговорите.

## 5. Добави secrets в GitHub

1. Отвори https://github.com/movopro/kidventuro/settings/secrets/actions.
2. Избери `New repository secret`.
3. Добави поотделно:
   - `BUFFER_API_KEY`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `OPENAI_API_KEY` — може да се пропусне.
4. Отвори `Variables` в същия раздел.
5. Добави variable `PINTEREST_BOARD_NAME` със стойност `Family Travel with Kids`.

Не добавяй кавички около стойностите. Не слагай secrets в `runtime-config.js`.

## 6. Провери с безопасен preview

1. Отвори https://github.com/movopro/kidventuro/actions.
2. Избери `Kidventuro social autopilot`.
3. Избери `Run workflow`.
4. Slot: `morning`.
5. Остави `dry_run` включено.
6. След приключване свали artifact `kidventuro-social-preview-morning`.

Preview режимът не публикува, не използва Buffer, Cloudinary или OpenAI и не харчи API бюджет.

## 7. Направи един live тест

1. В същия workflow избери `Run workflow`.
2. Slot: `morning`.
3. Изключи `dry_run`.
4. Провери трите профила.

След успешния live тест cron графикът продължава автоматично. При повторно стартиране на същия дневен slot системата проверява Cloudinary marker и последните Buffer публикации, за да не дублира нормално вече изпратено съдържание.

## Реална цена

- Buffer Free: $0.
- Cloudinary Free: $0.
- GitHub Actions в публичното хранилище: $0 със стандартен runner.
- OpenAI: приблизително $0.02–$0.05 месечно; $0 при локалния fallback.
- Общо: приблизително $0–$0.05 месечно.

## Ограничения

- Buffer personal API key е с максимален срок 1 година и трябва да се подмени годишно.
- Платформите могат да откажат отделна публикация заради модерация, временно прекъсване или промяна на разрешенията.
- TikTok и Instagram не позволяват автоматично добавяне на trend music чрез този поток. Видеото е чисто, без звук, без воден знак и е маркирано като AI-assisted/AIGC чрез Buffer metadata.
- Автоматизацията не използва детски снимки и не обработва клиентски или детски лични данни.

## Проверени официални източници

- Buffer API и поддържани канали: https://support.buffer.com/en-us/articles/what-is-buffers-api-GtIYIQilz5
- Buffer API ключ: https://support.buffer.com/en-us/articles/how-to-create-your-buffer-api-key-ShIgYVwM6j
- Buffer public media hosting: https://developers.buffer.com/guides/hosting-media.html
- Buffer pricing: https://buffer.com/pricing
- Cloudinary Free plan: https://cloudinary.com/documentation/billing_and_plans
- GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- OpenAI model pricing: https://developers.openai.com/api/docs/models/gpt-5-nano
- TikTok direct-post audit restrictions: https://developers.tiktok.com/docs/en/content-sharing-guidelines
