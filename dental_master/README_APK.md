# 📱 Стоматолог: Мастер клиники — как получить APK

Игра написана как веб-приложение (HTML5 + Canvas, PWA). Ниже — **три способа**
превратить её в установочный файл Android (APK/AAB). Установка ничего на компьютер
нужна только в третьем способе.

---

## Способ 1. GitHub Actions — APK собирается облаком (рекомендуется, 0 установок)

В проекте уже есть готовый workflow: `.github/workflows/build-apk.yml`.

1. Создайте пустой репозиторий на https://github.com/new (можно приватный).
2. Загрузите туда всю папку `dental_master` (включая скрытую папку `.github`).
   Удобно через веб-интерфейс: **Add file → Upload files**.
3. Откройте вкладку **Actions** → дождитесь зелёной галочки у «Build Android APK»
   (первый прогон 8–15 минут).
4. Откройте завершённый запуск → внизу скачайте артефакт **dental-master-apk**.
5. Передайте `app-debug.apk` на телефон и установите
   (разрешите «установку из неизвестных источников»).

При каждом `push` APK пересобирается автоматически.

---

## Способ 2. PWABuilder — APK из PWA за 5 минут (без сборки)

Игра уже готовая PWA (манифест, иконки, service worker).

1. Выложите содержимое папки на любой HTTPS-хостинг, например:
   - **GitHub Pages** (Settings → Pages → Deploy from branch),
   - **Netlify Drop** (просто перетащите папку на netlify.com/drop).
2. Откройте https://www.pwabuilder.com → вставьте ссылку на игру → **Start**.
3. Раздел **Android** → **Download package** → получите APK + AAB
   (AAB подходит для загрузки в Google Play Console).

---

## Способ 3. Локальная сборка через Capacitor + Android Studio

Требуется: Node.js 18+, Android Studio (с SDK 34).

```bash
cd dental_master
npm install
npx cap add android      # один раз — создаст папку android/
npx cap sync android
npx cap open android     # откроется Android Studio
```

В Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.

Готовый файл: `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## Структура проекта

```
dental_master/
├── index.html              # точка входа
├── game.js                 # весь код игры (6 мини-игр)
├── manifest.webmanifest    # PWA-манифест
├── sw.js                   # офлайн-кэш
├── assets/                 # сгенерированная графика (фон, пациенты, логотип)
├── icons/                  # иконки приложения (192/512)
├── capacitor.config.json   # конфиг обёртки под Android
├── package.json
└── .github/workflows/
    └── build-apk.yml       # автосборка APK в облаке
```

## После APK — публикация в Google Play

1. Соберите **AAB** (в Android Studio: Build → Generate Signed Bundle, или через PWABuilder).
2. Купите аккаунт разработчика Google Play ($25, разово).
3. Создайте приложение, загрузите AAB, заполните описание/скриншоты/рейтинг.
4. Отправьте на проверку — обычно 1–7 дней.

Удачи! 🦷
