/**
 * UI string catalog (uz / ru / en). Keys are flat and namespaced by screen.
 * Templated values use `{name}` placeholders resolved by `t(key, params)`.
 * The design shipped en + ru; Uzbek is authored here (app default for the UZ
 * market).
 */
import type { L } from "@shared/data/events";

export const STRINGS = {
  // ── common ───────────────────────────────────────────────
  "common.register": {
    uz: "Roʻyxatdan oʻtish",
    ru: "Зарегистрироваться",
    en: "Register",
  },
  "common.getTickets": {
    uz: "Bilet olish",
    ru: "Получить билет",
    en: "Get tickets",
  },
  "common.continue": { uz: "Davom etish", ru: "Продолжить", en: "Continue" },
  "common.follow": { uz: "Kuzatish", ru: "Подписаться", en: "Follow" },
  "common.seeAll": { uz: "Barchasi", ru: "Все", en: "See all" },
  "common.free": { uz: "Bepul", ru: "Бесплатно", en: "Free" },
  "common.viewTicket": {
    uz: "Biletni koʻrish",
    ru: "Посмотреть билет",
    en: "View ticket",
  },
  "common.directions": { uz: "Yoʻnalish", ru: "Маршрут", en: "Directions" },
  "common.all": { uz: "Barchasi", ru: "Все", en: "All" },
  "common.more": { uz: "Yana", ru: "Ещё", en: "More" },
  "common.retry": { uz: "Qayta urinish", ru: "Повторить", en: "Retry" },
  "common.clear": { uz: "Tozalash", ru: "Очистить", en: "Clear" },
  "common.done": { uz: "Tayyor", ru: "Готово", en: "Done" },
  // Language names are always written in their OWN language — a speaker looks
  // for "O‘zbekcha", not for the word "Uzbek" in a language they don't read.
  "lang.ru": { uz: "Русский", ru: "Русский", en: "Русский" },
  "lang.uz": { uz: "Oʻzbekcha", ru: "Oʻzbekcha", en: "Oʻzbekcha" },
  "lang.en": { uz: "English", ru: "English", en: "English" },

  // ── shared states ────────────────────────────────────────
  "state.error.title": {
    uz: "Yuklab boʻlmadi",
    ru: "Не удалось загрузить",
    en: "Couldn't load",
  },
  // --- Mutation failures: name the cause, not "check your connection" ---
  "error.offline": {
    uz: "Soʻrov serverga yetib bormadi. Aloqani tekshiring va qayta urining.",
    ru: "Запрос не дошёл до сервера. Проверьте связь и повторите.",
    en: "The request never reached the server. Check your connection and retry.",
  },
  "error.session": {
    uz: "Sessiya tugadi — qaytadan kiring.",
    ru: "Сессия истекла — войдите заново.",
    en: "Your session expired — sign in again.",
  },
  "error.forbidden": {
    uz: "Buning uchun huquq yoʻq. Tashkilot egasidan soʻrang.",
    ru: "Нет прав на это действие. Попросите владельца организации.",
    en: "You do not have rights for this. Ask the organization owner.",
  },
  "error.gone": {
    uz: "Obyekt topilmadi — uni allaqachon oʻchirishgan boʻlishi mumkin.",
    ru: "Объект не найден — возможно, его уже удалили.",
    en: "Not found — it may already have been deleted.",
  },
  "error.conflict": {
    uz: "Amalni bajarib boʻlmadi: chegara yoki holat toʻsqinlik qilyapti.",
    ru: "Действие не выполнено: мешает лимит или текущий статус.",
    en: "The action did not go through: a limit or the current status blocks it.",
  },
  "error.rejected": {
    uz: "Server maʼlumotni qabul qilmadi. Toʻldirilganini tekshiring.",
    ru: "Сервер не принял данные. Проверьте заполненное.",
    en: "The server refused the data. Check what you filled in.",
  },
  "error.server": {
    uz: "Serverda xatolik. Birozdan soʻng qayta urining.",
    ru: "Ошибка на сервере. Попробуйте позже.",
    en: "Server error. Try again a little later.",
  },
  "state.error.body": {
    uz: "Internetni tekshirib, qayta urinib koʻring.",
    ru: "Проверьте соединение и попробуйте снова.",
    en: "Check your connection and try again.",
  },
  "home.empty.title": {
    uz: "Tadbir topilmadi",
    ru: "Событий не найдено",
    en: "No events match",
  },
  "home.empty.body": {
    uz: "Filtrlarni tozalang yoki boshqa toifani tanlang.",
    ru: "Очистите фильтры или выберите другую категорию.",
    en: "Clear the filters or pick another category.",
  },
  "home.clearFilters": {
    uz: "Filtrlarni tozalash",
    ru: "Очистить фильтры",
    en: "Clear filters",
  },
  "home.noUpcoming.title": {
    uz: "Hozircha faol tadbirlar yoʻq",
    ru: "Активных событий пока нет",
    en: "No upcoming events right now",
  },
  "home.noUpcoming.body": {
    uz: "Yangi tadbirlar tez orada. Hozircha oʻtganlarini koʻring.",
    ru: "Новые события скоро появятся. А пока посмотрите, что уже прошло.",
    en: "New events are on the way. Meanwhile, see what's already happened.",
  },
  "home.past": {
    uz: "Oʻtgan tadbirlar",
    ru: "Прошедшие события",
    en: "Past events",
  },

  // ── events map ───────────────────────────────────────────
  "map.title": {
    uz: "Tadbirlar xaritasi",
    ru: "Карта событий",
    en: "Events map",
  },
  "map.open": {
    uz: "Tadbirni ochish",
    ru: "Открыть событие",
    en: "Open event",
  },
  // Two different situations, told apart: the region genuinely has nothing on,
  // versus it has events whose venue was never given coordinates. The old copy
  // said "no events with a mapped venue" for both, which reads as "no events".
  "map.empty.title": {
    uz: "Xaritada belgilar yoʻq",
    ru: "На карте пусто",
    en: "Nothing on the map",
  },
  "map.empty.region": {
    uz: "{region} hududida yaqin kunlarda tadbirlar yoʻq.",
    ru: "В регионе «{region}» ближайших событий нет.",
    en: "No upcoming events in {region}.",
  },
  "map.empty.all": {
    uz: "Yaqin kunlarda tadbirlar yoʻq.",
    ru: "Ближайших событий пока нет.",
    en: "No upcoming events yet.",
  },
  "map.empty.showAll": {
    uz: "Barcha hududlar",
    ru: "Показать все регионы",
    en: "Show all regions",
  },
  "map.noCoords": {
    uz: "{n} ta tadbir manzili xaritada belgilanmagan — ular roʻyxatda.",
    ru: "У {n} событий адрес не отмечен на карте — они есть в афише.",
    en: "{n} events have no mapped address — they're in the feed.",
  },
  "map.provider": {
    uz: "Yandeks Xaritalar",
    ru: "Яндекс Карты",
    en: "Yandex Maps",
  },
  "map.unavailable.title": {
    uz: "Xarita mavjud emas",
    ru: "Карта недоступна",
    en: "Map unavailable",
  },
  "map.unavailable.body": {
    uz: "Xarita kaliti sozlanmagan. Keyinroq urinib koʻring.",
    ru: "Ключ карты не настроен. Попробуйте позже.",
    en: "The map key isn't configured. Try again later.",
  },
  "error.boundary.title": {
    uz: "Xatolik yuz berdi",
    ru: "Что-то пошло не так",
    en: "Something went wrong",
  },
  "error.boundary.body": {
    uz: "Kutilmagan xatolik yuz berdi. Qayta urinib koʻring.",
    ru: "Произошла непредвиденная ошибка. Попробуйте снова.",
    en: "The app ran into an unexpected error. Try again.",
  },

  // ── tabs ─────────────────────────────────────────────────
  "tab.discover": { uz: "Afisha", ru: "Афиша", en: "Discover" },
  "tab.tickets": { uz: "Biletlar", ru: "Билеты", en: "Tickets" },
  "tab.certificates": {
    uz: "Sertifikatlar",
    ru: "Сертификаты",
    en: "Certificates",
  },
  "tab.profile": { uz: "Profil", ru: "Профиль", en: "Profile" },

  // ── welcome ──────────────────────────────────────────────
  "welcome.headline": {
    uz: "Imkoniyatingni och",
    ru: "Раскрой свой потенциал",
    en: "Discover your potential",
  },
  "welcome.sub": {
    uz: "Bogʻlan. Qatnash. Rivojlan.",
    ru: "Знакомься. Участвуй. Развивайся.",
    en: "Connect. Engage. Thrive.",
  },
  "welcome.createAccount": {
    uz: "Akkaunt yaratish",
    ru: "Создать аккаунт",
    en: "Create account",
  },
  "welcome.haveAccount": {
    uz: "Allaqachon akkauntim bor",
    ru: "У меня уже есть аккаунт",
    en: "I already have an account",
  },
  "welcome.organize": {
    uz: "Tadbir tashkil qilasizmi?",
    ru: "Организуете события?",
    en: "Organize events?",
  },

  // ── auth (login / signup / verify) ───────────────────────
  "auth.login.title": {
    uz: "Xush kelibsiz",
    ru: "С возвращением",
    en: "Welcome back",
  },
  "auth.login.sub": {
    uz: "Qoldirgan joyingizdan davom eting.",
    ru: "Продолжите с того места, где остановились.",
    en: "Log in to pick up where you left off.",
  },
  "auth.login.submit": { uz: "Kirish", ru: "Войти", en: "Log in" },
  "auth.signup.title": {
    uz: "Akkaunt yaratish",
    ru: "Создать аккаунт",
    en: "Create your account",
  },
  "auth.signup.sub": {
    uz: "Emailingizni kiriting — tasdiqlash uchun kod yuboramiz.",
    ru: "Укажите email — пришлём код для подтверждения.",
    en: "Use your email. We'll send a code to confirm it.",
  },
  "auth.signup.submit": {
    uz: "Akkaunt yaratish",
    ru: "Создать аккаунт",
    en: "Create account",
  },
  "auth.field.firstName": { uz: "Ism", ru: "Имя", en: "First name" },
  "auth.field.lastName": { uz: "Familiya", ru: "Фамилия", en: "Last name" },
  "auth.field.email": { uz: "Email", ru: "Email", en: "Email" },
  "auth.field.password": { uz: "Parol", ru: "Пароль", en: "Password" },
  "auth.field.confirm": {
    uz: "Parolni tasdiqlang",
    ru: "Подтвердите пароль",
    en: "Confirm password",
  },
  "auth.field.code": {
    uz: "Tasdiqlash kodi",
    ru: "Код подтверждения",
    en: "Verification code",
  },
  "auth.password.hint": {
    uz: "Kamida 8 belgi, raqam, katta-kichik harf va maxsus belgi",
    ru: "Минимум 8 символов: цифра, строчная и заглавная буквы, спецсимвол",
    en: "Min 8 chars: a number, upper & lower case, and a symbol",
  },
  "auth.error.match": {
    uz: "Parollar mos kelmadi",
    ru: "Пароли не совпадают",
    en: "Passwords don't match",
  },
  "auth.error.password": {
    uz: "Parol talablarga javob bermaydi",
    ru: "Пароль не отвечает требованиям",
    en: "Password doesn't meet the requirements",
  },
  "auth.error.required": {
    uz: "Barcha maydonlarni toʻldiring",
    ru: "Заполните все поля",
    en: "Fill in all fields",
  },
  "auth.error.generic": {
    uz: "Xatolik yuz berdi. Qayta urinib koʻring.",
    ru: "Что-то пошло не так. Попробуйте снова.",
    en: "Something went wrong. Please try again.",
  },
  "auth.verify.title": {
    uz: "Pochtangizni tekshiring",
    ru: "Проверьте почту",
    en: "Check your email",
  },
  "auth.verify.submit": { uz: "Tasdiqlash", ru: "Подтвердить", en: "Verify" },
  "auth.verify.resend": {
    uz: "Kodni qayta yuborish",
    ru: "Отправить код снова",
    en: "Resend code",
  },
  "auth.verify.resendIn": {
    uz: "Qayta yuborish — {n}s",
    ru: "Повторить через {n}с",
    en: "Resend in {n}s",
  },
  "auth.verify.skip": { uz: "Keyinroq", ru: "Позже", en: "Later" },
  "auth.verify.sentTo": {
    uz: "Bu manzilga 6 xonali kod yubordik",
    ru: "Мы отправили 6-значный код на",
    en: "We sent a 6-digit code to",
  },
  "auth.verify.edit": { uz: "Oʻzgartirish", ru: "Изменить", en: "Edit" },
  "auth.verify.wrong": {
    uz: "Kod notoʻgʻri. Tekshirib, qayta urining.",
    ru: "Неверный код. Проверьте и попробуйте снова.",
    en: "That code isn't right. Check it and try again.",
  },
  "auth.verify.confirmed": {
    uz: "Email tasdiqlandi",
    ru: "Email подтверждён",
    en: "Email confirmed",
  },

  // ── auth · login extras ──────────────────────────────────
  "auth.login.forgot": {
    uz: "Parolni unutdingizmi?",
    ru: "Забыли пароль?",
    en: "Forgot password?",
  },
  "auth.login.error": {
    uz: "Email yoki parol notoʻgʻri.",
    ru: "Неверный email или пароль.",
    en: "Email or password is incorrect.",
  },

  // ── auth · footer links (question + accent action) ───────
  "auth.foot.haveAccount": {
    uz: "Akkauntingiz bormi?",
    ru: "Уже есть аккаунт?",
    en: "Already have an account?",
  },
  "auth.foot.noAccount": {
    uz: "Akkaunt yoʻqmi?",
    ru: "Нет аккаунта?",
    en: "No account?",
  },
  "auth.foot.remembered": {
    uz: "Esladingizmi?",
    ru: "Вспомнили?",
    en: "Remembered it?",
  },
  "auth.foot.login": { uz: "Kirish", ru: "Войти", en: "Log in" },
  "auth.foot.createOne": { uz: "Yaratish", ru: "Создать", en: "Create one" },

  // ── auth · success (07) ──────────────────────────────────
  "auth.success.title": {
    uz: "Hammasi tayyor",
    ru: "Всё готово",
    en: "You're all set",
  },
  "auth.success.sub": {
    uz: "Akkauntingiz tayyor. Keling, arziydigan tadbir topamiz.",
    ru: "Аккаунт готов. Давайте найдём событие, ради которого стоит прийти.",
    en: "Your account is ready. Let's find something worth showing up for.",
  },
  "auth.success.cta": { uz: "Boshlash", ru: "Начать", en: "Start exploring" },

  // ── auth · password reveal (a11y) ────────────────────────
  "auth.pw.show": {
    uz: "Parolni koʻrsatish",
    ru: "Показать пароль",
    en: "Show password",
  },
  "auth.pw.hide": {
    uz: "Parolni yashirish",
    ru: "Скрыть пароль",
    en: "Hide password",
  },

  // ── auth · password strength meter ───────────────────────
  "auth.pw.req.len": {
    uz: "Kamida 8 ta belgi",
    ru: "Минимум 8 символов",
    en: "At least 8 characters",
  },
  "auth.pw.req.lower": {
    uz: "Bitta kichik harf",
    ru: "Одна строчная буква",
    en: "One lowercase letter",
  },
  "auth.pw.req.upper": {
    uz: "Bitta katta harf",
    ru: "Одна заглавная буква",
    en: "One uppercase letter",
  },
  "auth.pw.req.digit": {
    uz: "Bitta raqam",
    ru: "Одна цифра",
    en: "One number",
  },
  "auth.pw.req.special": {
    uz: "Bitta maxsus belgi (@$!%*?&)",
    ru: "Один спецсимвол (@$!%*?&)",
    en: "One special (@$!%*?&)",
  },
  "auth.pw.weak": { uz: "Zaif", ru: "Слабый", en: "Weak" },
  "auth.pw.fair": { uz: "Oʻrtacha", ru: "Средний", en: "Fair" },
  "auth.pw.strong": { uz: "Kuchli", ru: "Надёжный", en: "Strong" },

  // ── auth · intent fork (attendee vs organizer) ───────────
  "auth.intent.title": {
    uz: "Eventflowʼga nima uchun keldingiz?",
    ru: "Что привело вас в Eventflow?",
    en: "What brings you to Eventflow?",
  },
  "auth.intent.sub": {
    uz: "Bitta akkaunt — istalgan vaqtda almashtirasiz.",
    ru: "Один аккаунт — переключайтесь в любой момент.",
    en: "One account, either way. Switch anytime.",
  },
  "auth.intent.attendee.title": {
    uz: "Tadbir izlayapman",
    ru: "Хочу находить события",
    en: "I'm here to find events",
  },
  "auth.intent.attendee.sub": {
    uz: "Koʻrib chiqing, roʻyxatdan oʻting, bilet va sertifikatlarni saqlang.",
    ru: "Смотрите события, регистрируйтесь, храните билеты и сертификаты.",
    en: "Browse, book and keep your tickets and certificates.",
  },
  "auth.intent.organizer.title": {
    uz: "Men tadbir tashkil qilaman",
    ru: "Я организую события",
    en: "I organize events",
  },
  "auth.intent.organizer.sub": {
    uz: "Tadbir eʼlon qiling, bilet soting, kirishda mehmonlarni tekshiring.",
    ru: "Публикуйте события, продавайте билеты, отмечайте гостей на входе.",
    en: "Publish events, sell tickets, check guests in at the door.",
  },
  "auth.intent.org.heading": {
    uz: "Tashkilotchi sifatida sozlang",
    ru: "Настройте профиль организатора",
    en: "Get set up as an organizer",
  },
  "auth.intent.org.create.title": {
    uz: "Tashkilot yaratish",
    ru: "Создать организацию",
    en: "Create an organization",
  },
  "auth.intent.org.create.sub": {
    uz: "Ishtirokchi profilisiz alohida egasi akkaunti",
    ru: "Отдельный аккаунт владельца без профиля участника",
    en: "A separate owner account without a participant profile",
  },
  "auth.intent.org.invite.title": {
    uz: "Taklif kodim bor",
    ru: "У меня есть код приглашения",
    en: "I have an invite code",
  },
  "auth.intent.org.invite.sub": {
    uz: "Sizni taklif qilgan tashkilotga qoʻshiling",
    ru: "Присоединитесь к организации, куда вас пригласили",
    en: "Join an organization you were invited to",
  },
  "auth.intent.org.note": {
    uz: "Shaxsiy akkaunt tashkilot yarata olmaydi: xodim taklif orqali qoʻshiladi yoki alohida tashkilot akkaunti yaratiladi.",
    ru: "Личный аккаунт не создаёт организацию: сотрудник входит по приглашению либо регистрируется отдельный аккаунт организации.",
    en: "A personal account cannot create an organization: join as invited staff or register a separate organization account.",
  },

  // ── auth · create organization ───────────────────────────
  "auth.org.title": {
    uz: "Tashkilotingizni yarating",
    ru: "Создайте организацию",
    en: "Create your organization",
  },
  "auth.org.sub": {
    uz: "Bu — tadbirlaringizni eʼlon qiladigan ish maydoni.",
    ru: "Это рабочее пространство, из которого вы публикуете события.",
    en: "This becomes the workspace you publish events from.",
  },
  "auth.org.field.name": {
    uz: "Tashkilot nomi",
    ru: "Название организации",
    en: "Organization name",
  },
  "auth.org.field.namePh": {
    uz: "masalan, Loft Records",
    ru: "напр., Loft Records",
    en: "e.g. Loft Records",
  },
  "auth.org.note": {
    uz: "Toʻliq maʼlumotlarni (INN) keyinroq saytda kiritasiz — tadbirlarni darrov sozlashni boshlang.",
    ru: "Полные данные (ИНН) можно заполнить позже на сайте — начните настраивать события сразу.",
    en: "You can finish full company details (INN) later on the web, so start setting up events right away.",
  },
  "auth.org.submit": {
    uz: "Taklifni ochish",
    ru: "Открыть приглашение",
    en: "Open invitation",
  },
  "auth.org.badge": { uz: "Tashkilotchi", ru: "Организатор", en: "Organizer" },
  "auth.attendee.badge": { uz: "Ishtirokchi", ru: "Участник", en: "Attendee" },

  // ── auth · invite code ───────────────────────────────────
  "auth.invite.title": {
    uz: "Taklif kodini kiriting",
    ru: "Введите код приглашения",
    en: "Enter your invite code",
  },
  "auth.invite.sub": {
    uz: "Kodni tashkilot egasidan, jamoa sahifasidan soʻrang.",
    ru: "Попросите код у владельца организации на странице команды.",
    en: "Ask an organization owner for the code from their team page.",
  },
  "auth.invite.webTitle": {
    uz: "Taklifni emaildagi havola orqali qabul qiling",
    ru: "Принимайте приглашение по ссылке из письма",
    en: "Accept your invite from the email link",
  },
  "auth.invite.webBody": {
    uz: "Tashkilot takliflari taklif xatidagi xavfsiz havola orqali qabul qilinadi. Ushbu qurilmada oʻsha havolani oching — qoʻshilish avtomatik ochiladi.",
    ru: "Приглашения в организацию принимаются по защищённой ссылке из письма. Откройте эту ссылку на этом устройстве — присоединение откроется автоматически.",
    en: "Organization invites are accepted via the secure link in your invitation email. Open that link on this device and joining opens automatically.",
  },
  "auth.invite.openMail": {
    uz: "Pochtani ochish",
    ru: "Открыть почту",
    en: "Open mail app",
  },

  // ── auth · forgot password ───────────────────────────────
  "auth.forgot.title": {
    uz: "Parolni tiklash",
    ru: "Сброс пароля",
    en: "Reset your password",
  },
  "auth.forgot.sub": {
    uz: "Emailingizni kiriting — tiklash uchun 6 xonali kod yuboramiz.",
    ru: "Введите email — отправим 6-значный код для сброса.",
    en: "Enter your email and we'll send a 6-digit code to reset it.",
  },
  "auth.forgot.submit": {
    uz: "Tiklash kodini yuborish",
    ru: "Отправить код сброса",
    en: "Send reset code",
  },

  // ── auth · reset password ────────────────────────────────
  "auth.reset.title": {
    uz: "Yangi parol oʻrnating",
    ru: "Задайте новый пароль",
    en: "Set a new password",
  },
  "auth.reset.sub": {
    uz: "Emailga yuborilgan kodni kiriting, soʻng yangi parol tanlang.",
    ru: "Введите код из письма и выберите новый пароль.",
    en: "Enter the code we emailed you, then choose a new password.",
  },
  "auth.reset.codeLabel": {
    uz: "Tiklash kodi",
    ru: "Код сброса",
    en: "Reset code",
  },
  "auth.reset.submit": {
    uz: "Parolni tiklash",
    ru: "Сбросить пароль",
    en: "Reset password",
  },
  "auth.reset.success": {
    uz: "Parol yangilandi — endi kiring.",
    ru: "Пароль обновлён — теперь войдите.",
    en: "Password updated. Please log in.",
  },
  "auth.field.newPassword": {
    uz: "Yangi parol",
    ru: "Новый пароль",
    en: "New password",
  },
  "auth.field.confirmNew": {
    uz: "Yangi parolni tasdiqlang",
    ru: "Подтвердите новый пароль",
    en: "Confirm new password",
  },

  // ── workspace (org / personal switch) ────────────────────
  "workspace.switch.title": {
    uz: "Davom etish",
    ru: "Продолжить как",
    en: "Continue as",
  },
  "workspace.switch.sub": {
    uz: "Bitta akkaunt — qaysi maydonda ishlashni tanlang.",
    ru: "Один аккаунт — выберите пространство для работы.",
    en: "One account. Pick the space you want to work in.",
  },
  "workspace.personal": { uz: "Shaxsiy", ru: "Личный", en: "Personal" },
  "workspace.createPersonal": {
    uz: "Shaxsiy kabinet ochish",
    ru: "Завести личный кабинет",
    en: "Create a personal cabinet",
  },
  "workspace.createPersonal.sub": {
    uz: "Tadbirlarga oʻz nomingizdan borish uchun",
    ru: "Чтобы ходить на события от своего имени",
    en: "So you can attend events as yourself",
  },
  "workspace.createPersonal.error": {
    uz: "Kabinet ochilmadi",
    ru: "Не удалось завести кабинет",
    en: "Couldn't create the cabinet",
  },
  "workspace.personal.sub": {
    uz: "Ishtirokchi · afisha va biletlar",
    ru: "Участник · афиша и билеты",
    en: "Attendee · discover & tickets",
  },
  "workspace.orgs": {
    uz: "Tashkilotlar",
    ru: "Организации",
    en: "Organizations",
  },
  "workspace.owner": { uz: "Egasi", ru: "Владелец", en: "Owner" },
  "workspace.empty.title": {
    uz: "Siz hali tashkilotda yoʻqsiz",
    ru: "Вы пока не состоите в организациях",
    en: "You're not in any organizations yet",
  },
  "workspace.empty.body": {
    uz: "Shaxsiy akkaunt tashkilot yarata olmaydi. Taklif xatidagi xavfsiz havola orqali xodim sifatida qoʻshiling.",
    ru: "Личный аккаунт не может создать организацию. Вступите как сотрудник по защищённой ссылке из приглашения.",
    en: "A personal account cannot create an organization. Join as staff through the secure link in your invitation email.",
  },
  "workspace.empty.cta": {
    uz: "Taklifni emailda oching",
    ru: "Откройте приглашение в почте",
    en: "Open your email invitation",
  },
  "workspace.new": {
    uz: "Yangi tashkilot soʻrash",
    ru: "Запросить новую организацию",
    en: "Request a new organization",
  },
  "workspace.entry": {
    uz: "Ish maydonini almashtirish",
    ru: "Сменить пространство",
    en: "Switch workspace",
  },
  "workspace.entry.personal": {
    uz: "Ishtirokchi · shaxsiy akkaunt",
    ru: "Участник · личный аккаунт",
    en: "Attending · personal account",
  },
  "workspace.entry.orgs": {
    uz: "{n} ta tashkilot",
    ru: "Организаций: {n}",
    en: "{n} organizations",
  },

  // ── organizer home (workspace landing) ───────────────────
  "orghome.role": { uz: "Tashkilotchi", ru: "Организатор", en: "Organizer" },
  "orghome.events": {
    uz: "Tadbirlaringiz",
    ru: "Ваши события",
    en: "Your events",
  },
  "orghome.exit": {
    uz: "Shaxsiyga qaytish",
    ru: "Вернуться в личный",
    en: "Switch to personal",
  },
  "orghome.webNote": {
    uz: "Tadbirlarni yaratish va boshqarish hozircha sayt orqali.",
    ru: "Создание и управление событиями — пока в веб-кабинете.",
    en: "Create and manage events in the web workspace for now.",
  },
  "orghome.events.empty.title": {
    uz: "Hali tadbirlar yoʻq",
    ru: "Событий пока нет",
    en: "No events yet",
  },
  "orghome.events.empty.body": {
    uz: "Bu tashkilot hali tadbir eʼlon qilmagan.",
    ru: "Эта организация ещё не опубликовала события.",
    en: "This organization hasn't published any events yet.",
  },
  "orghome.manage": { uz: "Boshqarish", ru: "Управление", en: "Manage" },

  // ── attendees (organizer registration management) ────────
  // ── public-page preview · design 4.5b ────────────────────────────────────
  "org.preview.title": { uz: "Oldindan koʻrish", ru: "Превью", en: "Preview" },
  "org.preview.asGuest": {
    uz: "Mehmonlar shunday koʻradi",
    ru: "Так увидят гости",
    en: "This is what guests see",
  },
  "org.preview.none.title": {
    uz: "Sahifa hali eʼlon qilinmagan",
    ru: "Страницы ещё нет",
    en: "No public page yet",
  },
  "org.preview.none.body": {
    uz: "Ommaviy sahifa tadbir moderatsiyadan oʻtgach paydo boʻladi.",
    ru: "Публичная страница появится после того, как событие пройдёт модерацию.",
    en: "The public page appears once the event passes review.",
  },

  // ── plan / entitlements · design 2.4 ─────────────────────────────────────
  "org.plan.current": {
    uz: "Tarif: {tier}",
    ru: "Тариф: {tier}",
    en: "Plan: {tier}",
  },
  "org.plan.changeOnWeb": {
    uz: "Tarifni veb-kabinetda oʻzgartirish mumkin — mobil ilovada toʻlov yoʻq.",
    ru: "Тариф меняется в веб-кабинете — оплаты в мобильном приложении нет.",
    en: "Plans change in the web workspace — there is no checkout in the app.",
  },
  "org.plan.boards.locked.title": {
    uz: "Doskalar tarifga kirmagan",
    ru: "Досок нет в вашем тарифе",
    en: "Boards aren't in your plan",
  },
  "org.plan.boards.locked.body": {
    uz: "Kanban jamoaning tadbirlar orasidagi ishini bir joyda ushlab turadi: vazifalar, muddatlar, ijrochilar.",
    ru: "Kanban держит работу команды между событиями в одном месте: задачи, дедлайны, исполнители.",
    en: "Kanban keeps the team's between-events work in one place: tasks, deadlines, assignees.",
  },
  "org.plan.credits": {
    uz: "{n} ta eʼlon krediti",
    ru: "{n} кредита публикации",
    en: "{n} publication credits",
  },
  "org.plan.suspended": {
    uz: "Tarif toʻxtatilgan",
    ru: "Тариф приостановлен",
    en: "Plan suspended",
  },

  // ── organization blog · design 4.23 ──────────────────────────────────────
  "org.blog.title": { uz: "Blog", ru: "Блог", en: "Blog" },
  "org.blog.rowHint": {
    uz: "Tadbirlar orasidagi maqolalar",
    ru: "Статьи между событиями",
    en: "Posts between events",
  },
  "org.blog.post": { uz: "Maqola", ru: "Статья", en: "Post" },
  "org.blog.write": {
    uz: "Maqola yozish",
    ru: "Написать статью",
    en: "Write a post",
  },
  "org.blog.draft": { uz: "qoralama", ru: "черновик", en: "draft" },
  "org.blog.savedAt": {
    uz: "qoralama · {time} da saqlandi",
    ru: "черновик · сохранено {time}",
    en: "draft · saved {time}",
  },
  "org.blog.titlePlaceholder": {
    uz: "Maqola sarlavhasi",
    ru: "Заголовок статьи",
    en: "Post title",
  },
  "org.blog.excerptPlaceholder": {
    uz: "Qisqa tavsif — roʻyxatlarda koʻrinadi",
    ru: "Краткое описание — покажется в списках",
    en: "Short summary — shown in listings",
  },
  "org.blog.bodyPlaceholder": {
    uz: "Matnni shu yerga yozing…",
    ru: "Пишите текст здесь…",
    en: "Write here…",
  },
  // The mobile bridge stores ONE paragraph per line — say so, do not let the
  // author assume inline bold survives.
  "org.blog.plainNote": {
    uz: "oddiy matn",
    ru: "простой текст",
    en: "plain text",
  },
  "org.blog.submit": {
    uz: "Moderatsiyaga yuborish",
    ru: "Отправить на модерацию",
    en: "Submit for review",
  },
  "org.blog.submit.title": {
    uz: "Moderatsiyaga yuborilsinmi?",
    ru: "Отправить на модерацию?",
    en: "Submit for review?",
  },
  "org.blog.submit.body": {
    uz: "Maqolani EventFlow jamoasi tekshiradi va tasdiqlangach eʼlon qilinadi.",
    ru: "Статью проверит команда EventFlow и опубликует после одобрения.",
    en: "The EventFlow team reviews the post and publishes it once approved.",
  },
  "org.blog.submitted": {
    uz: "Moderatsiyaga yuborildi",
    ru: "Отправлено на модерацию",
    en: "Sent for review",
  },
  "org.blog.status.DRAFT": { uz: "Qoralama", ru: "Черновик", en: "Draft" },
  "org.blog.status.PENDING_REVIEW": {
    uz: "Moderatsiyada",
    ru: "На модерации",
    en: "In review",
  },
  "org.blog.status.APPROVED": {
    uz: "Tasdiqlangan",
    ru: "Одобрена",
    en: "Approved",
  },
  "org.blog.status.REJECTED": {
    uz: "Rad etilgan",
    ru: "Отклонена",
    en: "Rejected",
  },
  "org.blog.status.PUBLISHED": {
    uz: "Eʼlon qilingan",
    ru: "Опубликована",
    en: "Published",
  },
  "org.blog.empty.title": {
    uz: "Maqolalar yoʻq",
    ru: "Статей пока нет",
    en: "No posts yet",
  },
  "org.blog.empty.body": {
    uz: "Blog tashkilotni tadbirlar orasida ham koʻrsatib turadi.",
    ru: "Блог держит организацию на виду между событиями.",
    en: "A blog keeps the organization visible between events.",
  },
  "org.blog.err.title": {
    uz: "Sarlavha kerak",
    ru: "Нужен заголовок",
    en: "A title is required",
  },
  "org.blog.err.save": {
    uz: "Saqlab boʻlmadi",
    ru: "Не удалось сохранить",
    en: "Couldn't save",
  },
  "org.blog.err.submit": {
    uz: "Yuborib boʻlmadi",
    ru: "Не удалось отправить",
    en: "Couldn't submit",
  },

  // ── kanban board · design 4.20 / 4.20b ───────────────────────────────────
  "org.board.title": { uz: "Doska", ru: "Доска", en: "Board" },
  "org.board.tasksCount": {
    uz: "{n} ta vazifa",
    ru: "задач: {n}",
    en: "{n} tasks",
  },
  "org.board.priority.LOW": { uz: "Past", ru: "Низкий", en: "Low" },
  "org.board.priority.MEDIUM": { uz: "Oʻrta", ru: "Средний", en: "Medium" },
  "org.board.priority.HIGH": { uz: "Yuqori", ru: "Высокий", en: "High" },
  "org.board.priority.URGENT": {
    uz: "Shoshilinch",
    ru: "Срочно",
    en: "Urgent",
  },
  "org.board.assignees": {
    uz: "Ijrochilar",
    ru: "Исполнители",
    en: "Assignees",
  },
  "org.board.moveTo": { uz: "Koʻchirish", ru: "Переместить в", en: "Move to" },
  "org.board.markDone": {
    uz: "Bajarildi deb belgilash",
    ru: "Отметить выполненной",
    en: "Mark as done",
  },
  "org.board.reopen": {
    uz: "Qayta ochish",
    ru: "Вернуть в работу",
    en: "Reopen",
  },
  "org.board.moveError": {
    uz: "Koʻchirib boʻlmadi",
    ru: "Не удалось переместить",
    en: "Couldn't move it",
  },
  "org.board.wip": {
    uz: "WIP limit: {n} — kolonka toʻlgan",
    ru: "WIP limit: {n} — колонка переполнена",
    en: "WIP limit {n} — this column is over",
  },
  "org.board.noColumns.title": {
    uz: "Doskada kolonka yoʻq",
    ru: "На доске нет колонок",
    en: "This board has no columns",
  },
  "org.board.noColumns.body": {
    uz: "Kolonkalarni veb-kabinetda qoʻshing.",
    ru: "Добавьте колонки в веб-кабинете.",
    en: "Add columns in the web workspace.",
  },
  "org.board.emptyColumn.title": {
    uz: "Bu yerda boʻsh",
    ru: "Здесь пусто",
    en: "Nothing here",
  },
  "org.board.emptyColumn.body": {
    uz: "«{name}» kolonkasida vazifa yoʻq.",
    ru: "В колонке «{name}» нет задач.",
    en: "No tasks in “{name}”.",
  },
  "org.boards.title": { uz: "Doskalar", ru: "Доски", en: "Boards" },
  "org.boards.rowHint": {
    uz: "Vazifalar va kanban",
    ru: "Задачи и kanban",
    en: "Tasks and kanban",
  },
  "org.boards.empty.title": {
    uz: "Doskalar yoʻq",
    ru: "Досок пока нет",
    en: "No boards yet",
  },
  "org.boards.empty.body": {
    uz: "Doskani veb-kabinetda yarating — bu yerda ochiladi.",
    ru: "Создайте доску в веб-кабинете — здесь она откроется.",
    en: "Create a board in the web workspace — it opens here.",
  },

  // ── event certificates · design 4.15 / 4.15b ─────────────────────────────
  "org.certs.title": {
    uz: "Sertifikatlar",
    ru: "Сертификаты",
    en: "Certificates",
  },
  "org.certs.issue": { uz: "Berish", ru: "Выдать", en: "Issue" },
  "org.certs.issued": { uz: "berilgan", ru: "выдано", en: "issued" },
  "org.certs.downloadsLabel": {
    uz: "yuklab olishlar",
    ru: "скачиваний",
    en: "downloads",
  },
  "org.certs.staleLabel": { uz: "eskirgan", ru: "устарело", en: "outdated" },
  "org.certs.downloads": {
    uz: "{n} ta yuklab olish",
    ru: "{n} скачиваний",
    en: "{n} downloads",
  },
  "org.certs.ready": { uz: "Tayyor", ru: "Готов", en: "Ready" },
  "org.certs.pending": { uz: "Navbatda", ru: "В очереди", en: "Queued" },
  "org.certs.stale": {
    uz: "Shablon oʻzgargan",
    ru: "Шаблон изменён",
    en: "Template changed",
  },
  "org.certs.search": {
    uz: "Ism yoki email",
    ru: "Имя или email",
    en: "Name or email",
  },
  "org.certs.running": {
    uz: "Generatsiya ketyapti",
    ru: "Генерация идёт",
    en: "Generating",
  },
  "org.certs.done": {
    uz: "{n} ta sertifikat tayyor",
    ru: "Готово сертификатов: {n}",
    en: "{n} certificates ready",
  },
  "org.certs.error": {
    uz: "Generatsiya boshlanmadi",
    ru: "Не удалось запустить генерацию",
    en: "Couldn't start generation",
  },
  "org.certs.openError": {
    uz: "Faylni ochib boʻlmadi",
    ru: "Не удалось открыть файл",
    en: "Couldn't open the file",
  },
  "org.certs.templates": { uz: "shablon", ru: "шаблонов", en: "templates" },
  "org.certs.empty.title": {
    uz: "Sertifikatlar hali berilmagan",
    ru: "Сертификаты ещё не выдавались",
    en: "No certificates issued yet",
  },
  "org.certs.empty.body": {
    uz: "Kelganlarga sertifikat bering — har biri pochta orqali yuboriladi.",
    ru: "Выдайте сертификаты пришедшим — каждый уйдёт получателю на почту.",
    en: "Issue certificates to attendees — each one is emailed to its recipient.",
  },
  "org.certs.empty.search": {
    uz: "Hech kim topilmadi",
    ru: "Никого не нашлось",
    en: "Nobody found",
  },
  "org.certs.empty.searchBody": {
    uz: "Boshqa ism yoki email kiriting.",
    ru: "Попробуйте другое имя или email.",
    en: "Try a different name or email.",
  },
  "org.certs.confirm.title": {
    uz: "Generatsiyadan oldin",
    ru: "Перед генерацией",
    en: "Before generating",
  },
  "org.certs.confirm.body": {
    uz: "Kim sertifikat olishini server hal qiladi: kelganlar va shabloni bor rollar. Generatsiya fonda ketadi.",
    ru: "Кто получит сертификат, решает сервер: пришедшие и роли, у которых есть шаблон. Генерация идёт в фоне.",
    en: "The server decides who gets one: attendees, and roles that have a template. Generation runs in the background.",
  },
  "org.certs.noTemplate": {
    uz: "Bu tadbirda shablon yoʻq — avval uni veb-kabinetda yarating.",
    ru: "У события нет шаблона — создайте его в веб-кабинете.",
    en: "This event has no template — create one in the web workspace.",
  },
  "org.certs.generateMissing": {
    uz: "Yetishmayotganlarini yaratish",
    ru: "Создать недостающие",
    en: "Generate the missing ones",
  },
  "org.certs.regenerateAll": {
    uz: "Hammasini qayta yaratish",
    ru: "Перегенерировать все",
    en: "Regenerate all",
  },

  // ── attendance · design 4.10 ─────────────────────────────────────────────
  "org.attendance.title": {
    uz: "Davomat",
    ru: "Посещаемость",
    en: "Attendance",
  },
  "org.attendance.registered": {
    uz: "roʻyxatda",
    ru: "зарегистр.",
    en: "registered",
  },
  "org.attendance.checkedIn": {
    uz: "belgilangan",
    ru: "отмечено",
    en: "checked in",
  },
  "org.attendance.rate": { uz: "davomat", ru: "посещаемость", en: "turnout" },
  "org.attendance.allDays": {
    uz: "Barcha kunlar",
    ru: "Все дни",
    en: "All days",
  },
  "org.attendance.markManually": {
    uz: "Qoʻlda belgilash",
    ru: "Отметить вручную",
    en: "Mark manually",
  },
  "org.attendance.empty.title": {
    uz: "Hali hech kim belgilanmagan",
    ru: "Пока никто не отмечен",
    en: "Nobody checked in yet",
  },
  "org.attendance.empty.body": {
    uz: "Bilet QR kodini skanerlang yoki kodni qoʻlda kiriting.",
    ru: "Отсканируйте QR билета или введите код вручную.",
    en: "Scan a ticket QR, or enter the code manually.",
  },
  // The API stores a check-in, not a status — do not let the list read as a
  // full attendance verdict.
  "org.attendance.note": {
    uz: "Roʻyxatda faqat kirish belgilari koʻrsatilgan: kim va qachon kelgani.",
    ru: "В списке — только отметки о приходе: кто и когда пришёл.",
    en: "The list shows check-ins only — who arrived and when.",
  },

  // ── participants · design 4.8 (cards, selection, person sheet) ──
  "attendees.selected": {
    uz: "{n} ta tanlandi",
    ru: "Выбрано: {n}",
    en: "{n} selected",
  },
  "attendees.bulkReject.message": {
    uz: "{n} ta arizani rad etasizmi? Buni ortga qaytarib boʻlmaydi.",
    ru: "Отклонить {n} заявок? Отменить это будет нельзя.",
    en: "Reject {n} requests? This can't be undone.",
  },
  "attendees.sheet.email": { uz: "Email", ru: "Email", en: "Email" },
  "attendees.sheet.phone": { uz: "Telefon", ru: "Телефон", en: "Phone" },
  "attendees.sheet.registered": {
    uz: "Roʻyxatdan oʻtgan",
    ru: "Регистрация",
    en: "Registered",
  },
  "attendees.sheet.ticket": {
    uz: "Bilet kodi",
    ru: "Код билета",
    en: "Ticket code",
  },

  "attendees.title": { uz: "Ishtirokchilar", ru: "Участники", en: "Attendees" },
  "attendees.count": { uz: "Jami {n}", ru: "Всего {n}", en: "{n} total" },
  "attendees.search": {
    uz: "Ism yoki email boʻyicha",
    ru: "Поиск по имени или email",
    en: "Search by name or email",
  },
  "attendees.tab.pending": {
    uz: "Kutilmoqda",
    ru: "На рассмотрении",
    en: "Pending",
  },
  "attendees.tab.approved": {
    uz: "Tasdiqlangan",
    ru: "Одобрены",
    en: "Approved",
  },
  "attendees.tab.rejected": {
    uz: "Rad etilgan",
    ru: "Отклонены",
    en: "Rejected",
  },
  "attendees.tab.all": { uz: "Barchasi", ru: "Все", en: "All" },
  "attendees.approve": { uz: "Tasdiqlash", ru: "Одобрить", en: "Approve" },
  "attendees.reject": { uz: "Rad etish", ru: "Отклонить", en: "Reject" },
  "attendees.approveAll": {
    uz: "Barchasini tasdiqlash ({n})",
    ru: "Одобрить всех ({n})",
    en: "Approve all ({n})",
  },
  "attendees.empty.title": {
    uz: "Ishtirokchilar yoʻq",
    ru: "Участников нет",
    en: "No attendees",
  },
  "attendees.empty.pending": {
    uz: "Kutilayotgan arizalar yoʻq.",
    ru: "Нет заявок на рассмотрении.",
    en: "No pending registrations.",
  },
  "attendees.empty.body": {
    uz: "Bu filtrga mos ishtirokchi yoʻq.",
    ru: "Под этот фильтр никто не подходит.",
    en: "No one matches this filter.",
  },
  "attendees.reject.title": {
    uz: "Arizani rad etasizmi?",
    ru: "Отклонить заявку?",
    en: "Reject registration?",
  },
  "attendees.reject.message": {
    uz: "Ishtirokchi xabardor qilinadi. Buni qaytarib boʻlmaydi.",
    ru: "Участник получит уведомление. Это нельзя отменить.",
    en: "They'll be notified. This can't be undone.",
  },
  "attendees.status.PENDING": {
    uz: "Kutilmoqda",
    ru: "На рассмотрении",
    en: "Pending",
  },
  "attendees.status.APPROVED": {
    uz: "Tasdiqlangan",
    ru: "Одобрен",
    en: "Approved",
  },
  "attendees.status.REJECTED": {
    uz: "Rad etilgan",
    ru: "Отклонён",
    en: "Rejected",
  },
  "attendees.status.CANCELLED": {
    uz: "Bekor qilingan",
    ru: "Отменён",
    en: "Cancelled",
  },
  "attendees.scan": {
    uz: "Biletlarni skanerlash",
    ru: "Сканировать билеты",
    en: "Scan tickets",
  },

  // ── door check-in (scanner) ──────────────────────────────
  "scan.title": {
    uz: "Kirishda roʻyxat",
    ru: "Регистрация на входе",
    en: "Door check-in",
  },
  "scan.hint": {
    uz: "Mehmonning QR-kodiga qarating",
    ru: "Наведите на QR-код гостя",
    en: "Point at the guest's QR code",
  },
  "scan.hint2": {
    uz: "Ushlab turing — avtomatik skanerlanadi",
    ru: "Держите ровно — сканируется автоматически",
    en: "Hold steady, it scans automatically",
  },
  "scan.manual": {
    uz: "Qoʻlda kiritish",
    ru: "Ввести вручную",
    en: "Enter manually",
  },
  "scan.useCamera": {
    uz: "Kameradan foydalanish",
    ru: "Использовать камеру",
    en: "Use camera",
  },
  "scan.codeLabel": { uz: "Bilet kodi", ru: "Код билета", en: "Ticket code" },
  "scan.codePlaceholder": {
    uz: "QR koddan kod",
    ru: "Код из QR",
    en: "Code from the QR",
  },
  "scan.checkIn": { uz: "Roʻyxatga olish", ru: "Отметить", en: "Check in" },
  "scan.permission.title": {
    uz: "Kameraga ruxsat kerak",
    ru: "Нужен доступ к камере",
    en: "Camera access needed",
  },
  "scan.permission.body": {
    uz: "Biletlarni skanerlash uchun kameraga ruxsat bering yoki kodni qoʻlda kiriting.",
    ru: "Разрешите камеру для сканирования билетов или введите код вручную.",
    en: "Allow the camera to scan tickets, or enter the code manually.",
  },
  "scan.permission.grant": {
    uz: "Kameraga ruxsat",
    ru: "Разрешить камеру",
    en: "Allow camera",
  },
  "scan.result.valid": {
    uz: "Toʻgʻri · roʻyxatga olindi",
    ru: "Верно · отмечен",
    en: "Valid · checked in",
  },
  "scan.result.already": {
    uz: "Allaqachon roʻyxatda",
    ru: "Уже отмечен",
    en: "Already checked in",
  },
  "scan.result.alreadyAt": {
    uz: "{time} da roʻyxatga olingan",
    ru: "Отмечен в {time}",
    en: "Checked in at {time}",
  },
  "scan.result.notfound": {
    uz: "Bilet topilmadi",
    ru: "Билет не найден",
    en: "Ticket not found",
  },
  "scan.result.error": {
    uz: "Roʻyxatga olib boʻlmadi",
    ru: "Не удалось отметить",
    en: "Couldn't check in",
  },
  "scan.next": {
    uz: "Keyingi mehmon",
    ru: "Следующий гость",
    en: "Scan next guest",
  },
  "scan.checkedIn": {
    uz: "roʻyxatga olindi",
    ru: "отмечено",
    en: "checked in",
  },

  // ── region picker ────────────────────────────────────────
  "region.title": {
    uz: "Hududni tanlang",
    ru: "Выберите регион",
    en: "Choose a region",
  },

  // ── search ───────────────────────────────────────────────
  "search.idle.title": {
    uz: "Tadbir qidiring",
    ru: "Найдите событие",
    en: "Search events",
  },
  "search.idle.body": {
    uz: "Nomi yoki joyi boʻyicha qidiring — kamida 2 ta belgi.",
    ru: "Ищите по названию или площадке — минимум 2 символа.",
    en: "Search by name or venue, at least 2 characters.",
  },
  "search.empty.title": {
    uz: "Hech narsa topilmadi",
    ru: "Ничего не найдено",
    en: "Nothing found",
  },
  "search.empty.body": {
    uz: "«{q}» boʻyicha natija yoʻq. Boshqacha soʻrab koʻring.",
    ru: "По запросу «{q}» ничего нет. Попробуйте иначе.",
    en: "No results for “{q}”. Try a different search.",
  },

  // ── filters ──────────────────────────────────────────────
  "filters.title": { uz: "Filtrlar", ru: "Фильтры", en: "Filters" },
  "filters.type": { uz: "Tur", ru: "Тип", en: "Type" },
  "filters.format": { uz: "Format", ru: "Формат", en: "Format" },
  "filters.free": { uz: "Bepul", ru: "Бесплатные", en: "Free" },
  "filters.paid": { uz: "Pullik", ru: "Платные", en: "Paid" },
  "filters.reset": { uz: "Tozalash", ru: "Сбросить", en: "Reset" },
  "filters.apply": { uz: "Qoʻllash", ru: "Применить", en: "Apply" },

  // ── home / discover ──────────────────────────────────────
  "home.title": {
    uz: "Bugun kechqurun",
    ru: "Сегодня вечером",
    en: "On tonight",
  },
  // Used when nothing actually starts today — "On tonight" over a feed whose
  // nearest event is weeks away is simply untrue.
  "home.titleAhead": { uz: "Nimalar bor", ru: "Что впереди", en: "What's on" },
  "home.sub": {
    uz: "{city} · shu hafta yaqiningizdagi tadbirlar",
    ru: "{city} · события рядом на этой неделе",
    en: "{city} · events near you this week",
  },
  "home.searchPlaceholder": {
    uz: "Tadbir, joy qidirish…",
    ru: "Поиск событий, площадок…",
    en: "Search events, venues…",
  },
  "home.featured": { uz: "Tanlangan", ru: "Избранное", en: "Featured" },
  "home.upcoming": { uz: "Yaqin kunlarda", ru: "Скоро", en: "Upcoming" },

  // ── event detail ─────────────────────────────────────────
  "detail.tab.about": { uz: "Haqida", ru: "О событии", en: "About" },
  "detail.tab.speakers": { uz: "Spikerlar", ru: "Спикеры", en: "Speakers" },
  "detail.tab.programme": { uz: "Dastur", ru: "Программа", en: "Programme" },
  "detail.tab.venue": { uz: "Manzil", ru: "Место", en: "Venue" },
  "detail.tab.materials": {
    uz: "Materiallar",
    ru: "Материалы",
    en: "Materials",
  },
  "detail.tab.comments": { uz: "Izohlar", ru: "Комментарии", en: "Comments" },
  "detail.pctFull": {
    uz: "{pct}% toʻldi",
    ru: "{pct}% заполнено",
    en: "{pct}% full",
  },
  "detail.organizedBy": {
    uz: "Tashkilotchi",
    ru: "Организатор",
    en: "Organized by",
  },
  "detail.dateTime": {
    uz: "Sana va vaqt",
    ru: "Дата и время",
    en: "Date & time",
  },
  "detail.venue": { uz: "Manzil", ru: "Место", en: "Venue" },
  "detail.ticketsFrom": {
    uz: "Biletlar narxi",
    ru: "Билеты от",
    en: "Tickets from",
  },
  "detail.aboutEmpty": {
    uz: "Tavsif tez orada qoʻshiladi.",
    ru: "Описание скоро появится.",
    en: "Full description coming soon.",
  },
  "detail.format.OFFLINE": { uz: "Oflayn", ru: "Офлайн", en: "In person" },
  "detail.format.ONLINE": { uz: "Onlayn", ru: "Онлайн", en: "Online" },
  "detail.format.HYBRID": { uz: "Gibrid", ru: "Гибрид", en: "Hybrid" },
  "detail.onlineEvent": {
    uz: "Onlayn tadbir",
    ru: "Онлайн-событие",
    en: "Online event",
  },
  "detail.joinLink": {
    uz: "Havola orqali qoʻshilish",
    ru: "Присоединиться по ссылке",
    en: "Join via link",
  },
  "detail.online.hasLink": {
    uz: "Tadbir onlayn oʻtadi — qoʻshilish uchun havoladan foydalaning.",
    ru: "Событие проходит онлайн — подключайтесь по ссылке.",
    en: "This event runs online — join with the link below.",
  },
  "detail.online.linkAfterRegister": {
    uz: "Tadbir onlayn oʻtadi. Qoʻshilish havolasi roʻyxatdan oʻtganingizdan soʻng shu yerda va pochtangizda paydo boʻladi.",
    ru: "Событие проходит онлайн. Ссылка появится здесь и придёт на почту после регистрации.",
    en: "This event runs online. The join link appears here and arrives by email once you register.",
  },
  "detail.speakersEmpty": {
    uz: "Ishtirokchilar tez orada eʼlon qilinadi.",
    ru: "Спикеры будут объявлены.",
    en: "Speaker line-up to be announced.",
  },
  "detail.programmeEmpty": {
    uz: "Dastur tez orada eʼlon qilinadi.",
    ru: "Программа скоро будет опубликована.",
    en: "Detailed programme coming soon.",
  },
  "detail.venueTbd": {
    uz: "Manzil aniqlanmoqda.",
    ru: "Место уточняется.",
    en: "Location to be confirmed.",
  },
  "detail.materialsEmpty": {
    uz: "Materiallar hali yoʻq.",
    ru: "Материалов пока нет.",
    en: "No materials yet.",
  },
  "detail.materialsAfterReg": {
    uz: "Materiallar roʻyxatdan oʻtgach paydo boʻladi.",
    ru: "Материалы появятся после регистрации.",
    en: "Materials appear here after you register.",
  },
  "detail.commentsEmpty": {
    uz: "Hozircha izohlar yoʻq.",
    ru: "Пока нет комментариев.",
    en: "No comments yet.",
  },
  "detail.commentsSignIn": {
    uz: "Izoh qoldirish uchun kiring.",
    ru: "Войдите, чтобы комментировать.",
    en: "Sign in to comment.",
  },
  "detail.commentPlaceholder": {
    uz: "Izoh yozing…",
    ru: "Написать комментарий…",
    en: "Write a comment…",
  },
  "detail.commentSend": { uz: "Yuborish", ru: "Отправить", en: "Send" },

  // ── comments (enterprise section) ────────────────────────
  "comments.empty.title": {
    uz: "Hozircha izohlar yoʻq",
    ru: "Пока нет комментариев",
    en: "No comments yet",
  },
  "comments.empty.body": {
    uz: "Birinchi boʻlib fikr bildiring.",
    ru: "Будьте первым, кто оставит отзыв.",
    en: "Be the first to share your thoughts.",
  },
  "comments.signInBody": {
    uz: "Izoh yozish va yoqtirish uchun tizimga kiring.",
    ru: "Войдите, чтобы комментировать и ставить лайки.",
    en: "Sign in to comment and react.",
  },
  "comments.reply": { uz: "Javob", ru: "Ответить", en: "Reply" },
  "comments.replyingTo": {
    uz: "{name} ga javob",
    ru: "Ответ: {name}",
    en: "Replying to {name}",
  },
  "comments.replyPlaceholder": {
    uz: "Javobingizni yozing…",
    ru: "Написать ответ…",
    en: "Write a reply…",
  },
  "comments.organizer": {
    uz: "Tashkilotchi",
    ru: "Организатор",
    en: "Organizer",
  },
  "comments.hideReplies": {
    uz: "Javoblarni yashirish",
    ru: "Скрыть ответы",
    en: "Hide replies",
  },
  "comments.loadMore": {
    uz: "Yana izohlar",
    ru: "Показать ещё",
    en: "Show more",
  },
  "comments.you": { uz: "Siz", ru: "Вы", en: "You" },
  "comments.like": { uz: "Yoqtirish", ru: "Нравится", en: "Like" },
  "comments.postError": {
    uz: "Izohni yuborib boʻlmadi. Qayta urinib koʻring.",
    ru: "Не удалось отправить комментарий. Попробуйте снова.",
    en: "Couldn't post your comment. Try again.",
  },
  "comments.time.now": { uz: "hozir", ru: "только что", en: "just now" },
  "comments.time.min": { uz: "{n} daq", ru: "{n} мин", en: "{n}m" },
  "comments.time.hour": { uz: "{n} soat", ru: "{n} ч", en: "{n}h" },
  "comments.time.day": { uz: "{n} kun", ru: "{n} дн", en: "{n}d" },
  "detail.registered": {
    uz: "Siz borasiz",
    ru: "Вы идёте",
    en: "You're going",
  },
  "detail.soldOut": {
    uz: "Joylar tugadi",
    ru: "Мест нет",
    en: "All seats taken",
  },
  "detail.registrationClosed": {
    uz: "Roʻyxat yopilgan",
    ru: "Регистрация закрыта",
    en: "Registration closed",
  },
  "detail.registrationUnavailable": {
    uz: "Roʻyxat mavjud emas",
    ru: "Регистрация недоступна",
    en: "Registration unavailable",
  },
  "detail.eventEnded": {
    uz: "Tadbir tugadi",
    ru: "Событие завершено",
    en: "Event ended",
  },
  "detail.ticketsOnWeb": {
    uz: "Biletlar saytda",
    ru: "Билеты на сайте",
    en: "Tickets on web",
  },
  "detail.ticketConfirmed": {
    uz: "Bilet tasdiqlandi",
    ru: "Билет подтверждён",
    en: "Ticket confirmed",
  },
  "detail.alreadyRegistered": {
    uz: "Siz allaqachon roʻyxatdan oʻtgansiz",
    ru: "Вы уже зарегистрированы",
    en: "You're already registered",
  },
  "detail.pending": {
    uz: "Koʻrib chiqilmoqda",
    ru: "На рассмотрении",
    en: "Pending",
  },
  "detail.registrationPending": {
    uz: "Soʻrovingiz yuborildi",
    ru: "Заявка отправлена",
    en: "Registration received",
  },
  "detail.registrationPendingBody": {
    uz: "Tashkilotchi tasdiqlagach, sizga xabar beramiz.",
    ru: "Сообщим, когда организатор подтвердит.",
    en: "We'll let you know once the organizer approves it.",
  },
  "detail.register.failed": {
    uz: "Roʻyxatdan oʻtib boʻlmadi. Qayta urinib koʻring.",
    ru: "Не удалось зарегистрироваться. Попробуйте снова.",
    en: "Couldn't register. Please try again.",
  },
  "detail.register.offline": {
    uz: "Internet yoʻq. Ulanishni tekshirib, qayta urinib koʻring.",
    ru: "Нет соединения. Проверьте интернет и попробуйте снова.",
    en: "No connection. Check your internet and try again.",
  },
  "detail.notFound": {
    uz: "Bu tadbir mavjud emas",
    ru: "Событие недоступно",
    en: "This event isn't available",
  },
  "detail.notFoundBody": {
    uz: "U koʻchirilgan yoki oʻchirilgan boʻlishi mumkin.",
    ru: "Возможно, оно перенесено или удалено организатором.",
    en: "It may have been moved or taken down by the organizer.",
  },
  "detail.backToDiscover": {
    uz: "Afishaga qaytish",
    ru: "Назад к событиям",
    en: "Back to Discover",
  },

  // ── organizer ────────────────────────────────────────────
  "common.following": {
    uz: "Kuzatilmoqda",
    ru: "Вы подписаны",
    en: "Following",
  },
  "org.followers.label": {
    uz: "Obunachilar",
    ru: "Подписчики",
    en: "Followers",
  },
  "org.eventsCount.label": { uz: "Tadbirlar", ru: "События", en: "Events" },
  "org.verified": { uz: "Tasdiqlangan", ru: "Подтверждён", en: "Verified" },
  "org.about.title": {
    uz: "Tashkilotchi haqida",
    ru: "Об организаторе",
    en: "About",
  },
  "org.events.title": { uz: "Tadbirlar", ru: "События", en: "Events" },
  "org.tab.upcoming": { uz: "Kelgusi", ru: "Предстоящие", en: "Upcoming" },
  "org.tab.past": { uz: "Oʻtgan", ru: "Прошедшие", en: "Past" },
  "org.empty.upcoming": {
    uz: "Kelgusi tadbirlar yoʻq",
    ru: "Нет предстоящих событий",
    en: "No upcoming events",
  },
  "org.empty.past": {
    uz: "Oʻtgan tadbirlar yoʻq",
    ru: "Нет прошедших событий",
    en: "No past events",
  },
  "org.empty.body": {
    uz: "Bu tashkilotchida hozircha tadbir yoʻq.",
    ru: "У этого организатора пока нет событий.",
    en: "This organizer has no events yet.",
  },
  "org.notFound.title": {
    uz: "Tashkilotchi topilmadi",
    ru: "Организатор не найден",
    en: "Organizer not found",
  },
  "org.notFound.body": {
    uz: "Bu sahifa oʻchirilgan yoki mavjud emas.",
    ru: "Эта страница удалена или не существует.",
    en: "This page was removed or doesn't exist.",
  },

  // ── ticket ───────────────────────────────────────────────
  "ticket.title": { uz: "Bilet", ru: "Билет", en: "Ticket" },
  "ticket.admitOne": { uz: "Bir kishiga", ru: "На одного", en: "Admit one" },
  "ticket.scanAtDoor": {
    uz: "Kirishda skanerlang",
    ru: "Покажите на входе",
    en: "Scan at the door",
  },
  "ticket.field.name": { uz: "Ism", ru: "Имя", en: "Name" },
  "ticket.field.type": { uz: "Tur", ru: "Тип", en: "Type" },
  "ticket.field.doors": { uz: "Eshiklar", ru: "Двери", en: "Doors" },
  "ticket.standard": { uz: "Standart", ru: "Стандарт", en: "Standard" },
  "ticket.cancel": {
    uz: "Roʻyxatni bekor qilish",
    ru: "Отменить регистрацию",
    en: "Cancel registration",
  },

  // ── tickets list ─────────────────────────────────────────
  "tickets.title": {
    uz: "Sizning biletlaringiz",
    ru: "Ваши билеты",
    en: "Your tickets",
  },
  "tickets.upcoming": { uz: "Yaqin", ru: "Предстоящие", en: "Upcoming" },
  "tickets.past": { uz: "Oʻtgan", ru: "Прошедшие", en: "Past" },
  "tickets.confirmed": {
    uz: "Tasdiqlangan",
    ru: "Подтверждён",
    en: "Confirmed",
  },
  "tickets.scan": { uz: "SKAN", ru: "СКАН", en: "SCAN" },

  // ── profile / placeholders ───────────────────────────────
  "profile.title": { uz: "Profil", ru: "Профиль", en: "Profile" },
  "profile.language": { uz: "Til", ru: "Язык", en: "Language" },

  // ── common (added) ───────────────────────────────────────
  "common.signIn": { uz: "Kirish", ru: "Войти", en: "Sign in" },
  "common.cancel": { uz: "Bekor qilish", ru: "Отмена", en: "Cancel" },
  // Splash headline (design "B · Афиша"). The trailing period is coloured ember
  // by the screen, so it is not part of the string.
  "splash.headline": {
    uz: "Uydan chiqishga arziydigan tadbirlar",
    ru: "События, ради которых стоит выйти из дома",
    en: "Events worth leaving the house for",
  },
  "common.save": { uz: "Saqlash", ru: "Сохранить", en: "Save" },
  "common.edit": { uz: "Tahrirlash", ru: "Изменить", en: "Edit" },
  "common.delete": { uz: "Oʻchirish", ru: "Удалить", en: "Delete" },
  "profile.edit": {
    uz: "Profilni tahrirlash",
    ru: "Редактировать профиль",
    en: "Edit profile",
  },
  "profile.edit.title": { uz: "Profil", ru: "Профиль", en: "Profile" },
  "profile.edit.firstName": { uz: "Ism", ru: "Имя", en: "First name" },
  "profile.edit.lastName": { uz: "Familiya", ru: "Фамилия", en: "Last name" },
  "profile.edit.photoAdd": {
    uz: "Rasm qoʻshish",
    ru: "Добавить фото",
    en: "Add photo",
  },
  "profile.edit.photoChange": {
    uz: "Rasmni almashtirish",
    ru: "Заменить фото",
    en: "Change photo",
  },
  "profile.edit.photoRemove": {
    uz: "Rasmni oʻchirish",
    ru: "Удалить фото",
    en: "Remove photo",
  },
  "profile.edit.photoRemoveMsg": {
    uz: "Profil rasmi oʻchiriladi — oʻrniga bosh harflaringiz koʻrsatiladi.",
    ru: "Фото профиля будет удалено — вместо него покажем ваши инициалы.",
    en: "Your profile photo will be removed — your initials show instead.",
  },
  "profile.edit.photoPermission": {
    uz: "Rasm tanlash uchun galereyaga ruxsat kerak.",
    ru: "Чтобы выбрать фото, нужен доступ к галерее.",
    en: "Photo library access is needed to pick a picture.",
  },
  "profile.edit.photoSaved": {
    uz: "Rasm yangilandi",
    ru: "Фото обновлено",
    en: "Photo updated",
  },
  "profile.edit.saved": {
    uz: "Profil saqlandi",
    ru: "Профиль сохранён",
    en: "Profile saved",
  },
  "profile.edit.error": {
    uz: "Profilni saqlab boʻlmadi. Qaytadan urinib koʻring.",
    ru: "Не удалось сохранить профиль. Попробуйте ещё раз.",
    en: "Couldn't save your profile. Try again.",
  },
  "profile.edit.emailNote": {
    uz: "Kirish uchun email: {email}. Uni oʻzgartirish qoʻllab-quvvatlanmaydi — support@eventflow.uz ga yozing.",
    ru: "Email для входа: {email}. Его смена пока не поддерживается — напишите на support@eventflow.uz.",
    en: "You sign in with {email}. Changing it isn't supported yet — write to support@eventflow.uz.",
  },
  "common.close": { uz: "Yopish", ru: "Закрыть", en: "Close" },
  "common.download": { uz: "Yuklab olish", ru: "Скачать", en: "Download" },

  // ── auth guard ───────────────────────────────────────────
  "auth.required.title": {
    uz: "Kirish talab qilinadi",
    ru: "Нужен вход",
    en: "Sign in required",
  },
  "auth.required.body": {
    uz: "Bu boʻlimni koʻrish uchun tizimga kiring.",
    ru: "Войдите, чтобы открыть этот раздел.",
    en: "Sign in to view this section.",
  },

  // ── tickets list (live) ──────────────────────────────────
  "tickets.empty.title": {
    uz: "Hali biletlar yoʻq",
    ru: "Билетов пока нет",
    en: "No tickets yet",
  },
  "tickets.empty.body": {
    uz: "Tadbirga roʻyxatdan oʻting — biletlaringiz shu yerda paydo boʻladi.",
    ru: "Зарегистрируйтесь на событие — билеты появятся здесь.",
    en: "Register for an event and your tickets show up here.",
  },
  "tickets.empty.past": {
    uz: "Oʻtgan biletlar yoʻq",
    ru: "Прошедших билетов нет",
    en: "No past tickets",
  },
  "tickets.explore": {
    uz: "Tadbirlarni koʻrish",
    ru: "Смотреть события",
    en: "Explore events",
  },
  "tickets.status.PENDING": {
    uz: "Tasdiqlanmoqda",
    ru: "На рассмотрении",
    en: "Pending",
  },
  "tickets.status.APPROVED": {
    uz: "Tasdiqlangan",
    ru: "Подтверждён",
    en: "Confirmed",
  },
  "tickets.status.ATTENDED": {
    uz: "Tashrif buyurildi",
    ru: "Посещено",
    en: "Attended",
  },
  "tickets.status.CANCELLED": {
    uz: "Bekor qilingan",
    ru: "Отменён",
    en: "Cancelled",
  },
  "tickets.status.REJECTED": {
    uz: "Rad etilgan",
    ru: "Отклонён",
    en: "Rejected",
  },

  // ── ticket detail (live) ─────────────────────────────────
  "ticket.share": { uz: "Ulashish", ru: "Поделиться", en: "Share" },
  "ticket.field.status": { uz: "Holat", ru: "Статус", en: "Status" },
  "ticket.qrPending": {
    uz: "QR tasdiqlangach paydo boʻladi",
    ru: "QR появится после подтверждения",
    en: "Your QR appears once approved",
  },
  "ticket.qrError": {
    uz: "QR-kodni yuklab boʻlmadi.",
    ru: "Не удалось загрузить QR-код.",
    en: "Couldn't load your QR code.",
  },
  "ticket.cancel.title": {
    uz: "Roʻyxatni bekor qilasizmi?",
    ru: "Отменить регистрацию?",
    en: "Cancel registration?",
  },
  "ticket.cancel.message": {
    uz: "Buni qaytarib boʻlmaydi — joyingiz boʻshaydi.",
    ru: "Это действие необратимо — место освободится.",
    en: "This can't be undone. Your spot will be released.",
  },
  "ticket.cancel.confirm": {
    uz: "Ha, bekor qilish",
    ru: "Да, отменить",
    en: "Yes, cancel",
  },
  "ticket.cancel.keep": { uz: "Saqlab qolish", ru: "Оставить", en: "Keep it" },
  "ticket.cancel.error": {
    uz: "Bekor qilib boʻlmadi. Qayta urinib koʻring.",
    ru: "Не удалось отменить. Попробуйте снова.",
    en: "Couldn't cancel. Please try again.",
  },
  "ticket.cancelled.note": {
    uz: "Bu roʻyxat bekor qilingan.",
    ru: "Эта регистрация отменена.",
    en: "This registration was cancelled.",
  },
  "ticket.notFound.title": {
    uz: "Bilet topilmadi",
    ru: "Билет не найден",
    en: "Ticket not found",
  },
  "ticket.notFound.body": {
    uz: "Bu bilet mavjud emas yoki sizga tegishli emas.",
    ru: "Этого билета нет или он вам не принадлежит.",
    en: "This ticket doesn't exist or isn't yours.",
  },

  // ── certificates (live) ──────────────────────────────────
  "certs.stats.total": {
    uz: "Sertifikatlar",
    ru: "Сертификаты",
    en: "Certificates",
  },
  "certs.stats.hours": {
    uz: "Oʻquv soatlari",
    ru: "Учебные часы",
    en: "Training hours",
  },
  "certs.stats.verified": {
    uz: "Tasdiqlangan",
    ru: "Подтверждены",
    en: "Verified",
  },
  "certs.empty.title": {
    uz: "Hali sertifikatlar yoʻq",
    ru: "Сертификатов пока нет",
    en: "No certificates yet",
  },
  "certs.empty.body": {
    uz: "Tadbirlarda qatnashing — sertifikatlaringiz shu yerda saqlanadi.",
    ru: "Посещайте события — сертификаты появятся здесь.",
    en: "Attend events and your certificates will live here.",
  },
  "certs.verifyCode": {
    uz: "Tekshiruv kodi",
    ru: "Код проверки",
    en: "Verification code",
  },
  "certs.issued": { uz: "Berilgan", ru: "Выдан", en: "Issued" },

  // ── profile (live) ───────────────────────────────────────
  "profile.stats.events": { uz: "Tadbirlar", ru: "События", en: "Events" },
  "profile.stats.attended": {
    uz: "Tashriflar",
    ru: "Посещено",
    en: "Attended",
  },
  "profile.stats.certs": {
    uz: "Sertifikatlar",
    ru: "Сертификаты",
    en: "Certificates",
  },
  "profile.account": { uz: "Akkaunt", ru: "Аккаунт", en: "Account" },
  "profile.preferences": {
    uz: "Sozlamalar",
    ru: "Настройки",
    en: "Preferences",
  },
  "profile.support": { uz: "Yordam", ru: "Поддержка", en: "Support" },
  "profile.help": {
    uz: "Yordam va qoʻllab-quvvatlash",
    ru: "Помощь и поддержка",
    en: "Help & support",
  },
  "profile.terms": {
    uz: "Shartlar va maxfiylik",
    ru: "Условия и конфиденциальность",
    en: "Terms & privacy",
  },
  "profile.logout": {
    uz: "Akkauntdan chiqish",
    ru: "Выйти из аккаунта",
    en: "Log out",
  },
  "profile.logout.title": { uz: "Chiqasizmi?", ru: "Выйти?", en: "Log out?" },
  "profile.logout.message": {
    uz: "Qayta kirish uchun email va parol kerak boʻladi.",
    ru: "Чтобы вернуться, понадобятся email и пароль.",
    en: "You'll need your email and password to sign back in.",
  },
  "profile.guest.title": {
    uz: "Tizimga kiring",
    ru: "Войдите в аккаунт",
    en: "Sign in",
  },
  "profile.guest.body": {
    uz: "Profil, biletlar va sertifikatlar uchun kiring.",
    ru: "Войдите, чтобы увидеть профиль, билеты и сертификаты.",
    en: "Sign in to see your profile, tickets and certificates.",
  },

  // --- W0: common.toast.*, a11y.*, org kit (append-only) ─────
  "common.toast.copied": { uz: "Nusxalandi", ru: "Скопировано", en: "Copied" },
  "common.toast.saved": { uz: "Saqlandi", ru: "Сохранено", en: "Saved" },
  "common.toast.error": {
    uz: "Xatolik yuz berdi",
    ru: "Что-то пошло не так",
    en: "Something went wrong",
  },
  "a11y.back": { uz: "Orqaga", ru: "Назад", en: "Back" },
  "a11y.close": { uz: "Yopish", ru: "Закрыть", en: "Close" },
  "a11y.share": { uz: "Ulashish", ru: "Поделиться", en: "Share" },
  "a11y.save": { uz: "Saqlash", ru: "Сохранить", en: "Save" },
  "a11y.map": { uz: "Xarita", ru: "Карта", en: "Map" },
  "a11y.filters": { uz: "Filtrlar", ru: "Фильтры", en: "Filters" },
  "a11y.search": { uz: "Qidiruv", ru: "Поиск", en: "Search" },
  "a11y.notifications": {
    uz: "Bildirishnomalar",
    ru: "Уведомления",
    en: "Notifications",
  },
  "a11y.more": { uz: "Qoʻshimcha", ru: "Ещё", en: "More" },
  "a11y.switchMode": {
    uz: "Rejimni almashtirish",
    ru: "Сменить режим",
    en: "Switch mode",
  },
  "org.pill.organizing": {
    uz: "Tashkilotchi",
    ru: "Организатор",
    en: "Organizing",
  },
  "org.work.sub": {
    uz: "Tadbirlar orasidagi ishlar",
    ru: "Дела между событиями",
    en: "Between-events work",
  },
  "org.work.boards.locked": {
    uz: "Tarifga kirmagan",
    ru: "Не входит в тариф",
    en: "Not in your plan",
  },
  "org.work.webOnly": {
    uz: "Bogʻlanish soʻrovlari, obunachilar va maydonchalar hozircha faqat veb-kabinetda.",
    ru: "Заявки на связь, подписчики и площадки пока только в веб-кабинете.",
    en: "Contact requests, followers and venues are web-workspace only for now.",
  },
  "org.eventQr.title": {
    uz: "Tadbir QR kodi",
    ru: "QR-код события",
    en: "Event QR code",
  },
  "org.eventQr.headline": {
    uz: "Kirishda koʻrsating",
    ru: "Покажите на входе",
    en: "Show this at the door",
  },
  "org.eventQr.body": {
    uz: "Ishtirokchilar buni oʻz telefoni bilan skanerlaydi va oʻzini belgilaydi — navbat tezroq oʻtadi.",
    ru: "Участники сканируют его своим телефоном и отмечаются сами — очередь идёт быстрее.",
    en: "Attendees scan it with their own phones and check themselves in — the queue moves faster.",
  },
  "org.eventQr.error": {
    uz: "QR kodni olib boʻlmadi",
    ru: "Не удалось получить QR",
    en: "Couldn't load the QR",
  },
  "org.eventQr.scanInstead": {
    uz: "Biletni oʻzim skanerlayman",
    ru: "Сканировать билет самому",
    en: "Scan a ticket instead",
  },
  "org.tab.home": { uz: "Asosiy", ru: "Главная", en: "Home" },
  "org.tab.work": { uz: "Ish", ru: "Работа", en: "Work" },
  "org.tab.more": { uz: "Yana", ru: "Ещё", en: "More" },
  "org.tab.overview": { uz: "Umumiy", ru: "Обзор", en: "Overview" },
  "org.tab.events": { uz: "Tadbirlar", ru: "События", en: "Events" },
  "org.tab.checkin": { uz: "Kirish", ru: "Отметка", en: "Check-in" },
  "org.tab.guests": { uz: "Mehmonlar", ru: "Гости", en: "Guests" },
  "org.tab.org": { uz: "Tashkilot", ru: "Организация", en: "Org" },
  "org.status.draft": { uz: "Qoralama", ru: "Черновик", en: "Draft" },
  "org.status.published": {
    uz: "Eʼlon qilingan",
    ru: "Опубликовано",
    en: "Published",
  },
  "org.status.live": { uz: "Hozir jonli", ru: "Сейчас идёт", en: "Live now" },
  "org.status.past": { uz: "Oʻtgan", ru: "Прошло", en: "Past" },
  "org.status.pending": {
    uz: "Moderatsiyada",
    ru: "На модерации",
    en: "In review",
  },

  // --- W1: auth polish (append-only) ─────────────────────────
  "auth.toast.resendFail": {
    uz: "Kod yuborilmadi. Aloqani tekshirib, qayta urinib koʻring.",
    ru: "Не удалось отправить код. Проверьте соединение и попробуйте ещё раз.",
    en: "Couldn't send the code. Check your connection and try again.",
  },
  "auth.toast.mailFail": {
    uz: "Pochta ilovasi topilmadi. Taklif xatini pochta qutingizda oching.",
    ru: "Почтовое приложение не найдено. Откройте письмо с приглашением в своей почте.",
    en: "No mail app found. Open the invitation email in your inbox.",
  },

  // --- W2: discover / search (append-only) ───────────────────
  "home.featured.error": {
    uz: "Tanlanganlarni yuklab boʻlmadi.",
    ru: "Не удалось загрузить подборку.",
    en: "Couldn't load featured events.",
  },
  "home.categories.error": {
    uz: "Toifalar yuklanmadi",
    ru: "Категории не загрузились",
    en: "Categories didn't load",
  },
  "search.regionFilter": {
    uz: "Hudud: {city}",
    ru: "Регион: {city}",
    en: "Region: {city}",
  },
  "search.regionFilter.remove": {
    uz: "Hudud filtrini olib tashlash",
    ru: "Убрать фильтр региона",
    en: "Remove region filter",
  },

  // --- W3: detail / comments / regSuccess (append-only) ──────
  "detail.now": { uz: "Hozir", ru: "Сейчас", en: "Now" },
  "detail.material.unavailable": {
    uz: "Fayl hali mavjud emas",
    ru: "Файл пока недоступен",
    en: "File not available yet",
  },
  "regSuccess.processing": {
    uz: "Joyingiz band qilinmoqda…",
    ru: "Оформляем регистрацию…",
    en: "Confirming your spot…",
  },
  "regSuccess.processingBody": {
    uz: "Bir necha soniya kutib turing — ekranni yopmang.",
    ru: "Подождите пару секунд — не закрывайте экран.",
    en: "Hold tight, this usually takes a few seconds.",
  },
  "regSuccess.title": {
    uz: "Siz borasiz!",
    ru: "Вы идёте!",
    en: "You're going!",
  },
  "regSuccess.body": {
    uz: "{title} uchun biletingiz tayyor. Nusxasini emailingizga ham yubordik.",
    ru: "Ваш билет на {title} готов. Копию отправили вам на почту.",
    en: "Your ticket for {title} is ready. We've emailed a copy too.",
  },
  "regSuccess.pendingTitle": {
    uz: "Soʻrov yuborildi",
    ru: "Заявка отправлена",
    en: "Request sent",
  },
  "regSuccess.done": { uz: "Tayyor", ru: "Готово", en: "Done" },

  // --- W4: tickets / certs / certDetail (append-only) ────────
  "ticket.signIn.body": {
    uz: "Bu biletni ochish uchun tizimga kiring.",
    ru: "Войдите, чтобы открыть этот билет.",
    en: "Sign in to open this ticket.",
  },
  "ticket.role.PARTICIPANT": {
    uz: "Ishtirokchi",
    ru: "Участник",
    en: "Participant",
  },
  "ticket.role.SPEAKER": { uz: "Spiker", ru: "Спикер", en: "Speaker" },
  "ticket.role.MENTOR": { uz: "Mentor", ru: "Ментор", en: "Mentor" },
  "certs.copyCode": {
    uz: "Tekshiruv kodini nusxalash",
    ru: "Скопировать код проверки",
    en: "Copy verification code",
  },
  "certs.downloadError": {
    uz: "Sertifikatni ochib boʻlmadi. Qayta urinib koʻring.",
    ru: "Не удалось открыть сертификат. Попробуйте снова.",
    en: "Couldn't open the certificate. Try again.",
  },
  "certDetail.title": { uz: "Sertifikat", ru: "Сертификат", en: "Credential" },
  "certDetail.eyebrow.event": {
    uz: "Ishtirok sertifikati",
    ru: "Сертификат участия",
    en: "Certificate of participation",
  },
  "certDetail.eyebrow.manual": {
    uz: "Tugatganlik sertifikati",
    ru: "Сертификат о прохождении",
    en: "Certificate of completion",
  },
  "certDetail.awardedTo": {
    uz: "Kimga berilgan",
    ru: "Кому выдан",
    en: "Awarded to",
  },
  "certDetail.verified": {
    uz: "Tasdiqlangan",
    ru: "Подтверждён",
    en: "Verified",
  },
  "certDetail.meta.issued": {
    uz: "Berilgan sana",
    ru: "Дата выдачи",
    en: "Issued",
  },
  "certDetail.meta.credentialId": {
    uz: "Sertifikat kodi",
    ru: "Код сертификата",
    en: "Credential ID",
  },
  "certDetail.meta.role": { uz: "Rol", ru: "Роль", en: "Role" },
  "certDetail.meta.location": { uz: "Joy", ru: "Место", en: "Location" },
  "certDetail.meta.eventDate": {
    uz: "Tadbir sanasi",
    ru: "Дата события",
    en: "Event date",
  },
  "certDetail.meta.duration": {
    uz: "Davomiyligi",
    ru: "Длительность",
    en: "Duration",
  },
  "certDetail.meta.expires": {
    uz: "Amal qilish muddati",
    ru: "Действителен до",
    en: "Expires",
  },
  "certDetail.issuedBy": {
    uz: "Kim tomonidan berilgan",
    ru: "Кем выдан",
    en: "Issued by",
  },
  "certDetail.download": {
    uz: "PDF yuklab olish",
    ru: "Скачать PDF",
    en: "Download PDF",
  },
  "certDetail.skills": {
    uz: "Koʻnikmalar",
    ru: "Навыки",
    en: "Skills demonstrated",
  },
  "certDetail.notFound.title": {
    uz: "Sertifikat topilmadi",
    ru: "Сертификат не найден",
    en: "Certificate not found",
  },
  "certDetail.notFound.body": {
    uz: "Bu sertifikat mavjud emas yoki sizga tegishli emas.",
    ru: "Этого сертификата нет или он вам не принадлежит.",
    en: "This certificate doesn't exist or isn't yours.",
  },

  // --- W5: mode switch (append-only) ─────────────────────────
  "mode.title": {
    uz: "Rejimni almashtirish",
    ru: "Сменить режим",
    en: "Switch mode",
  },
  "mode.sub": {
    uz: "Bitta akkaunt — ilova nima bilan bandligingizga moslashadi.",
    ru: "Один аккаунт — приложение подстраивается под то, чем вы заняты.",
    en: "Same account — the app changes to match what you're doing.",
  },
  "mode.attending": { uz: "Ishtirok etish", ru: "Участие", en: "Attending" },
  "mode.attending.sub": {
    uz: "Tadbirlarni toping, band qiling va biletlarni saqlang",
    ru: "Находите события, бронируйте и храните билеты",
    en: "Discover, book and keep your tickets",
  },
  "mode.org": { uz: "Tashkilot", ru: "Организация", en: "Organization" },
  "mode.promo.title": {
    uz: "Oʻz tadbirlaringizni oʻtkazing",
    ru: "Проводите свои события",
    en: "Run your own events",
  },
  "mode.promo.body": {
    uz: "Tashkilotni platforma administratori yaratadi; jamoaga taklif havolasi orqali qoʻshiling.",
    ru: "Организацию создаёт администратор платформы; вступите в команду по ссылке-приглашению.",
    en: "A platform administrator provisions the organization; join the team through an invitation link.",
  },
  "mode.switchToOrganizing": {
    uz: "Tashkilotchi rejimiga oʻtish",
    ru: "Перейти в режим организатора",
    en: "Switch to organizing",
  },
  "mode.error.switch": {
    uz: "Almashtirib boʻlmadi. Aloqani tekshirib, qayta urinib koʻring.",
    ru: "Не удалось переключиться. Проверьте соединение и попробуйте ещё раз.",
    en: "Couldn't switch. Check your connection and try again.",
  },
  "mode.error.orgs": {
    uz: "Tashkilotlaringizni yuklab boʻlmadi.",
    ru: "Не удалось загрузить ваши организации.",
    en: "Couldn't load your organizations.",
  },

  // --- W6: organizer overview + events (append-only) ─────────
  "org.status.cancelled": {
    uz: "Bekor qilingan",
    ru: "Отменено",
    en: "Cancelled",
  },
  "org.home.greeting.morning": {
    uz: "Xayrli tong{name}",
    ru: "Доброе утро{name}",
    en: "Good morning{name}",
  },
  "org.home.greeting.afternoon": {
    uz: "Xayrli kun{name}",
    ru: "Добрый день{name}",
    en: "Good afternoon{name}",
  },
  "org.home.greeting.evening": {
    uz: "Xayrli kech{name}",
    ru: "Добрый вечер{name}",
    en: "Good evening{name}",
  },
  "org.home.headline": {
    uz: "Tadbirlaringiz qanday ketyapti?",
    ru: "Как идут ваши события?",
    en: "How are your events doing?",
  },
  "org.home.empty.title": {
    uz: "Hali tadbirlar yoʻq",
    ru: "Событий пока нет",
    en: "No events yet",
  },
  "org.home.empty.body": {
    uz: "Birinchi tadbiringizni yarating — statistika shu yerda koʻrinadi.",
    ru: "Создайте первое событие — статистика появится здесь.",
    en: "Create your first event — your stats will show up here.",
  },
  "org.home.kpi.events": {
    uz: "Faol tadbirlar",
    ru: "Активные события",
    en: "Active events",
  },
  "org.home.kpi.events.foot": {
    uz: "oʻtgan oyga nisbatan",
    ru: "к прошлому месяцу",
    en: "vs last month",
  },
  "org.home.kpi.tasks": { uz: "Vazifalar", ru: "Задачи", en: "Tasks" },
  "org.home.kpi.tasks.foot": {
    uz: "{done}/{total} bajarildi",
    ru: "{done}/{total} выполнено",
    en: "{done}/{total} done",
  },
  "org.home.kpi.participants": {
    uz: "Yangi ishtirokchilar",
    ru: "Новые участники",
    en: "New participants",
  },
  "org.home.kpi.participants.foot": {
    uz: "jami {n}",
    ru: "всего {n}",
    en: "{n} total",
  },
  "org.home.kpi.conversion": {
    uz: "Konversiya",
    ru: "Конверсия",
    en: "Conversion",
  },
  "org.home.kpi.conversion.foot": {
    uz: "{n}% qatnashdi",
    ru: "{n}% посещаемость",
    en: "{n}% attended",
  },
  // Design 4.3 heads this rail «Активность» — the rail already says "last 24
  // hours" in its empty state, so «Последние» only lengthens the line.
  "org.home.activity": { uz: "Faollik", ru: "Активность", en: "Activity" },
  "org.home.activity.empty": {
    uz: "Soʻnggi 24 soatda harakat boʻlmadi",
    ru: "За последние 24 часа активности нет",
    en: "No activity in the last 24 hours",
  },
  "org.home.activity.error": {
    uz: "Harakatlarni yuklab boʻlmadi",
    ru: "Не удалось загрузить активность",
    en: "Couldn't load activity",
  },
  "org.home.activity.registration": {
    uz: "Yangi roʻyxatdan oʻtish",
    ru: "Новая регистрация",
    en: "New registration",
  },
  "org.home.activity.eventCreated": {
    uz: "Tadbir yaratildi",
    ru: "Событие создано",
    en: "Event created",
  },
  "org.home.activity.eventPublished": {
    uz: "Tadbir eʼlon qilindi",
    ru: "Событие опубликовано",
    en: "Event published",
  },
  "org.home.activity.taskCreated": {
    uz: "Vazifa qoʻshildi",
    ru: "Задача создана",
    en: "Task added",
  },
  "org.home.activity.taskCompleted": {
    uz: "Vazifa bajarildi",
    ru: "Задача выполнена",
    en: "Task completed",
  },
  "org.home.activity.memberJoined": {
    uz: "Yangi aʼzo qoʻshildi",
    ru: "Новый участник команды",
    en: "Member joined",
  },

  // ── org home · design 4.3 (KPI grid, live rail, attention, timeline) ──
  // The four tiles read the SAME dashboard DTO the old grid did — no new
  // endpoint. `tickets` (kanban tasks) is dropped from the overview: it is
  // board work, not an organizer headline, and it lives on its own screen.
  "org.home.kpi.registrations": {
    uz: "Roʻyxatdan oʻtishlar",
    ru: "Регистрации",
    en: "Registrations",
  },
  "org.home.kpi.registrations.foot": {
    uz: "oyiga {n} ta yangi",
    ru: "{n} новых за месяц",
    en: "{n} new this month",
  },
  "org.home.kpi.events.footTotal": {
    uz: "jami {n} tadan",
    ru: "из {n} всего",
    en: "of {n} total",
  },
  "org.home.kpi.approved": {
    uz: "Tasdiqlangan",
    ru: "Подтверждено",
    en: "Approved",
  },
  "org.home.kpi.approved.foot": {
    uz: "{b} tadan {a} ta",
    ru: "{a} из {b}",
    en: "{a} of {b}",
  },
  "org.home.kpi.checkin": {
    uz: "Kirish belgisi",
    ru: "Чек-ин",
    en: "Check-in",
  },
  "org.home.kpi.checkin.foot": {
    uz: "{n} ta tasdiqlangandan",
    ru: "из {n} подтверждённых",
    en: "of {n} approved",
  },

  "org.home.section.live": {
    uz: "Faol tadbirlar",
    ru: "Активные события",
    en: "Active events",
  },
  "org.home.section.liveAll": {
    uz: "Barchasi {n}",
    ru: "Все {n}",
    en: "All {n}",
  },
  "org.home.section.attention": {
    uz: "Eʼtibor talab qiladi",
    ru: "Требует внимания",
    en: "Needs attention",
  },
  "org.home.section.activityAll": {
    uz: "Barcha harakatlar",
    ru: "Вся активность",
    en: "All activity",
  },

  "org.home.attention.drafts": {
    uz: "Qoralamalar yuborilmagan ({n})",
    ru: "Черновики ждут отправки ({n})",
    en: "Drafts waiting to be sent ({n})",
  },
  "org.home.attention.drafts.body": {
    uz: "Moderatsiya 2 ish kunigacha davom etadi",
    ru: "Модерация занимает до 2 рабочих дней",
    en: "Review takes up to 2 business days",
  },
  "org.home.attention.noRegs": {
    uz: "Eʼlon qilindi, arizalar yoʻq ({n})",
    ru: "Опубликованы без регистраций ({n})",
    en: "Published with no registrations ({n})",
  },
  "org.home.attention.noRegs.body": {
    uz: "{title} — hali 0 ta ariza",
    ru: "{title} — пока 0 заявок",
    en: "{title} — 0 registrations so far",
  },

  "org.home.countdown.today": { uz: "Bugun", ru: "Сегодня", en: "Today" },
  "org.home.countdown.days": { uz: "{n} kun", ru: "{n} дн.", en: "{n}d" },
  "org.home.capacity": {
    uz: "{n} ta joy band",
    ru: "мест занято: {n}",
    en: "{n} seats taken",
  },
  "org.events.noDate": {
    uz: "Sana belgilanmagan",
    ru: "Дата не назначена",
    en: "No date set",
  },
  "org.events.draft.hint": {
    uz: "Qoralama — hali eʼlon qilinmagan",
    ru: "Черновик — ещё не опубликован",
    en: "Draft — not published yet",
  },
  "org.events.col.registered": {
    uz: "Roʻyxatda",
    ru: "Регистраций",
    en: "Registered",
  },
  "org.events.col.views": { uz: "Koʻrishlar", ru: "Просмотры", en: "Views" },
  "org.events.col.capacity": {
    uz: "Toʻldirilgan",
    ru: "Заполнено",
    en: "Filled",
  },
  // ── org events · design 4.4 (masthead, search, per-lifecycle cards) ──
  // Short form for the masthead button — the full "Создать событие"
  // (`org.events.create`) does not fit beside the title.
  "org.events.createShort": { uz: "Yaratish", ru: "Создать", en: "Create" },
  "org.events.searchPlaceholder": {
    uz: "Nomi boʻyicha qidirish",
    ru: "Поиск по названию",
    en: "Search by title",
  },
  // ── filter sheet · design 4.4b ───────────────────────────────────────────
  "org.events.filters": { uz: "Filtrlar", ru: "Фильтры", en: "Filters" },
  "org.events.filter.type": {
    uz: "Tadbir turi",
    ru: "Тип события",
    en: "Event type",
  },
  "org.events.filter.format": { uz: "Format", ru: "Формат", en: "Format" },
  "org.events.filter.city": { uz: "Shahar", ru: "Город", en: "City" },
  "org.events.filter.anyCity": {
    uz: "Har qanday shahar",
    ru: "Любой город",
    en: "Any city",
  },
  "org.events.filter.sort": { uz: "Saralash", ru: "Сортировка", en: "Sort" },
  "org.events.filter.show": {
    uz: "{n} ta tadbirni koʻrsatish",
    ru: "Показать события: {n}",
    en: "Show {n} events",
  },
  "org.events.filter.showNone": {
    uz: "Mos tadbir yoʻq",
    ru: "Ничего не подходит",
    en: "Nothing matches",
  },
  "org.events.sort.newest": {
    uz: "Avval yangilari",
    ru: "Сначала новые",
    en: "Newest first",
  },
  "org.events.sort.oldest": {
    uz: "Avval eskilari",
    ru: "Сначала старые",
    en: "Oldest first",
  },
  "org.events.sort.startDate": {
    uz: "Oʻtkazilish sanasi boʻyicha",
    ru: "По дате проведения",
    en: "By event date",
  },
  "org.events.sort.title": {
    uz: "Nomi boʻyicha",
    ru: "По названию",
    en: "By title",
  },
  "org.events.draft.notSubmitted": {
    uz: "Moderatsiyaga yuborilmagan",
    ru: "Не отправлено на модерацию",
    en: "Not submitted for review",
  },
  "org.events.almostFull": {
    uz: "Joylar tugayapti",
    ru: "Мест почти нет",
    en: "Almost full",
  },

  // --- Event section rail (mirrors the web cabinet's tab row) ---
  "org.section.overview": { uz: "Umumiy", ru: "Обзор", en: "Overview" },
  "org.section.agenda": { uz: "Dastur", ru: "Программа", en: "Agenda" },
  "org.section.speakers": { uz: "Spikerlar", ru: "Спикеры", en: "Speakers" },
  "org.section.questions": { uz: "Savollar", ru: "Вопросы", en: "Questions" },
  "org.section.badges": { uz: "Bejlar", ru: "Бейджи", en: "Badges" },
  "org.section.comments": { uz: "Izohlar", ru: "Комментарии", en: "Comments" },
  "org.section.analytics": {
    uz: "Analitika",
    ru: "Аналитика",
    en: "Analytics",
  },

  // --- Agenda ---
  "org.agenda.empty.title": {
    uz: "Dastur hali yoʻq",
    ru: "Программы пока нет",
    en: "No agenda yet",
  },
  "org.agenda.empty.body": {
    uz: "Tadbir kunlarini nuqtalarga boʻling — mehmonlar nima boʻlishini oldindan koʻradi.",
    ru: "Разбейте дни события на пункты — гости увидят, что их ждёт.",
    en: "Break the event days into items so guests can see what is coming.",
  },
  "org.agenda.add": {
    uz: "Nuqta qoʻshish",
    ru: "Добавить пункт",
    en: "Add item",
  },
  "org.agenda.day": { uz: "{n}-kun", ru: "День {n}", en: "Day {n}" },
  "org.agenda.minutes": { uz: "{n} daqiqa", ru: "{n} мин", en: "{n} min" },
  "org.agenda.noRoom": {
    uz: "Zal koʻrsatilmagan",
    ru: "Зал не указан",
    en: "No room set",
  },
  "org.agenda.delete.title": {
    uz: "Nuqtani oʻchirilsinmi?",
    ru: "Удалить пункт?",
    en: "Delete this item?",
  },
  "org.agenda.delete.body": {
    uz: "Nuqta dasturdan olib tashlanadi. Buni qaytarib boʻlmaydi.",
    ru: "Пункт исчезнет из программы. Это нельзя отменить.",
    en: "The item leaves the agenda. This cannot be undone.",
  },
  "org.agenda.field.type": { uz: "Turi", ru: "Тип", en: "Type" },
  "org.agenda.type.KEYNOTE": {
    uz: "Asosiy maʼruza",
    ru: "Ключевой доклад",
    en: "Keynote",
  },
  "org.agenda.type.PRESENTATION": {
    uz: "Prezentatsiya",
    ru: "Презентация",
    en: "Talk",
  },
  "org.agenda.type.WORKSHOP": { uz: "Vorkshop", ru: "Воркшоп", en: "Workshop" },
  "org.agenda.type.PANEL": { uz: "Panel", ru: "Панель", en: "Panel" },
  "org.agenda.type.NETWORKING": {
    uz: "Networking",
    ru: "Нетворкинг",
    en: "Networking",
  },
  "org.agenda.type.BREAK": { uz: "Tanaffus", ru: "Перерыв", en: "Break" },
  "org.agenda.type.OPENING": { uz: "Ochilish", ru: "Открытие", en: "Opening" },
  "org.agenda.type.CLOSING": { uz: "Yopilish", ru: "Закрытие", en: "Closing" },
  "org.agenda.type.REGISTRATION": {
    uz: "Roʻyxatga olish",
    ru: "Регистрация",
    en: "Registration",
  },
  "org.agenda.type.MENTORSHIP": {
    uz: "Mentorlik",
    ru: "Работа с менторами",
    en: "Mentorship",
  },
  "org.agenda.type.MENTOR_SESSION": {
    uz: "Mentor sessiyasi",
    ru: "Менторская сессия",
    en: "Mentor session",
  },
  "org.agenda.type.FREE_WORK": {
    uz: "Erkin ish",
    ru: "Свободная работа",
    en: "Free work",
  },
  "org.agenda.field.title": { uz: "Nomi", ru: "Название", en: "Title" },
  "org.agenda.field.description": {
    uz: "Tavsif",
    ru: "Описание",
    en: "Description",
  },
  "org.agenda.field.start": { uz: "Boshlanishi", ru: "Начало", en: "Starts" },
  "org.agenda.field.duration": {
    uz: "Davomiyligi, daqiqa",
    ru: "Длительность, мин",
    en: "Duration, min",
  },
  "org.agenda.form.new": {
    uz: "Yangi nuqta",
    ru: "Новый пункт",
    en: "New item",
  },
  "org.agenda.form.edit": {
    uz: "Nuqtani tahrirlash",
    ru: "Редактировать пункт",
    en: "Edit item",
  },
  "org.agenda.err.title": {
    uz: "Nomini kiriting",
    ru: "Укажите название",
    en: "Enter a title",
  },
  "org.agenda.err.start": {
    uz: "Boshlanish vaqtini tanlang",
    ru: "Выберите время начала",
    en: "Pick a start time",
  },

  // --- Event badges ---
  "org.badges.coverage": {
    uz: "Rollar boʻyicha",
    ru: "Шаблоны по ролям",
    en: "Templates by role",
  },
  "org.badges.role.PARTICIPANT": {
    uz: "Ishtirokchi",
    ru: "Участник",
    en: "Participant",
  },
  "org.badges.role.SPEAKER": { uz: "Spiker", ru: "Спикер", en: "Speaker" },
  "org.badges.role.MENTOR": { uz: "Mentor", ru: "Ментор", en: "Mentor" },
  "org.badges.default": { uz: "asosiy", ru: "основной", en: "default" },
  "org.badges.empty.title": {
    uz: "Shablonlar yoʻq",
    ru: "Шаблонов нет",
    en: "No templates",
  },
  "org.badges.empty.body": {
    uz: "Shablonsiz bejlarni chop etib boʻlmaydi.",
    ru: "Без шаблона бейджи не напечатать.",
    en: "Without a template there are no badges to print.",
  },
  "org.badges.deskNote": {
    uz: "Shablon yuklash va maydonlarni joylashtirish — veb-kabinetda: chop etish oʻlchamlari millimetrgacha aniq, telefonda buni toʻgʻri qilib boʻlmaydi. ZIP ham oʻsha yerda.",
    ru: "Загрузка шаблона и расстановка полей — в веб-кабинете: размеры печати считаются до миллиметра, на телефоне это не сделать точно. Выгрузка ZIP тоже там.",
    en: "Uploading artwork and placing fields lives in the web cabinet — print sizes are millimetre-exact and a phone cannot place them accurately. The ZIP download is there too.",
  },
  "org.badges.delete.title": {
    uz: "Shablon oʻchirilsinmi?",
    ru: "Удалить шаблон?",
    en: "Delete this template?",
  },
  "org.badges.delete.body": {
    uz: "Shablon oʻchiriladi. Allaqachon chop etilgan bejlar saqlanib qoladi.",
    ru: "Шаблон удалится. Уже выпущенные бейджи останутся.",
    en: "The template goes. Badges already printed are unaffected.",
  },

  // --- Registration questions ---
  "org.questions.empty.title": {
    uz: "Savollar yoʻq",
    ru: "Вопросов нет",
    en: "No questions",
  },
  "org.questions.empty.body": {
    uz: "Anketasiz roʻyxatdan oʻtish faqat ism va pochtani soʻraydi.",
    ru: "Без анкеты регистрация спросит только имя и почту.",
    en: "Without a form, registration only asks for a name and an email.",
  },
  "org.questions.add": {
    uz: "Savol qoʻshish",
    ru: "Добавить вопрос",
    en: "Add question",
  },
  "org.questions.required": {
    uz: "majburiy",
    ru: "обязательный",
    en: "required",
  },
  "org.questions.points": { uz: "{n} ball", ru: "{n} б.", en: "{n} pts" },
  "org.questions.moveUp": { uz: "Yuqoriga", ru: "Выше", en: "Move up" },
  "org.questions.moveDown": { uz: "Pastga", ru: "Ниже", en: "Move down" },
  "org.questions.form.new": {
    uz: "Yangi savol",
    ru: "Новый вопрос",
    en: "New question",
  },
  "org.questions.form.edit": {
    uz: "Savolni tahrirlash",
    ru: "Редактировать вопрос",
    en: "Edit question",
  },
  "org.questions.field.question": { uz: "Savol", ru: "Вопрос", en: "Question" },
  "org.questions.field.category": {
    uz: "Turi",
    ru: "Тип вопроса",
    en: "Question kind",
  },
  "org.questions.field.type": {
    uz: "Javob formati",
    ru: "Формат ответа",
    en: "Answer format",
  },
  "org.questions.field.options": {
    uz: "Javob variantlari",
    ru: "Варианты ответа",
    en: "Answer options",
  },
  "org.questions.field.optionsHint": {
    uz: "Har bir variant — alohida qatorda",
    ru: "Каждый вариант — с новой строки",
    en: "One option per line",
  },
  "org.questions.field.info": { uz: "Matn", ru: "Текст", en: "Text" },
  "org.questions.field.required": {
    uz: "Majburiy savol",
    ru: "Обязательный вопрос",
    en: "Required question",
  },
  "org.questions.cat.OPEN": { uz: "Ochiq", ru: "Открытый", en: "Open" },
  "org.questions.cat.CLOSED": {
    uz: "Ha / yoʻq",
    ru: "Да / нет",
    en: "Yes / no",
  },
  "org.questions.cat.ALTERNATIVE": {
    uz: "Variantlardan",
    ru: "Выбор из вариантов",
    en: "Choice",
  },
  "org.questions.cat.RHETORICAL": {
    uz: "Maʼlumot",
    ru: "Информация",
    en: "Notice",
  },
  "org.questions.type.TEXT": {
    uz: "Qisqa matn",
    ru: "Короткий текст",
    en: "Short text",
  },
  "org.questions.type.TEXTAREA": {
    uz: "Uzun matn",
    ru: "Длинный текст",
    en: "Long text",
  },
  "org.questions.type.NUMBER": { uz: "Raqam", ru: "Число", en: "Number" },
  "org.questions.type.SELECT": {
    uz: "Bitta variant",
    ru: "Один вариант",
    en: "One option",
  },
  "org.questions.type.CHECKBOX": {
    uz: "Bir nechta variant",
    ru: "Несколько вариантов",
    en: "Several options",
  },
  "org.questions.type.FILE_UPLOAD": { uz: "Fayl", ru: "Файл", en: "File" },
  "org.questions.err.question": {
    uz: "Savol matnini kiriting",
    ru: "Введите текст вопроса",
    en: "Enter the question",
  },
  "org.questions.err.options": {
    uz: "Kamida bitta javob varianti kerak",
    ru: "Нужен хотя бы один вариант ответа",
    en: "At least one answer option is required",
  },
  "org.questions.delete.title": {
    uz: "Savol oʻchirilsinmi?",
    ru: "Удалить вопрос?",
    en: "Delete this question?",
  },
  "org.questions.delete.body": {
    uz: "Savol anketadan olib tashlanadi. Berilgan javoblar saqlanib qoladi.",
    ru: "Вопрос исчезнет из анкеты. Уже полученные ответы сохранятся.",
    en: "The question leaves the form. Answers already given are kept.",
  },

  // --- Event analytics ---
  "org.analytics.empty.title": {
    uz: "Hali maʼlumot yoʻq",
    ru: "Данных пока нет",
    en: "No data yet",
  },
  "org.analytics.empty.body": {
    uz: "Birinchi roʻyxatdan oʻtishlar paydo boʻlgach, analitika shu yerda yigʻiladi.",
    ru: "Как появятся первые регистрации, аналитика соберётся здесь.",
    en: "Analytics fills in here once the first registrations arrive.",
  },
  "org.analytics.noData": {
    uz: "Maʼlumot yoʻq",
    ru: "Нет данных",
    en: "No data",
  },
  "org.analytics.registrations": {
    uz: "Roʻyxatdan oʻtish",
    ru: "Регистрации",
    en: "Registrations",
  },
  "org.analytics.approvedOf": {
    uz: "{n} tasi tasdiqlangan",
    ru: "из них {n} подтверждены",
    en: "{n} approved",
  },
  "org.analytics.attendance": {
    uz: "Davomat",
    ru: "Посещаемость",
    en: "Attendance",
  },
  "org.analytics.attendedOf": {
    uz: "{n} kishi keldi",
    ru: "пришли {n}",
    en: "{n} attended",
  },
  "org.analytics.approvalRate": {
    uz: "Tasdiqlash",
    ru: "Подтверждение",
    en: "Approval",
  },
  "org.analytics.conversion": {
    uz: "Konversiya",
    ru: "Конверсия",
    en: "Conversion",
  },
  "org.analytics.conversionFoot": {
    uz: "roʻyxatdan davomatgacha",
    ru: "от регистрации до прихода",
    en: "registration to arrival",
  },
  "org.analytics.funnel": { uz: "Voronka", ru: "Воронка", en: "Funnel" },
  "org.analytics.step.registered": {
    uz: "Roʻyxatdan oʻtdi",
    ru: "Зарегистрировались",
    en: "Registered",
  },
  "org.analytics.step.approved": {
    uz: "Tasdiqlandi",
    ru: "Подтверждены",
    en: "Approved",
  },
  "org.analytics.step.test": {
    uz: "Testni tugatdi",
    ru: "Прошли тест",
    en: "Completed the test",
  },
  "org.analytics.step.checkedIn": {
    uz: "Keldi",
    ru: "Пришли",
    en: "Checked in",
  },
  "org.analytics.trend": { uz: "Kunlar boʻyicha", ru: "По дням", en: "By day" },
  "org.analytics.demographics": {
    uz: "Ishtirokchilar",
    ru: "Кто пришёл",
    en: "Who registered",
  },
  "org.analytics.gender": { uz: "Jins", ru: "Пол", en: "Gender" },
  "org.analytics.gender.MALE": { uz: "Erkak", ru: "Мужчины", en: "Male" },
  "org.analytics.gender.FEMALE": { uz: "Ayol", ru: "Женщины", en: "Female" },
  "org.analytics.unknown": {
    uz: "Koʻrsatilmagan",
    ru: "Не указано",
    en: "Not stated",
  },
  "org.analytics.age": { uz: "Yosh", ru: "Возраст", en: "Age" },
  "org.analytics.regions": { uz: "Hududlar", ru: "Регионы", en: "Regions" },
  "org.analytics.tests": { uz: "Test", ru: "Тест", en: "Test" },
  "org.analytics.testCompleted": {
    uz: "Tugatgan",
    ru: "Завершили",
    en: "Completed",
  },
  "org.analytics.testStarted": {
    uz: "{n} tasi boshlagan",
    ru: "начали {n}",
    en: "{n} started",
  },
  "org.analytics.testAverage": {
    uz: "Oʻrtacha ball",
    ru: "Средний балл",
    en: "Average score",
  },
  "org.analytics.testPassRate": {
    uz: "{n}% oʻtdi",
    ru: "сдали {n}%",
    en: "{n}% passed",
  },
  "org.analytics.questions": {
    uz: "Savollar",
    ru: "Ответы на вопросы",
    en: "Question answers",
  },
  "org.analytics.answers": {
    uz: "{n} ta javob",
    ru: "ответов: {n}",
    en: "{n} answers",
  },
  "org.analytics.avg": { uz: "Oʻrtacha", ru: "Среднее", en: "Average" },
  "org.analytics.min": { uz: "Eng kam", ru: "Минимум", en: "Min" },
  "org.analytics.max": { uz: "Eng koʻp", ru: "Максимум", en: "Max" },
  "org.analytics.generated": {
    uz: "{time} holatiga",
    ru: "данные на {time}",
    en: "as of {time}",
  },

  // --- Event comments ---
  "org.comments.empty.title": {
    uz: "Izohlar yoʻq",
    ru: "Комментариев нет",
    en: "No comments",
  },
  "org.comments.empty.body": {
    uz: "Mehmonlar savol berganda, ular shu yerda paydo boʻladi.",
    ru: "Когда гости начнут спрашивать, вопросы появятся здесь.",
    en: "When guests start asking, their questions land here.",
  },
  "org.comments.byOrganizer": {
    uz: "Tashkilotchi",
    ru: "Организатор",
    en: "Organizer",
  },
  "org.comments.reply": { uz: "Javob berish", ru: "Ответить", en: "Reply" },
  "org.comments.edited": { uz: "tahrirlangan", ru: "изменено", en: "edited" },
  "org.comments.write": {
    uz: "Izoh yozish",
    ru: "Написать комментарий",
    en: "Write a comment",
  },
  "org.comments.send": { uz: "Yuborish", ru: "Отправить", en: "Send" },
  "org.comments.field.text": { uz: "Matn", ru: "Текст", en: "Text" },
  "org.comments.form.reply": { uz: "Javob", ru: "Ответ", en: "Reply" },
  "org.comments.form.edit": {
    uz: "Izohni tahrirlash",
    ru: "Редактировать комментарий",
    en: "Edit comment",
  },
  "org.comments.delete.title": {
    uz: "Izoh oʻchirilsinmi?",
    ru: "Удалить комментарий?",
    en: "Delete this comment?",
  },
  "org.comments.delete.body": {
    uz: "Izoh tadbir sahifasidan yoʻqoladi. Buni qaytarib boʻlmaydi.",
    ru: "Комментарий исчезнет со страницы события. Это нельзя отменить.",
    en: "The comment leaves the event page. This cannot be undone.",
  },

  // --- Speakers ---
  "org.speakers.empty.title": {
    uz: "Spikerlar hali yoʻq",
    ru: "Спикеров пока нет",
    en: "No speakers yet",
  },
  "org.speakers.empty.body": {
    uz: "Spikerni qoʻlda qoʻshing yoki taklifni pochtaga yuboring — u oʻzi toʻldiradi.",
    ru: "Добавьте спикера вручную или отправьте приглашение на почту — он заполнит профиль сам.",
    en: "Add a speaker by hand, or email an invitation and let them fill the profile in.",
  },
  "org.speakers.add": {
    uz: "Spiker qoʻshish",
    ru: "Добавить спикера",
    en: "Add speaker",
  },
  "org.speakers.invite": {
    uz: "Pochtaga taklif",
    ru: "Пригласить по почте",
    en: "Invite by email",
  },
  "org.speakers.resend": {
    uz: "Taklifni qayta yuborish",
    ru: "Отправить приглашение ещё раз",
    en: "Resend invitation",
  },
  "org.speakers.status.pending": {
    uz: "Taklif yuborilgan",
    ru: "Приглашение отправлено",
    en: "Invitation sent",
  },
  "org.speakers.status.accepted": {
    uz: "Qabul qilgan",
    ru: "Принял приглашение",
    en: "Accepted",
  },
  "org.speakers.status.rejected": {
    uz: "Rad etgan",
    ru: "Отказался",
    en: "Declined",
  },
  "org.speakers.delete.title": {
    uz: "Spikerni oʻchirilsinmi?",
    ru: "Удалить спикера?",
    en: "Remove this speaker?",
  },
  "org.speakers.delete.body": {
    uz: "Spiker tadbir sahifasidan olib tashlanadi.",
    ru: "Спикер исчезнет со страницы события.",
    en: "The speaker leaves the event page.",
  },
  "org.speakers.field.firstName": { uz: "Ism", ru: "Имя", en: "First name" },
  "org.speakers.field.lastName": {
    uz: "Familiya",
    ru: "Фамилия",
    en: "Last name",
  },
  "org.speakers.field.position": {
    uz: "Lavozim",
    ru: "Должность",
    en: "Position",
  },
  "org.speakers.field.company": {
    uz: "Kompaniya",
    ru: "Компания",
    en: "Company",
  },
  "org.speakers.field.bio": { uz: "Haqida", ru: "О спикере", en: "About" },
  "org.speakers.form.new": {
    uz: "Yangi spiker",
    ru: "Новый спикер",
    en: "New speaker",
  },
  "org.speakers.form.edit": {
    uz: "Spikerni tahrirlash",
    ru: "Редактировать спикера",
    en: "Edit speaker",
  },
  "org.speakers.invite.title": {
    uz: "Spikerni taklif qilish",
    ru: "Пригласить спикера",
    en: "Invite a speaker",
  },
  "org.speakers.invite.body": {
    uz: "Spiker havola oladi va profilini oʻzi toʻldiradi.",
    ru: "Спикер получит ссылку и заполнит профиль сам.",
    en: "The speaker gets a link and fills the profile in themselves.",
  },
  "org.speakers.invite.sent": {
    uz: "Taklif yuborildi",
    ru: "Приглашение отправлено",
    en: "Invitation sent",
  },
  "org.speakers.err.name": {
    uz: "Ismni kiriting",
    ru: "Укажите имя",
    en: "Enter a name",
  },
  "org.speakers.err.email": {
    uz: "Toʻgʻri pochtani kiriting",
    ru: "Укажите корректную почту",
    en: "Enter a valid email",
  },
  "org.events.seatsOf": {
    uz: "{total} joydan {n} tasi",
    ru: "{n} из {total} мест",
    en: "{n} of {total} seats",
  },
  "org.events.view.cards": { uz: "Kartochkalar", ru: "Карточки", en: "Cards" },
  "org.events.view.list": { uz: "Roʻyxat", ru: "Список", en: "List" },
  "org.events.empty.search": {
    uz: "Hech narsa topilmadi",
    ru: "Ничего не найдено",
    en: "Nothing found",
  },
  "org.events.empty.searchBody": {
    uz: "«{q}» boʻyicha tadbir yoʻq. Soʻrovni oʻzgartiring.",
    ru: "По запросу «{q}» событий нет. Измените запрос.",
    en: "No events match “{q}”. Try a different search.",
  },

  "org.events.sub.total": {
    uz: "Jami: {n}",
    ru: "Всего: {n}",
    en: "{n} total",
  },
  "org.events.sub.live": {
    uz: "{n} ta jonli",
    ru: "{n} в эфире",
    en: "{n} live",
  },
  "org.events.showing": {
    uz: "{shown} / {total} koʻrsatildi",
    ru: "Показано {shown} из {total}",
    en: "Showing {shown} of {total}",
  },
  "org.events.empty.filtered": {
    uz: "Bu filtrga mos tadbir yoʻq",
    ru: "Нет событий по этому фильтру",
    en: "No events match this filter",
  },
  "org.events.empty.filteredBody": {
    uz: "Boshqa holatni tanlab koʻring.",
    ru: "Попробуйте выбрать другой статус.",
    en: "Try a different status.",
  },
  "org.guests.pick": {
    uz: "Mehmonlarni boshqarish uchun tadbirni tanlang",
    ru: "Выберите событие, чтобы управлять гостями",
    en: "Pick an event to manage its guests",
  },
  "org.profile.viewPublic": {
    uz: "Ommaviy sahifani koʻrish",
    ru: "Открыть публичную страницу",
    en: "View public page",
  },

  // --- W7: create/edit event + submit-review flow (append-only) ─────────
  // Entry points
  "org.events.create": {
    uz: "Tadbir yaratish",
    ru: "Создать событие",
    en: "Create event",
  },
  "org.events.createFirst": {
    uz: "Birinchi tadbirni yaratish",
    ru: "Создать первое событие",
    en: "Create your first event",
  },

  // ── event wizard · design 4.5 (five steps) ───────────────────────────────
  // ── event command centre · design 4.6/4.7 ────────────────────────────────
  "org.manage.actions": { uz: "Amallar", ru: "Действия", en: "Actions" },
  "org.manage.cancel.notice": {
    uz: "{n} ta ishtirokchi bekor qilish haqida xabar oladi",
    ru: "{n} участников получат уведомление об отмене",
    en: "{n} participants will be notified of the cancellation",
  },
  "org.manage.countdown": {
    uz: "boshlanishiga {n} kun",
    ru: "{n} дн. до старта",
    en: "{n} days to go",
  },
  "org.manage.seatsLeft": {
    uz: "{n} ta joy qoldi",
    ru: "осталось {n} мест",
    en: "{n} seats left",
  },
  "org.manage.conversion": {
    uz: "konversiya {n}%",
    ru: "конверсия {n}%",
    en: "{n}% conversion",
  },
  "org.manage.reg.open": {
    uz: "Roʻyxat ochiq",
    ru: "Регистрация открыта",
    en: "Registration open",
  },
  "org.manage.reg.closedLabel": {
    uz: "Roʻyxat yopiq",
    ru: "Регистрация закрыта",
    en: "Registration closed",
  },
  "org.manage.reg.deadline": {
    uz: "{date}, {time} da yopiladi",
    ru: "Закроется {date} в {time}",
    en: "Closes {date} at {time}",
  },
  "org.manage.reg.noDeadline": {
    uz: "Tadbir boshlanguncha ochiq",
    ru: "Открыта до начала события",
    en: "Open until the event starts",
  },
  "org.manage.reg.opened": {
    uz: "Roʻyxat ochildi",
    ru: "Регистрация открыта",
    en: "Registration opened",
  },
  "org.manage.reg.closed": {
    uz: "Roʻyxat yopildi",
    ru: "Регистрация закрыта",
    en: "Registration closed",
  },

  "org.form.stepOf": {
    uz: "{n}-qadam / {total}",
    ru: "Шаг {n} из {total}",
    en: "Step {n} of {total}",
  },
  "org.form.step.basics": {
    uz: "Asosiy maʼlumot",
    ru: "Основное",
    en: "Basics",
  },
  "org.form.step.access": {
    uz: "Turi va kirish",
    ru: "Тип и доступ",
    en: "Type and access",
  },
  "org.form.step.when": { uz: "Qachon", ru: "Когда", en: "When" },
  "org.form.step.where": { uz: "Qayerda", ru: "Где", en: "Where" },
  "org.form.step.publish": {
    uz: "Eʼlon qilish",
    ru: "Публикация",
    en: "Publishing",
  },
  "org.form.next": { uz: "Keyingisi", ru: "Далее", en: "Next" },
  "org.form.back": { uz: "Orqaga", ru: "Назад", en: "Back" },
  "org.form.draft": { uz: "Qoralama", ru: "Черновик", en: "Draft" },
  "org.form.saveDraftExit": {
    uz: "Qoralamani saqlab chiqish",
    ru: "Сохранить черновик и выйти",
    en: "Save draft and exit",
  },
  "org.form.submitReview": {
    uz: "Moderatsiyaga yuborish",
    ru: "Отправить на модерацию",
    en: "Submit for review",
  },

  // ── translations · design 2.2 ────────────────────────────────────────────
  "org.form.tr.title": { uz: "Tarjimalar", ru: "Переводы", en: "Translations" },
  "org.form.tr.count": {
    uz: "{total} tadan {n} ta",
    ru: "{n} из {total}",
    en: "{n} of {total}",
  },
  "org.form.tr.host": {
    uz: "Asosiy til",
    ru: "Язык-хост",
    en: "Host language",
  },
  "org.form.tr.edit": { uz: "Tarjima", ru: "Перевод", en: "Translate" },
  "org.form.tr.open": {
    uz: "Tarjimalarni ochish",
    ru: "Открыть переводы",
    en: "Open translations",
  },
  "org.form.tr.fillEmpty": {
    uz: "Boʻshlarini tarjima qilish",
    ru: "Перевести пустые",
    en: "Translate the empty ones",
  },
  "org.form.tr.redo": {
    uz: "Avto-tarjimalarni yangilash",
    ru: "Обновить авто-переводы",
    en: "Refresh auto-translations",
  },
  "org.form.tr.placeholder": {
    uz: "Tarjima qoʻshing yoki avtomatik tarjima qiling",
    ru: "Впишите перевод или переведите автоматически",
    en: "Type a translation, or translate automatically",
  },
  "org.form.tr.failed": {
    uz: "Tarjima qilib boʻlmadi — qoʻlda kiriting",
    ru: "Перевести не вышло — впишите вручную",
    en: "Translation failed — type it manually",
  },
  "org.form.shortDescription": {
    uz: "Qisqa tavsif",
    ru: "Краткое описание",
    en: "Short description",
  },
  "org.form.shortDescriptionPlaceholder": {
    uz: "Kartochkalar va oldindan koʻrish uchun bir-ikki jumla",
    ru: "Одно-два предложения для карточек и превью",
    en: "A sentence or two for cards and previews",
  },

  "org.form.slug": {
    uz: "Havola (slug)",
    ru: "Ссылка (slug)",
    en: "URL (slug)",
  },
  "org.form.slugPlaceholder": {
    uz: "tadbir-havolasi",
    ru: "ssylka-sobytiya",
    en: "event-url",
  },
  "org.form.slug.hint": {
    uz: "Boʻsh qoldirsangiz, nomdan hosil qilinadi",
    ru: "Оставьте пустым — создадим из названия",
    en: "Leave empty — we'll derive it from the title",
  },
  "org.form.slug.checking": {
    uz: "Tekshirilyapti…",
    ru: "Проверяем…",
    en: "Checking…",
  },
  "org.form.slug.free": {
    uz: "Havola boʻsh",
    ru: "Ссылка свободна",
    en: "URL is available",
  },
  "org.form.slug.taken": {
    uz: "Bunday havola band",
    ru: "Такая ссылка занята",
    en: "That URL is taken",
  },
  "org.form.cover": { uz: "Muqova", ru: "Обложка", en: "Cover" },

  "org.form.type": { uz: "Tadbir turi", ru: "Тип события", en: "Event type" },
  "org.form.paid": { uz: "Pullik", ru: "Платное", en: "Paid" },
  "org.form.free.desc": {
    uz: "Kirish hamma uchun bepul",
    ru: "Вход свободный для всех",
    en: "Free entry for everyone",
  },
  "org.form.paid.desc": {
    uz: "Narx va valyutani koʻrsating",
    ru: "Укажите цену и валюту",
    en: "Set a price and currency",
  },
  "org.form.access": {
    uz: "Tadbirga kirish",
    ru: "Доступ к событию",
    en: "Event access",
  },
  "org.form.access.OPEN": {
    uz: "Ochiq roʻyxat",
    ru: "Открытая регистрация",
    en: "Open registration",
  },
  "org.form.access.OPEN.desc": {
    uz: "Har kim oʻzi roʻyxatdan oʻtadi",
    ru: "Любой может зарегистрироваться сам",
    en: "Anyone can register themselves",
  },
  "org.form.access.REQUEST": {
    uz: "Soʻrov boʻyicha",
    ru: "По запросу",
    en: "By request",
  },
  "org.form.access.REQUEST.desc": {
    uz: "Har bir arizani siz tasdiqlaysiz",
    ru: "Каждую заявку одобряете вы",
    en: "You approve each request",
  },
  "org.form.access.INVITE_ONLY": {
    uz: "Faqat taklif boʻyicha",
    ru: "Только по приглашению",
    en: "Invite only",
  },
  "org.form.access.INVITE_ONLY.desc": {
    uz: "Havola yoki kod orqali",
    ru: "По ссылке или коду",
    en: "Via a link or code",
  },
  "org.form.access.PRIVATE": { uz: "Yopiq", ru: "Приватное", en: "Private" },
  "org.form.access.PRIVATE.desc": {
    uz: "Katalogda koʻrinmaydi",
    ru: "Не показывается в каталоге",
    en: "Hidden from the catalogue",
  },
  "org.form.format.OFFLINE.desc": {
    uz: "Joyida",
    ru: "На площадке",
    en: "At a venue",
  },
  "org.form.format.ONLINE.desc": {
    uz: "Havola orqali",
    ru: "По ссылке",
    en: "Via a link",
  },
  "org.form.format.HYBRID.desc": {
    uz: "Ikkalasi ham",
    ru: "И то, и другое",
    en: "Both",
  },
  "org.form.categories": { uz: "Mavzular", ru: "Тематики", en: "Topics" },

  "org.form.deadline": {
    uz: "Roʻyxatdan oʻtish muddati",
    ru: "Дедлайн регистрации",
    en: "Registration deadline",
  },
  "org.form.deadline.on": {
    uz: "Shu vaqtdan keyin roʻyxat yopiladi",
    ru: "После этого момента регистрация закроется",
    en: "Registration closes at that moment",
  },
  "org.form.deadline.off": {
    uz: "Roʻyxat tadbir boshlanguncha ochiq",
    ru: "Регистрация открыта до начала события",
    en: "Registration stays open until the event starts",
  },
  "org.form.multiDayHint": {
    uz: "Bir kunlik tadbir. Koʻp kunlik uchun boshqa tugash sanasini qoʻying — dastur va davomat kunlarga avtomatik boʻlinadi.",
    ru: "Событие на один день. Для многодневного поставьте другую дату окончания — программа и посещаемость разделятся по дням.",
    en: "A single-day event. For a multi-day one set a different end date — the programme and attendance split by day automatically.",
  },

  "org.form.address": { uz: "Manzil", ru: "Адрес", en: "Address" },
  "org.form.addressPlaceholder": {
    uz: "Registon koʻchasi, 1",
    ru: "ул. Регистан, 1",
    en: "1 Registan St",
  },
  "org.form.onlineUrlHint": {
    uz: "Zoom, Google Meet yoki boshqa platforma",
    ru: "Zoom, Google Meet или другая платформа",
    en: "Zoom, Google Meet or another platform",
  },
  "org.form.onlineOnlyHint": {
    uz: "Onlayn tadbir uchun manzil kerak emas — ishtirokchilar havolani tasdiqdan keyin koʻradi.",
    ru: "Для онлайн-события площадка не нужна — участники увидят ссылку после подтверждения.",
    en: "An online event needs no venue — participants see the link once they're confirmed.",
  },

  "org.form.registrationOpen": {
    uz: "Roʻyxat ochiq",
    ru: "Регистрация открыта",
    en: "Registration open",
  },
  "org.form.comments": { uz: "Izohlar", ru: "Комментарии", en: "Comments" },
  "org.form.moderation.title": {
    uz: "Eʼlon qilishni platforma amalga oshiradi",
    ru: "Публикует платформа",
    en: "The platform publishes",
  },
  "org.form.moderation.body": {
    uz: "Tadbir moderatsiyaga ketadi va tekshiruvdan soʻng katalogda paydo boʻladi — odatda 2 ish kuni ichida.",
    ru: "Событие уйдёт на модерацию и появится в каталоге после проверки — обычно в течение 2 рабочих дней.",
    en: "The event goes to review and appears in the catalogue once approved — usually within 2 business days.",
  },
  "org.form.review": {
    uz: "Yuborishdan oldin tekshiring",
    ru: "Проверьте перед отправкой",
    en: "Check before submitting",
  },
  "org.form.review.when": { uz: "Qachon", ru: "Когда", en: "When" },
  "org.form.review.where": { uz: "Qayerda", ru: "Где", en: "Where" },
  "org.form.review.access": { uz: "Kirish", ru: "Доступ", en: "Access" },
  "org.form.review.price": { uz: "Narx", ru: "Цена", en: "Price" },

  "org.form.err.count": {
    uz: "{n} ta xato — toʻgʻrilang",
    ru: "Ошибок: {n} — исправьте",
    en: "{n} problem(s) to fix",
  },
  "org.form.err.descRequired": {
    uz: "Tavsif boʻsh boʻlmasin",
    ru: "Добавьте описание",
    en: "Add a description",
  },
  "org.form.err.slugTaken": {
    uz: "Bunday havola band",
    ru: "Такая ссылка уже занята",
    en: "That URL is already taken",
  },
  "org.form.err.deadlineRequired": {
    uz: "Muddat sanasini koʻrsating",
    ru: "Укажите дату дедлайна",
    en: "Set the deadline date",
  },
  "org.form.err.deadlineAfterStart": {
    uz: "Muddat tadbir boshlanishidan keyin boʻlmasin",
    ru: "Дедлайн не может быть позже начала события",
    en: "The deadline can't be after the event starts",
  },
  "org.form.toast.submitFailed": {
    uz: "Qoralama saqlandi, lekin moderatsiyaga yuborilmadi",
    ru: "Черновик сохранён, но отправить на модерацию не вышло",
    en: "Draft saved, but submitting for review failed",
  },
  "org.events.a11yCreate": {
    uz: "Tadbir yaratish",
    ru: "Создать событие",
    en: "Create event",
  },

  // Form — chrome
  "org.form.titleNew": {
    uz: "Yangi tadbir",
    ru: "Новое событие",
    en: "New event",
  },
  "org.form.titleEdit": {
    uz: "Tadbirni tahrirlash",
    ru: "Редактировать событие",
    en: "Edit event",
  },
  "org.form.create": {
    uz: "Tadbir yaratish",
    ru: "Создать событие",
    en: "Create event",
  },
  "org.form.saveChanges": {
    uz: "Oʻzgarishlarni saqlash",
    ru: "Сохранить изменения",
    en: "Save changes",
  },
  "org.form.a11yClose": { uz: "Yopish", ru: "Закрыть", en: "Close" },
  "org.form.discard.title": {
    uz: "Oʻzgarishlar bekor qilinsinmi?",
    ru: "Отменить изменения?",
    en: "Discard changes?",
  },
  "org.form.discard.body": {
    uz: "Saqlanmagan oʻzgarishlar yoʻqoladi.",
    ru: "Несохранённые изменения будут потеряны.",
    en: "Your unsaved changes will be lost.",
  },
  "org.form.discard.confirm": {
    uz: "Bekor qilish",
    ru: "Отменить",
    en: "Discard",
  },
  "org.form.discard.cancel": {
    uz: "Tahrirni davom ettirish",
    ru: "Продолжить редактирование",
    en: "Keep editing",
  },

  // Form — cover uploader
  "org.form.cover.add": {
    uz: "Muqova rasmini qoʻshish",
    ru: "Добавить обложку",
    en: "Add a cover image",
  },
  "org.form.cover.hint": {
    uz: "1600 × 900 tavsiya etiladi",
    ru: "Рекомендуется 1600 × 900",
    en: "1600 × 900 recommended",
  },
  "org.form.cover.change": {
    uz: "Muqovani almashtirish",
    ru: "Заменить обложку",
    en: "Change cover",
  },
  "org.form.cover.remove": { uz: "Olib tashlash", ru: "Убрать", en: "Remove" },
  "org.form.cover.uploading": {
    uz: "Yuklanmoqda…",
    ru: "Загрузка…",
    en: "Uploading…",
  },
  "org.form.cover.webOnly": {
    uz: "Muqovani veb-versiyada yuklang. Bu yerda protsedura muqovasi ishlatiladi.",
    ru: "Загрузите обложку в веб-версии. Здесь используется автоматическая обложка.",
    en: "Upload a cover on the web. A generated cover is used here.",
  },
  "org.form.cover.error": {
    uz: "Rasmni yuklab boʻlmadi",
    ru: "Не удалось загрузить изображение",
    en: "Couldn't upload the image",
  },
  "org.form.a11yCover": {
    uz: "Muqova rasmini tanlash",
    ru: "Выбрать обложку",
    en: "Choose a cover image",
  },

  // Form — fields
  "org.form.name": {
    uz: "Tadbir nomi",
    ru: "Название события",
    en: "Event name",
  },
  "org.form.namePlaceholder": {
    uz: "masalan, Startap juma",
    ru: "например, Стартап-пятница",
    en: "e.g. Startup Friday",
  },
  "org.form.category": { uz: "Toifa", ru: "Категория", en: "Category" },
  "org.form.categoryPlaceholder": {
    uz: "Toifani tanlang",
    ru: "Выберите категорию",
    en: "Choose a category",
  },
  "org.form.categoryNone": {
    uz: "Toifasiz",
    ru: "Без категории",
    en: "No category",
  },
  "org.form.format": { uz: "Format", ru: "Формат", en: "Format" },
  "org.form.format.OFFLINE": { uz: "Oflayn", ru: "Офлайн", en: "In person" },
  "org.form.format.ONLINE": { uz: "Onlayn", ru: "Онлайн", en: "Online" },
  "org.form.format.HYBRID": { uz: "Gibrid", ru: "Гибрид", en: "Hybrid" },
  "org.form.date": { uz: "Sana", ru: "Дата", en: "Date" },
  "org.form.time": { uz: "Vaqt", ru: "Время", en: "Time" },
  "org.form.endDate": {
    uz: "Tugash sanasi",
    ru: "Дата окончания",
    en: "End date",
  },
  "org.form.endTime": {
    uz: "Tugash vaqti",
    ru: "Время окончания",
    en: "End time",
  },
  "org.form.datePlaceholder": {
    uz: "Sanani tanlang",
    ru: "Выберите дату",
    en: "Pick a date",
  },
  "org.form.timePlaceholder": {
    uz: "Vaqtni tanlang",
    ru: "Выберите время",
    en: "Pick a time",
  },
  "org.form.venue": { uz: "Joy", ru: "Площадка", en: "Venue" },
  "org.form.venuePlaceholder": {
    uz: "masalan, Spinozin tomi",
    ru: "например, Крыша Spinozin",
    en: "e.g. Roof of Spinozin",
  },
  "org.form.city": { uz: "Shahar", ru: "Город", en: "City" },
  "org.form.cityPlaceholder": {
    uz: "masalan, Toshkent",
    ru: "например, Ташкент",
    en: "e.g. Tashkent",
  },
  "org.form.map.label": {
    uz: "Xaritadagi nuqta",
    ru: "Точка на карте",
    en: "Point on the map",
  },
  "org.form.map.pick": {
    uz: "Xaritada tanlash",
    ru: "Выбрать на карте",
    en: "Pick on the map",
  },
  "org.form.map.change": {
    uz: "Nuqta tanlangan",
    ru: "Точка выбрана",
    en: "Point selected",
  },
  "org.form.map.title": {
    uz: "Tadbir joyi",
    ru: "Место события",
    en: "Event location",
  },
  "org.form.map.searchPlaceholder": {
    uz: "Manzil yoki joy nomi",
    ru: "Адрес или название места",
    en: "Address or place name",
  },
  "org.form.map.hint": {
    uz: "Joyni belgilash uchun xaritaga bosing",
    ru: "Нажмите на карту, чтобы отметить место",
    en: "Tap the map to drop a pin",
  },
  "org.form.map.notFound": {
    uz: "Hech narsa topilmadi — soʻrovni aniqlashtiring yoki xaritadan tanlang",
    ru: "Ничего не найдено — уточните запрос или выберите точку на карте",
    en: "Nothing found — refine the query or pick a point on the map",
  },
  "org.form.map.apply": {
    uz: "Joyni saqlash",
    ru: "Сохранить место",
    en: "Save location",
  },
  "org.form.map.unavailable": {
    uz: "Xarita mavjud emas",
    ru: "Карта недоступна",
    en: "Map unavailable",
  },
  "org.form.map.unavailableBody": {
    uz: "Yandex Maps kaliti sozlanmagan — manzilni qoʻlda kiriting.",
    ru: "Ключ Yandex Maps не настроен — заполните адрес вручную.",
    en: "The Yandex Maps key is not configured — fill the address in by hand.",
  },
  "org.form.onlineUrl": { uz: "Havola", ru: "Ссылка", en: "Link" },
  "org.form.onlineUrlPlaceholder": {
    uz: "https://…",
    ru: "https://…",
    en: "https://…",
  },
  "org.form.description": { uz: "Tavsif", ru: "Описание", en: "Description" },
  "org.form.descriptionPlaceholder": {
    uz: "Mehmonlarni nima kutayotganini yozing…",
    ru: "Расскажите гостям, чего ожидать…",
    en: "Tell guests what to expect…",
  },
  "org.form.capacity": { uz: "Sigʻim", ru: "Вместимость", en: "Capacity" },
  "org.form.capacityPlaceholder": {
    uz: "masalan, 200",
    ru: "например, 200",
    en: "e.g. 200",
  },
  "org.form.capacityHint": {
    uz: "Jami joylar soni. Boʻsh qoldirsangiz — cheklovsiz.",
    ru: "Всего мест. Оставьте пустым — без ограничений.",
    en: "Total spots. Leave empty for no limit.",
  },

  // Form — pricing
  "org.form.pricing": { uz: "Narx", ru: "Стоимость", en: "Pricing" },
  "org.form.free": {
    uz: "Bepul tadbir",
    ru: "Бесплатное событие",
    en: "Free event",
  },
  "org.form.freeHint": {
    uz: "Mehmonlar bir marta bosib roʻyxatdan oʻtadi",
    ru: "Гости регистрируются в один клик",
    en: "Guests register in one tap",
  },
  "org.form.price": { uz: "Narx", ru: "Цена", en: "Price" },
  "org.form.pricePlaceholder": {
    uz: "masalan, 100000",
    ru: "например, 100000",
    en: "e.g. 100000",
  },
  "org.form.currency": { uz: "Valyuta", ru: "Валюта", en: "Currency" },
  "org.form.paidNote": {
    uz: "Pullik tadbirlar uchun bilet sotuvi veb-versiyada sozlanadi.",
    ru: "Продажа билетов для платных событий настраивается в веб-версии.",
    en: "Ticket sales for paid events are set up on the web.",
  },

  // Form — validation (localized, inline per field)
  "org.form.err.nameRequired": {
    uz: "Tadbir nomini kiriting",
    ru: "Укажите название события",
    en: "Enter an event name",
  },
  "org.form.err.nameShort": {
    uz: "Nom juda qisqa",
    ru: "Название слишком короткое",
    en: "Name is too short",
  },
  "org.form.err.dateRequired": {
    uz: "Sanani tanlang",
    ru: "Выберите дату",
    en: "Pick a date",
  },
  "org.form.err.datePast": {
    uz: "Sana kelajakda boʻlishi kerak",
    ru: "Дата должна быть в будущем",
    en: "The date must be in the future",
  },
  "org.form.err.endBeforeStart": {
    uz: "Tugash vaqti boshlanishdan keyin boʻlsin",
    ru: "Окончание должно быть после начала",
    en: "End must be after the start",
  },
  "org.form.err.venueRequired": {
    uz: "Joyni kiriting",
    ru: "Укажите площадку",
    en: "Enter a venue",
  },
  "org.form.err.urlRequired": {
    uz: "Havolani kiriting",
    ru: "Укажите ссылку",
    en: "Enter a link",
  },
  "org.form.err.priceRequired": {
    uz: "Narxni kiriting",
    ru: "Укажите цену",
    en: "Enter a price",
  },
  "org.form.err.capacityInvalid": {
    uz: "Notoʻgʻri son",
    ru: "Неверное число",
    en: "Invalid number",
  },
  "org.form.err.fix": {
    uz: "Belgilangan maydonlarni tekshiring",
    ru: "Проверьте отмеченные поля",
    en: "Check the highlighted fields",
  },

  // Form — toasts
  "org.form.toast.created": {
    uz: "Qoralama yaratildi",
    ru: "Черновик создан",
    en: "Draft created",
  },
  "org.form.toast.saved": {
    uz: "Oʻzgarishlar saqlandi",
    ru: "Изменения сохранены",
    en: "Changes saved",
  },
  "org.form.toast.error": {
    uz: "Saqlab boʻlmadi. Qayta urinib koʻring.",
    ru: "Не удалось сохранить. Попробуйте ещё раз.",
    en: "Couldn't save. Try again.",
  },

  // Manage (org event detail)
  "org.manage.title": {
    uz: "Tadbirni boshqarish",
    ru: "Управление событием",
    en: "Manage event",
  },
  "org.manage.a11yBack": { uz: "Orqaga", ru: "Назад", en: "Back" },
  "org.manage.stat.registered": {
    uz: "Roʻyxatda",
    ru: "Регистраций",
    en: "Registered",
  },
  "org.manage.stat.views": { uz: "Koʻrishlar", ru: "Просмотры", en: "Views" },
  "org.manage.stat.capacity": {
    uz: "Toʻldirilgan",
    ru: "Заполнено",
    en: "Filled",
  },
  "org.manage.edit": { uz: "Tahrirlash", ru: "Редактировать", en: "Edit" },
  "org.manage.submitReview": {
    uz: "Koʻrikka yuborish",
    ru: "Отправить на проверку",
    en: "Submit for review",
  },
  "org.manage.viewPublic": {
    uz: "Ommaviy sahifani koʻrish",
    ru: "Открыть публичную страницу",
    en: "View public page",
  },
  "org.manage.attendees": { uz: "Mehmonlar", ru: "Гости", en: "Attendees" },
  "org.manage.checkIn": {
    uz: "Kirishda qayd etish",
    ru: "Отметка на входе",
    en: "Check in",
  },
  "org.manage.cancel": {
    uz: "Tadbirni bekor qilish",
    ru: "Отменить событие",
    en: "Cancel event",
  },
  "org.manage.complete": {
    uz: "Tadbirni yakunlash",
    ru: "Завершить событие",
    en: "Complete event",
  },
  "org.manage.notFound": {
    uz: "Tadbir topilmadi",
    ru: "Событие не найдено",
    en: "Event not found",
  },
  "org.manage.notFoundBody": {
    uz: "Bu tadbir oʻchirilgan yoki mavjud emas.",
    ru: "Это событие удалено или недоступно.",
    en: "This event was removed or is unavailable.",
  },

  // Manage — status info bands
  "org.manage.draft.title": {
    uz: "Bu — qoralama",
    ru: "Это черновик",
    en: "This is a draft",
  },
  "org.manage.draft.body": {
    uz: "Faqat siz koʻrasiz. Koʻrikka yuboring — tasdiqlangach eʼlon qilinadi.",
    ru: "Виден только вам. Отправьте на проверку — после одобрения он опубликуется.",
    en: "Only you can see it. Submit it for review — once approved it goes public.",
  },
  "org.manage.pending.title": {
    uz: "Koʻrik kutilmoqda",
    ru: "На проверке",
    en: "In review",
  },
  "org.manage.pending.body": {
    uz: "Tadbir moderatsiyada. Tasdiqlangach eʼlon qilinadi — bu odatda bir necha soat ichida.",
    ru: "Событие на модерации. После одобрения оно будет опубликовано — обычно в течение нескольких часов.",
    en: "Your event is under moderation. It'll be published once approved — usually within a few hours.",
  },
  "org.manage.cancelled.title": {
    uz: "Tadbir bekor qilingan",
    ru: "Событие отменено",
    en: "Event cancelled",
  },
  "org.manage.cancelled.body": {
    uz: "Bu tadbir bekor qilingan va roʻyxatga ochiq emas.",
    ru: "Это событие отменено и закрыто для регистрации.",
    en: "This event is cancelled and closed to registration.",
  },
  "org.manage.completed.title": {
    uz: "Tadbir yakunlangan",
    ru: "Событие завершено",
    en: "Event completed",
  },
  "org.manage.completed.body": {
    uz: "Bu tadbir oʻtdi. Statistika arxivda saqlanadi.",
    ru: "Это событие прошло. Статистика сохранена в архиве.",
    en: "This event has ended. Its stats stay in the archive.",
  },

  // Manage — cancel / complete confirms + toasts
  "org.manage.cancel.confirmTitle": {
    uz: "Tadbir bekor qilinsinmi?",
    ru: "Отменить событие?",
    en: "Cancel this event?",
  },
  "org.manage.cancel.confirmBody": {
    uz: "Roʻyxat yopiladi va mehmonlarga xabar berilishi mumkin. Buni qaytarib boʻlmaydi.",
    ru: "Регистрация закроется, гостей могут уведомить. Это действие необратимо.",
    en: "Registration closes and guests may be notified. This can't be undone.",
  },
  "org.manage.cancel.confirm": {
    uz: "Bekor qilish",
    ru: "Отменить событие",
    en: "Cancel event",
  },
  "org.manage.cancel.dismiss": { uz: "Orqaga", ru: "Назад", en: "Keep it" },
  "org.manage.complete.confirmTitle": {
    uz: "Tadbir yakunlansinmi?",
    ru: "Завершить событие?",
    en: "Complete this event?",
  },
  "org.manage.complete.confirmBody": {
    uz: "Tadbir tugagan deb belgilanadi. Soʻngra sertifikatlar berish mumkin.",
    ru: "Событие будет отмечено как завершённое. После этого можно выдавать сертификаты.",
    en: "The event will be marked as finished. You can issue certificates afterwards.",
  },
  "org.manage.complete.confirm": {
    uz: "Yakunlash",
    ru: "Завершить",
    en: "Complete",
  },
  "org.manage.complete.dismiss": { uz: "Orqaga", ru: "Назад", en: "Not yet" },
  "org.manage.toast.cancelled": {
    uz: "Tadbir bekor qilindi",
    ru: "Событие отменено",
    en: "Event cancelled",
  },
  "org.manage.toast.completed": {
    uz: "Tadbir yakunlandi",
    ru: "Событие завершено",
    en: "Event completed",
  },
  "org.manage.toast.actionError": {
    uz: "Amalni bajarib boʻlmadi. Qayta urinib koʻring.",
    ru: "Не удалось выполнить действие. Попробуйте ещё раз.",
    en: "Couldn't complete the action. Try again.",
  },

  // Review — submit confirm + submitted success moment
  "org.review.confirmTitle": {
    uz: "Koʻrikka yuborilsinmi?",
    ru: "Отправить на проверку?",
    en: "Submit for review?",
  },
  "org.review.confirmBody": {
    uz: "Jamoamiz tadbirni koʻrib chiqadi. Tasdiqlangach avtomatik eʼlon qilinadi.",
    ru: "Наша команда проверит событие. После одобрения оно опубликуется автоматически.",
    en: "Our team will review your event. It publishes automatically once approved.",
  },
  "org.review.confirm": { uz: "Yuborish", ru: "Отправить", en: "Submit" },
  "org.review.dismiss": { uz: "Orqaga", ru: "Назад", en: "Not yet" },
  "org.review.submitted.title": {
    uz: "Koʻrikka yuborildi",
    ru: "Отправлено на проверку",
    en: "Sent for review",
  },
  "org.review.submitted.body": {
    uz: "«{name}» moderatsiyaga tushdi. Tasdiqlangach eʼlon qilinadi — bildirishnoma yuboramiz.",
    ru: "«{name}» отправлено на модерацию. После одобрения оно будет опубликовано — мы уведомим вас.",
    en: "“{name}” is now under moderation. We'll publish it once it's approved and let you know.",
  },
  "org.review.submitted.next": {
    uz: "Keyingi bosqich",
    ru: "Что дальше",
    en: "What's next",
  },
  "org.review.submitted.step1": {
    uz: "Jamoamiz tadbirni koʻrib chiqadi",
    ru: "Наша команда проверит событие",
    en: "Our team reviews your event",
  },
  "org.review.submitted.step2": {
    uz: "Tasdiqlangach — u afishada paydo boʻladi",
    ru: "После одобрения оно появится в афише",
    en: "Once approved, it appears in the listings",
  },
  "org.review.submitted.done": {
    uz: "Tadbirlarga qaytish",
    ru: "К списку событий",
    en: "Back to events",
  },
  "org.review.toast.error": {
    uz: "Yuborib boʻlmadi. Qayta urinib koʻring.",
    ru: "Не удалось отправить. Попробуйте ещё раз.",
    en: "Couldn't submit. Try again.",
  },

  // Review — unverified-org explainer (403 hand-off, first-class, not a toast)
  "org.review.locked.title": {
    uz: "Avval tashkilotni tasdiqlang",
    ru: "Сначала подтвердите организацию",
    en: "Verify your organization first",
  },
  "org.review.locked.body": {
    uz: "Tadbirlarni eʼlon qilishdan oldin tashkilot tasdiqdan oʻtishi kerak. Tasdiqlash biz mehmonlarga ishonchli tadbirlar koʻrsatishimizga yordam beradi.",
    ru: "Прежде чем публиковать события, организация должна пройти проверку. Она помогает нам показывать гостям надёжные события.",
    en: "Before you can publish events, your organization needs to be verified. Verification helps us show guests events they can trust.",
  },
  "org.review.locked.web": {
    uz: "Vebda tasdiqdan oʻtish",
    ru: "Пройти проверку в вебе",
    en: "Verify on the web",
  },
  "org.review.locked.dismiss": {
    uz: "Qoralama sifatida saqlash",
    ru: "Оставить черновиком",
    en: "Keep as draft",
  },
  "org.review.locked.webHint": {
    uz: "Tasdiqlash brauzerda, tashkilot sozlamalarida amalga oshiriladi.",
    ru: "Проверка проходит в браузере, в настройках организации.",
    en: "Verification is done in the browser, in your organization settings.",
  },

  // --- W8: attendees / scanner polish + team + org profile (append-only) ─────
  // Attendees — pagination footer + list count
  "org.attendees.showing": {
    uz: "{shown} / {total} koʻrsatildi",
    ru: "Показано {shown} из {total}",
    en: "Showing {shown} of {total}",
  },
  "org.attendees.loadingMore": {
    uz: "Yuklanmoqda…",
    ru: "Загрузка…",
    en: "Loading more…",
  },

  // Scanner — camera denial recovery + torch a11y
  "org.scan.settings.title": {
    uz: "Kamera ruxsati oʻchirilgan",
    ru: "Доступ к камере отключён",
    en: "Camera access is off",
  },
  "org.scan.settings.body": {
    uz: "Skanerlash uchun tizim sozlamalarida kameraga ruxsat bering yoki kodni qoʻlda kiriting.",
    ru: "Чтобы сканировать, включите доступ к камере в настройках системы или введите код вручную.",
    en: "To scan, enable camera access in Settings, or enter the code manually.",
  },
  "org.scan.settings.open": {
    uz: "Sozlamalarni ochish",
    ru: "Открыть настройки",
    en: "Open Settings",
  },
  // ── door scanner · design 4.9 (live viewfinder + verdict card) ──
  "org.scan.aim": {
    uz: "Bilet QR kodiga qarating",
    ru: "Наведите на QR билета",
    en: "Point at the ticket QR",
  },
  "org.scan.reading": { uz: "Oʻqilyapti…", ru: "Считываем…", en: "Reading…" },
  "org.scan.holdSteady": {
    uz: "Telefonni tekis ushlang",
    ru: "Держите телефон ровно",
    en: "Hold the phone steady",
  },
  "org.scan.manualEntry": {
    uz: "Kodni qoʻlda kiritish",
    ru: "Ввести код вручную",
    en: "Enter the code manually",
  },
  "org.scan.viewfinder": {
    uz: "Bilet QR · kamera",
    ru: "QR билета · камера",
    en: "Ticket QR · camera",
  },
  "org.scan.ticket": { uz: "Bilet", ru: "Билет", en: "Ticket" },
  "org.scan.code": { uz: "Kod", ru: "Код", en: "Code" },
  "org.scan.already.body": {
    uz: "Ishtirokchi bugun allaqachon belgilangan.",
    ru: "Участник уже отмечен сегодня.",
    en: "This participant is already checked in today.",
  },
  // There is no offline queue yet, so this must NOT read like "we saved it".
  "org.scan.offline.title": {
    uz: "Tarmoq yoʻq",
    ru: "Нет сети",
    en: "No connection",
  },
  "org.scan.offline.body": {
    uz: "Belgilash saqlanmadi. Tarmoq tiklanganda QR kodni qayta skanerlang.",
    ru: "Отметка не сохранена. Отсканируйте QR снова, когда появится сеть.",
    en: "The check-in was not saved. Scan the QR again once you're back online.",
  },

  "org.scan.torch": { uz: "Chiroq", ru: "Фонарик", en: "Torch" },
  "org.scan.searchByName": {
    uz: "Ism boʻyicha qidirish",
    ru: "Искать по имени",
    en: "Search by name",
  },
  "org.scan.welcome": {
    uz: "Xush kelibsiz — tadbirdan bahra oling.",
    ru: "Добро пожаловать — приятного вечера.",
    en: "Welcome — enjoy the event.",
  },
  "org.scan.notfound.body": {
    uz: "Bu kod bu tadbir uchun yaroqli emas. Boshqa sanaga tegishli yoki bekor qilingan boʻlishi mumkin.",
    ru: "Этот код недействителен для события. Возможно, он для другой даты или уже возвращён.",
    en: "This code isn't valid for this event. It may be for another date, or already refunded.",
  },

  // Team — screen (design 22 §5.5) + roles + invite sheet
  "org.team.title": { uz: "Jamoa", ru: "Команда", en: "Team" },
  "org.team.count": {
    uz: "Jamoa · {n}",
    ru: "Команда · {n}",
    en: "Team · {n}",
  },
  "org.team.sub": {
    uz: "Aʼzolar va takliflar",
    ru: "Участники и приглашения",
    en: "Members and invites",
  },
  "org.team.you": { uz: "Siz", ru: "Вы", en: "You" },
  "org.team.pending.title": {
    uz: "Kutilayotgan takliflar",
    ru: "Ожидающие приглашения",
    en: "Pending invites",
  },
  "org.team.invite.sent": {
    uz: "Taklif yuborildi · kutilmoqda",
    ru: "Приглашение отправлено · ожидает",
    en: "Invite sent · pending",
  },
  "org.team.invite.expired": {
    uz: "Muddati oʻtgan",
    ru: "Истекло",
    en: "Expired",
  },
  "org.team.resend": {
    uz: "Qayta yuborish",
    ru: "Отправить снова",
    en: "Resend",
  },
  "org.team.resent": { uz: "Yuborildi", ru: "Отправлено", en: "Sent" },
  "org.team.revoke": { uz: "Bekor qilish", ru: "Отозвать", en: "Revoke" },
  "org.team.revoke.title": {
    uz: "Taklifni bekor qilasizmi?",
    ru: "Отозвать приглашение?",
    en: "Revoke invite?",
  },
  "org.team.revoke.body": {
    uz: "«{email}» uchun taklif havolasi ishlamay qoladi.",
    ru: "Ссылка-приглашение для «{email}» перестанет работать.",
    en: "The invite link for “{email}” will stop working.",
  },
  "org.team.resend.error": {
    uz: "Qayta yuborib boʻlmadi. Keyinroq urinib koʻring.",
    ru: "Не удалось отправить снова. Попробуйте позже.",
    en: "Couldn't resend. Try again later.",
  },
  "org.team.revoke.error": {
    uz: "Bekor qilib boʻlmadi. Keyinroq urinib koʻring.",
    ru: "Не удалось отозвать. Попробуйте позже.",
    en: "Couldn't revoke. Try again later.",
  },
  "org.team.empty.title": {
    uz: "Jamoada faqat siz",
    ru: "В команде только вы",
    en: "You're the only member",
  },
  "org.team.empty.body": {
    uz: "Tadbirlarni birga boshqarish uchun hamkasblaringizni taklif qiling.",
    ru: "Пригласите коллег, чтобы вести события вместе.",
    en: "Invite teammates to run events together.",
  },
  "org.team.error": {
    uz: "Jamoani yuklab boʻlmadi",
    ru: "Не удалось загрузить команду",
    en: "Couldn't load the team",
  },
  "org.team.inviteCta": {
    uz: "Jamoaga aʼzo taklif qilish",
    ru: "Пригласить участника",
    en: "Invite a team member",
  },
  "org.team.inviteShort": { uz: "Taklif", ru: "Пригласить", en: "Invite" },
  // Invite sheet
  "org.team.sheet.title": {
    uz: "Jamoaga taklif qilish",
    ru: "Пригласить в команду",
    en: "Invite to the team",
  },
  "org.team.sheet.sub": {
    uz: "Havola bilan email yuboramiz. Aʼzo istalgan qurilmadan qoʻshiladi.",
    ru: "Отправим письмо со ссылкой. Участник присоединится с любого устройства.",
    en: "We'll email a link. They can join from any device.",
  },
  "org.team.sheet.email": {
    uz: "Email manzil",
    ru: "Электронная почта",
    en: "Email address",
  },
  "org.team.sheet.emailPlaceholder": {
    uz: "hamkasb@example.com",
    ru: "colleague@example.com",
    en: "colleague@example.com",
  },
  "org.team.sheet.role": { uz: "Rol", ru: "Роль", en: "Role" },
  "org.team.sheet.send": {
    uz: "Taklif yuborish",
    ru: "Отправить приглашение",
    en: "Send invite",
  },
  "org.team.sheet.sent": {
    uz: "«{email}» ga taklif yuborildi",
    ru: "Приглашение отправлено на «{email}»",
    en: "Invite sent to “{email}”",
  },
  "org.team.sheet.error": {
    uz: "Taklifni yuborib boʻlmadi. Emailni tekshiring.",
    ru: "Не удалось отправить приглашение. Проверьте email.",
    en: "Couldn't send the invite. Check the email.",
  },
  "org.team.sheet.invalidEmail": {
    uz: "Yaroqli email kiriting",
    ru: "Введите корректный email",
    en: "Enter a valid email",
  },
  "org.team.sheet.rolesError": {
    uz: "Rollarni yuklab boʻlmadi",
    ru: "Не удалось загрузить роли",
    en: "Couldn't load roles",
  },
  // Localized role names (system-role catalog; custom roles fall back to raw)
  "org.team.role.owner": { uz: "Egasi", ru: "Владелец", en: "Owner" },
  "org.team.role.admin": {
    uz: "Administrator",
    ru: "Администратор",
    en: "Admin",
  },
  "org.team.role.editor": { uz: "Muharrir", ru: "Редактор", en: "Editor" },
  "org.team.role.manager": { uz: "Menejer", ru: "Менеджер", en: "Manager" },
  "org.team.role.doorStaff": {
    uz: "Kirish xodimi",
    ru: "Сотрудник на входе",
    en: "Door staff",
  },
  "org.team.role.member": { uz: "Xodim", ru: "Сотрудник", en: "Employee" },
  "org.team.role.viewer": { uz: "Kuzatuvchi", ru: "Наблюдатель", en: "Viewer" },

  // Org profile (design 22) — identity, stats, public-profile rows, team preview
  "org.profile.handle": { uz: "@{handle}", ru: "@{handle}", en: "@{handle}" },
  "org.profile.stat.events": { uz: "TADBIRLAR", ru: "СОБЫТИЯ", en: "EVENTS" },
  "org.profile.stat.followers": {
    uz: "OBUNACHILAR",
    ru: "ПОДПИСЧИКИ",
    en: "FOLLOWERS",
  },
  "org.profile.public.section": {
    uz: "OMMAVIY PROFIL",
    ru: "ПУБЛИЧНЫЙ ПРОФИЛЬ",
    en: "PUBLIC PROFILE",
  },
  "org.profile.public.name": { uz: "Nomi", ru: "Название", en: "Name" },
  "org.profile.public.bio": { uz: "Tavsif", ru: "Описание", en: "Bio" },
  "org.profile.public.links": { uz: "Havolalar", ru: "Ссылки", en: "Links" },
  "org.profile.public.location": {
    uz: "Manzil",
    ru: "Местоположение",
    en: "Location",
  },
  "org.profile.public.empty": {
    uz: "Koʻrsatilmagan",
    ru: "Не указано",
    en: "Not set",
  },
  "org.profile.public.hint": {
    uz: "Ommaviy profil brauzerda tahrirlanadi.",
    ru: "Публичный профиль редактируется в браузере.",
    en: "Your public profile is edited in the browser.",
  },
  "org.profile.teamSection": { uz: "JAMOA", ru: "КОМАНДА", en: "TEAM" },
  "org.profile.teamManage": { uz: "Boshqarish", ru: "Управлять", en: "Manage" },
  "org.profile.settings": {
    uz: "Tashkilot sozlamalari",
    ru: "Настройки организации",
    en: "Organization settings",
  },

  // --- Social sign-in (Google / LinkedIn) — parity with web (append-only) ─────
  "auth.social.continueWith": {
    uz: "Yoki davom eting",
    ru: "Или продолжите с",
    en: "Or continue with",
  },
  "auth.social.google": { uz: "Google", ru: "Google", en: "Google" },
  "auth.social.linkedin": { uz: "LinkedIn", ru: "LinkedIn", en: "LinkedIn" },
  "auth.social.error": {
    uz: "Kirib boʻlmadi. Qayta urinib koʻring.",
    ru: "Не удалось войти. Попробуйте снова.",
    en: "Sign-in failed. Please try again.",
  },

  // --- Organization tab + org profile editor (append-only) ───────────────────
  // Verification is a state the owner can ACT on, so each state says what is
  // happening and what to do — a bare "In review" chip taught nothing, and a
  // REJECTED org used to read as "In review" forever.
  "org.verify.pending.title": {
    uz: "Tekshiruvda",
    ru: "На проверке",
    en: "Under review",
  },
  "org.verify.pending.body": {
    uz: "Hujjatlaringiz koʻrib chiqilmoqda. Shu vaqt ichida tadbir yaratib, eʼlon qilishingiz mumkin.",
    ru: "Мы проверяем документы организации. Создавать и публиковать события можно уже сейчас.",
    en: "We're reviewing your organization's documents. You can create and publish events in the meantime.",
  },
  "org.verify.rejected.title": {
    uz: "Tasdiqlanmadi",
    ru: "Верификация отклонена",
    en: "Verification declined",
  },
  "org.verify.rejected.body": {
    uz: "Maʼlumotlarni toʻgʻrilab, brauzerdan qayta yuboring.",
    ru: "Исправьте данные и отправьте заявку повторно из браузера.",
    en: "Fix the details and re-submit from the browser.",
  },
  // Stamped with a middot, not "с {date}" / "{date} dan beri": `Intl` gives a
  // month in the NOMINATIVE ("апрель"), and both Russian "с …" and Uzbek
  // "…dan beri" require an inflected form ("с апреля", "apreldan"). A stamp
  // needs no preposition and is right in all three languages.
  "org.verify.approved.since": {
    uz: "Tasdiqlangan · {date}",
    ru: "Подтверждена · {date}",
    en: "Verified · {date}",
  },
  "org.profile.since": {
    uz: "EventFlow'da · {date}",
    ru: "На EventFlow · {date}",
    en: "On EventFlow · {date}",
  },
  "org.profile.inn": { uz: "STIR {inn}", ru: "ИНН {inn}", en: "TIN {inn}" },
  "org.profile.stat.team": { uz: "JAMOA", ru: "КОМАНДА", en: "TEAM" },
  "org.profile.edit": { uz: "Tahrirlash", ru: "Редактировать", en: "Edit" },
  // Button-length label. `org.profile.viewPublic` is the full sentence and
  // stays the a11y/menu wording; a `Btn` clips at one line, and "Открыть
  // публичную страницу" does not fit beside "Редактировать" on a 402pt phone.
  "org.profile.publicPage": {
    uz: "Ommaviy sahifa",
    ru: "Публичная страница",
    en: "Public page",
  },
  "org.profile.public.blank": {
    uz: "Tavsif, sayt va manzil hali koʻrsatilmagan — ular ommaviy sahifada koʻrinadi.",
    ru: "Описание, сайт и адрес не заполнены — именно их видят участники на публичной странице.",
    en: "No bio, site or address yet — these are what attendees see on your public page.",
  },
  "org.profile.readOnly": {
    uz: "Tashkilot profilini faqat egasi tahrirlaydi.",
    ru: "Профиль организации редактирует владелец.",
    en: "Only the owner can edit the organization profile.",
  },
  "org.profile.planSection": { uz: "TARIF", ru: "ТАРИФ", en: "PLAN" },
  "org.profile.appSection": { uz: "ILOVA", ru: "ПРИЛОЖЕНИЕ", en: "APP" },
  "org.profile.orgSection": {
    uz: "TASHKILOT",
    ru: "ОРГАНИЗАЦИЯ",
    en: "ORGANIZATION",
  },
  "org.profile.switch": {
    uz: "Ish maydonini almashtirish",
    ru: "Сменить пространство",
    en: "Switch workspace",
  },
  "org.plan.seats": {
    uz: "{n} ta xodim oʻrni",
    ru: "Мест для сотрудников: {n}",
    en: "{n} staff seats",
  },
  "org.plan.eventsUsed": {
    uz: "{limit} tadan {used} ta tadbir",
    ru: "Событий: {used} из {limit}",
    en: "{used} of {limit} events",
  },

  "org.edit.title": {
    uz: "Tashkilot profili",
    ru: "Профиль организации",
    en: "Organization profile",
  },
  "org.edit.intro": {
    uz: "Shu maʼlumotlar ommaviy sahifangizda va har bir tadbir kartasida koʻrinadi.",
    ru: "Эти данные видят участники — на публичной странице и в карточке каждого события.",
    en: "This is what attendees see — on your public page and on every event card.",
  },
  "org.edit.logoAdd": {
    uz: "Logotip qoʻshish",
    ru: "Добавить логотип",
    en: "Add a logo",
  },
  "org.edit.logoChange": {
    uz: "Logotipni almashtirish",
    ru: "Заменить логотип",
    en: "Replace logo",
  },
  "org.edit.logoRemove.title": {
    uz: "Logotip oʻchirilsinmi?",
    ru: "Удалить логотип?",
    en: "Remove the logo?",
  },
  "org.edit.logoRemove.body": {
    uz: "Uning oʻrnida tashkilot nomining bosh harflari koʻrinadi.",
    ru: "Вместо него будут показаны инициалы названия.",
    en: "Your organization's initials will show instead.",
  },
  "org.edit.photoPermission": {
    uz: "Rasm tanlash uchun galereyaga ruxsat bering.",
    ru: "Разрешите доступ к галерее, чтобы выбрать изображение.",
    en: "Allow photo access to pick an image.",
  },
  "org.edit.name": { uz: "Nomi", ru: "Название", en: "Name" },
  "org.edit.name.hint": {
    uz: "Ishtirokchilar sizni shu nom bilan taniydi.",
    ru: "Под этим именем вас видят участники.",
    en: "The name attendees know you by.",
  },
  "org.edit.bio": { uz: "Tavsif", ru: "Описание", en: "Bio" },
  "org.edit.bio.hint": {
    uz: "Nima bilan shugʻullanasiz va kimlar uchun tadbir qilasiz — 1–2 jumla.",
    ru: "Чем занимаетесь и для кого проводите события — одно-два предложения.",
    en: "What you do and who you run events for — a sentence or two.",
  },
  "org.edit.website": { uz: "Sayt", ru: "Сайт", en: "Website" },
  "org.edit.address": { uz: "Manzil", ru: "Адрес", en: "Address" },
  "org.edit.address.hint": {
    uz: "Shahar va koʻcha — ommaviy sahifada koʻrinadi.",
    ru: "Город и улица — показываются на публичной странице.",
    en: "City and street — shown on your public page.",
  },
  "org.edit.phone": { uz: "Telefon", ru: "Телефон", en: "Phone" },
  "org.edit.phone.hint": {
    uz: "Ichki maʼlumot: qoʻllab-quvvatlash xizmati bogʻlanishi uchun.",
    ru: "Внутреннее поле: по нему с вами связывается поддержка.",
    en: "Internal: how support reaches you.",
  },
  "org.edit.name.required": {
    uz: "Tashkilot nomini kiriting",
    ru: "Введите название организации",
    en: "Enter the organization name",
  },
  "org.edit.website.invalid": {
    uz: "Sayt manzili example.com koʻrinishida boʻlsin",
    ru: "Адрес сайта в формате example.com",
    en: "Use a site address like example.com",
  },
  "org.edit.phone.invalid": {
    uz: "Telefonni xalqaro formatda kiriting: +998 90 123 45 67",
    ru: "Телефон в международном формате: +998 90 123 45 67",
    en: "Use an international format: +998 90 123 45 67",
  },
  "org.edit.saved": {
    uz: "Profil saqlandi",
    ru: "Профиль сохранён",
    en: "Profile saved",
  },
  "org.edit.logoSaved": {
    uz: "Logotip yangilandi",
    ru: "Логотип обновлён",
    en: "Logo updated",
  },
  "org.edit.error": {
    uz: "Saqlab boʻlmadi. Qayta urinib koʻring.",
    ru: "Не удалось сохранить. Попробуйте снова.",
    en: "Couldn't save. Try again.",
  },
  "org.edit.forbidden": {
    uz: "Tashkilot profilini faqat egasi oʻzgartira oladi.",
    ru: "Изменять профиль организации может только владелец.",
    en: "Only the owner can change the organization profile.",
  },

  // --- 4.4 long-press по карточке события (append-only) ─────────────────────
  "org.events.regUntil": {
    uz: "Roʻyxat {date} gacha",
    ru: "Регистрация до {date}",
    en: "Registration until {date}",
  },
  "org.events.actions.delete": {
    uz: "Qoralamani oʻchirish",
    ru: "Удалить черновик",
    en: "Delete draft",
  },
  "org.events.actions.delete.title": {
    uz: "Qoralama oʻchirilsinmi?",
    ru: "Удалить черновик?",
    en: "Delete this draft?",
  },
  "org.events.actions.delete.body": {
    uz: "«{title}» butunlay oʻchiriladi. Buni ortga qaytarib boʻlmaydi.",
    ru: "«{title}» будет удалён безвозвратно.",
    en: "“{title}” will be deleted for good.",
  },
  "org.events.actions.cancel": {
    uz: "Tadbirni bekor qilish",
    ru: "Отменить событие",
    en: "Cancel event",
  },
  "org.events.actions.cancel.title": {
    uz: "Tadbir bekor qilinsinmi?",
    ru: "Отменить событие?",
    en: "Cancel this event?",
  },
  "org.events.actions.cancel.body": {
    uz: "«{title}» bekor qilinadi, roʻyxatdan oʻtganlar xabar oladi.",
    ru: "«{title}» будет отменено, зарегистрированные получат уведомление.",
    en: "“{title}” will be cancelled and registered people notified.",
  },
  "org.events.actions.liveNote": {
    uz: "Eʼlon qilingan tadbir oʻchirilmaydi — u bekor qilinadi, aks holda ishtirokchilar havolada boʻshliqni topadi.",
    ru: "Опубликованное событие не удаляется, а отменяется — иначе участники найдут по ссылке пустоту.",
    en: "A published event is cancelled, not deleted — otherwise its attendees just find a dead link.",
  },
  "org.events.actions.duplicateSoon": {
    uz: "Nusxalash hozircha veb-kabinetda",
    ru: "Дублирование пока в веб-кабинете",
    en: "Duplicating is web-only for now",
  },

  // --- 2.6 центр уведомлений (append-only) ──────────────────────────────────
  // Фразы собираются ЗДЕСЬ из типа и подстановок: сервер хранит тип и payload,
  // а не готовое предложение, — иначе узбекский интерфейс показывал бы русский.
  "notif.title": {
    uz: "Bildirishnomalar",
    ru: "Уведомления",
    en: "Notifications",
  },
  "notif.markAll": {
    uz: "Hammasini oʻqilgan deb belgilash",
    ru: "Прочитать всё",
    en: "Mark all read",
  },
  "notif.empty.title": {
    uz: "Bildirishnomalar yoʻq",
    ru: "Уведомлений нет",
    en: "No notifications",
  },
  "notif.empty.body": {
    uz: "Yangi arizalar va moderatsiya qarorlari shu yerda paydo boʻladi.",
    ru: "Здесь появятся новые заявки и решения модерации.",
    en: "New registrations and moderation decisions will show up here.",
  },
  "notif.REGISTRATION_CREATED": {
    uz: "«{event}» ga yangi ariza",
    ru: "Новая заявка на «{event}»",
    en: "New registration for “{event}”",
  },
  "notif.REGISTRATION_APPROVED": {
    uz: "«{event}» uchun ariza tasdiqlandi",
    ru: "Заявка на «{event}» одобрена",
    en: "Registration for “{event}” approved",
  },
  "notif.REGISTRATION_REJECTED": {
    uz: "«{event}» uchun ariza rad etildi",
    ru: "Заявка на «{event}» отклонена",
    en: "Registration for “{event}” rejected",
  },
  "notif.EVENT_PUBLISHED": {
    uz: "«{event}» eʼlon qilindi",
    ru: "Событие «{event}» опубликовано",
    en: "“{event}” is published",
  },
  "notif.EVENT_REJECTED": {
    uz: "«{event}» moderatsiyadan oʻtmadi",
    ru: "Событие «{event}» не прошло модерацию",
    en: "“{event}” did not pass moderation",
  },
  // Без глагола: русский требует согласования по роду, а пола в контракте нет —
  // «Нигора Каримова присоединился» это заметно и стыдно.
  "notif.MEMBER_JOINED": {
    uz: "Jamoada yangi aʼzo: {person}",
    ru: "Новый участник команды: {person}",
    en: "{person} joined the team",
  },
  "notif.ORG_VERIFIED": {
    uz: "Tashkilot tasdiqlandi",
    ru: "Организация подтверждена",
    en: "Organization verified",
  },
  "notif.ORG_VERIFICATION_REJECTED": {
    uz: "Tashkilot tasdiqlanmadi",
    ru: "Верификация организации отклонена",
    en: "Organization verification declined",
  },

  // --- 4.8b: причина отклонения + потолок тарифа (append-only) ───────────────
  "attendees.reject.reason": {
    uz: "Rad etish sababi",
    ru: "Причина отклонения",
    en: "Reason for rejection",
  },
  "attendees.reject.reasonHint": {
    uz: "Sabab ishtirokchiga xat bilan yuboriladi",
    ru: "Причина уйдёт участнику в письме",
    en: "The reason is emailed to the participant",
  },
  "attendees.reject.reasonPlaceholder": {
    uz: "Masalan: tadbir faqat hamkor kompaniyalar xodimlari uchun.",
    ru: "Например: мероприятие только для сотрудников партнёрских компаний.",
    en: "For example: this event is for partner-company staff only.",
  },
  "attendees.reject.optional": {
    uz: "Sababsiz ham rad etish mumkin",
    ru: "Можно отклонить и без причины",
    en: "You can reject without a reason",
  },
  "attendees.limit.title": {
    uz: "Ishtirokchilar limiti tugadi",
    ru: "Лимит участников исчерпан",
    en: "Participant limit reached",
  },
  "attendees.limit.planLimit": {
    uz: "{tier} tarifi limiti",
    ru: "Лимит тарифа {tier}",
    en: "{tier} plan limit",
  },
  "attendees.limit.used": {
    uz: "Foydalanilgan",
    ru: "Использовано",
    en: "Used",
  },
  "attendees.limit.requested": {
    uz: "Hozir soʻralgan",
    ru: "Запрошено сейчас",
    en: "Requested now",
  },
  "attendees.limit.body": {
    uz: "Limitni oshirish uchun tarifni veb-kabinetda oʻzgartiring — mobil ilovada toʻlov yoʻq.",
    ru: "Чтобы поднять лимит, смените тариф в веб-кабинете — оплаты в мобильном приложении нет.",
    en: "Raise the ceiling by changing the plan in the web workspace — there is no checkout in the app.",
  },
  "attendees.limit.openPlan": {
    uz: "Tarifni koʻrish",
    ru: "Открыть тариф",
    en: "View plan",
  },
  "common.later": { uz: "Keyinroq", ru: "Позже", en: "Later" },

  "org.public.legalName": {
    uz: "Yuridik nomi",
    ru: "Юридическое лицо",
    en: "Legal entity",
  },
  "org.public.verifiedSince": {
    uz: "Tasdiqlangan tashkilot · {date}",
    ru: "Проверенная организация · {date}",
    en: "Verified organization · {date}",
  },

  // --- BL-15: push-ядро (append-only) ───────────────────────────────────────
  // Prime-экран показывается ДО системного диалога: тексты объясняют ценность
  // (билет, напоминание, статус заявки) и намеренно календарно-нейтральны.
  "notifPerm.title": {
    uz: "Bildirishnomalarni yoqasizmi?",
    ru: "Включить уведомления?",
    en: "Turn on notifications?",
  },
  "notifPerm.body": {
    uz: "Chipta, boshlanishidan oldin eslatma va ariza boʻyicha qaror darhol keladi — pochtani tekshirish shart emas.",
    ru: "Билет, напоминание перед началом и решение по заявке будут приходить сразу — без проверки почты.",
    en: "Your ticket, a heads-up before start and decisions on your registration arrive instantly — no need to watch your inbox.",
  },
  "notifPerm.enable": { uz: "Yoqish", ru: "Включить", en: "Turn on" },
  "notifPerm.denied.title": {
    uz: "Bildirishnomalar oʻchirilgan",
    ru: "Уведомления выключены в системе",
    en: "Notifications are off in Settings",
  },
  "notifPerm.denied.body": {
    uz: "Telefon sozlamalarida EventFlow bildirishnomalariga ruxsat bering — aks holda chiptalar va eslatmalar yetib bormaydi.",
    ru: "Разрешите уведомления EventFlow в настройках телефона — иначе билеты и напоминания не дойдут.",
    en: "Allow EventFlow notifications in your phone settings — otherwise tickets and reminders will not arrive.",
  },
  "notifPerm.openSettings": {
    uz: "Sozlamalarni ochish",
    ru: "Открыть настройки",
    en: "Open Settings",
  },
  // Имена каналов Android — их видно в системных настройках уведомлений.
  "notifChannel.transactional": {
    uz: "Muhim bildirishnomalar",
    ru: "Важные уведомления",
    en: "Important notifications",
  },
  "notifChannel.reminders": {
    uz: "Eslatmalar",
    ru: "Напоминания",
    en: "Reminders",
  },
  "notifChannel.updates": {
    uz: "Yangilanishlar",
    ru: "Обновления",
    en: "Updates",
  },

  // --- BL-21: настройки уведомлений (append-only) ───────────────────────────
  // Названия ключей — человеческие имена preference-ключей каталога (раздел 9).
  "notifSettings.title": {
    uz: "Bildirishnomalar",
    ru: "Уведомления",
    en: "Notifications",
  },
  "notifSettings.lockedTitle": {
    uz: "Doimo yoniq",
    ru: "Всегда включены",
    en: "Always on",
  },
  "notifSettings.lockedHint": {
    uz: "Chipta, toʻlov va ariza boʻyicha qarorlar oʻchirilmaydi.",
    ru: "Билеты, оплата и решения по заявкам — их отключить нельзя.",
    en: "Tickets, payments and registration decisions cannot be switched off.",
  },
  "notifSettings.channel.push": { uz: "Push", ru: "Push", en: "Push" },
  "notifSettings.channel.email": { uz: "Email", ru: "Email", en: "Email" },
  "notifSettings.key.event_reminders": {
    uz: "Tadbir eslatmalari",
    ru: "Напоминания о событиях",
    en: "Event reminders",
  },
  "notifSettings.key.saved_event_alerts": {
    uz: "Saqlangan tadbirlar",
    ru: "Сохранённые события",
    en: "Saved events",
  },
  "notifSettings.key.registration_status": {
    uz: "Ariza holati",
    ru: "Статус заявки",
    en: "Registration status",
  },
  "notifSettings.key.summary": {
    uz: "Tadbir yakunlari",
    ru: "Итоги события",
    en: "Event summaries",
  },
  "notifSettings.key.organizer_registrations": {
    uz: "Tadbirlaringizga arizalar",
    ru: "Заявки на ваши события",
    en: "Registrations to your events",
  },
  "notifSettings.key.organizer_broadcast": {
    uz: "Tashkilotchilar xabarlari",
    ru: "Рассылки организаторов",
    en: "Organizer announcements",
  },

  // --- Инбоксы уведомлений: новые типы каталога (append-only) ───────────────
  // Организаторская лента: 7 типов CONTRACT_DIFF §5 без словаря. Фраза
  // собирается на клиенте из type + payload — как у остальных notif.*.
  "notif.EVENT_SUBMITTED": {
    uz: "«{event}» moderatsiyaga yuborildi",
    ru: "Событие «{event}» отправлено на модерацию",
    en: "“{event}” submitted for moderation",
  },
  "notif.EVENT_CHANGES_REQUESTED": {
    uz: "«{event}» boʻyicha tuzatishlar soʻraldi",
    ru: "По событию «{event}» запрошены правки",
    en: "Changes requested for “{event}”",
  },
  "notif.REGISTRATION_FIRST": {
    uz: "«{event}» ga birinchi ariza!",
    ru: "Первая заявка на «{event}»!",
    en: "First registration for “{event}”!",
  },
  "notif.CAPACITY_THRESHOLD": {
    uz: "«{event}» {threshold}% ga toʻldi",
    ru: "Событие «{event}» заполнено на {threshold}%",
    en: "“{event}” is {threshold}% full",
  },
  "notif.TICKET_REFUND": {
    uz: "«{event}» biletiga toʻlov qaytarildi yoki bron bekor boʻldi",
    ru: "Возврат или отмена брони билета на «{event}»",
    en: "Ticket refund or expired hold for “{event}”",
  },
  "notif.REGISTRATION_CLOSED": {
    uz: "«{event}» roʻyxatga olish yopildi: {total} ariza, {pending} tasi kutmoqda",
    ru: "Регистрация на «{event}» закрыта: {total} заявок, {pending} ждут решения",
    en: "Registration for “{event}” closed: {total} registrations, {pending} pending",
  },
  "notif.EVENT_SUMMARY": {
    uz: "«{event}» yakunlari tayyor",
    ru: "Итоги события «{event}» готовы",
    en: "The summary for “{event}” is ready",
  },

  // Инбокс участника (`/notifications`, словарь notif.acc.*): те же принципы,
  // адресат — участник, поэтому фразы от второго лица.
  "notif.acc.REGISTRATION_CREATED": {
    uz: "«{event}» uchun biletingiz tayyor",
    ru: "Ваш билет на «{event}» готов",
    en: "Your ticket for “{event}” is ready",
  },
  "notif.acc.REGISTRATION_CREATED_PENDING": {
    uz: "«{event}» ga arizangiz qabul qilindi va koʻrib chiqilmoqda",
    ru: "Заявка на «{event}» принята и ждёт подтверждения",
    en: "Your request for “{event}” was received and is being reviewed",
  },
  "notif.acc.REGISTRATION_APPROVED": {
    uz: "«{event}» ga arizangiz tasdiqlandi",
    ru: "Ваша заявка на «{event}» одобрена",
    en: "Your registration for “{event}” was approved",
  },
  "notif.acc.REGISTRATION_REJECTED": {
    uz: "«{event}» ga arizangiz rad etildi",
    ru: "Ваша заявка на «{event}» отклонена",
    en: "Your registration for “{event}” was declined",
  },
  "notif.acc.REGISTRATION_CANCELLED": {
    uz: "«{event}» dagi ishtirokingiz bekor qilindi",
    ru: "Ваше участие в «{event}» отменено",
    en: "Your registration for “{event}” was cancelled",
  },
  "notif.acc.REGISTRATION_REVOKED": {
    uz: "«{event}» boʻyicha tasdiq qaytarib olindi",
    ru: "Подтверждение по «{event}» отозвано",
    en: "Your approval for “{event}” was revoked",
  },
  "notif.acc.PAYMENT_PENDING": {
    uz: "«{event}» biletini toʻlash kutilmoqda — joy 15 daqiqa band",
    ru: "Ожидается оплата билета на «{event}» — место забронировано на 15 минут",
    en: "Payment pending for “{event}” — your seat is held for 15 minutes",
  },
  "notif.acc.PAYMENT_FAILED": {
    uz: "«{event}» uchun toʻlov oʻtmadi — qayta urinib koʻring",
    ru: "Оплата билета на «{event}» не прошла — попробуйте ещё раз",
    en: "Payment for “{event}” failed — please try again",
  },
  "notif.acc.HOLD_EXPIRED": {
    uz: "«{event}» broni muddati tugadi — joy boʻshatildi",
    ru: "Бронь на «{event}» истекла — место освобождено",
    en: "Your hold for “{event}” expired — the seat was released",
  },
  "notif.acc.TICKET_ISSUED": {
    uz: "«{event}» uchun bilet berildi",
    ru: "Билет на «{event}» выдан",
    en: "Your ticket for “{event}” was issued",
  },
  "notif.acc.TICKET_REFUNDED": {
    uz: "«{event}» bileti uchun toʻlov qaytarildi",
    ru: "Оформлен возврат за билет на «{event}»",
    en: "Your ticket for “{event}” was refunded",
  },
  "notif.acc.CHECKED_IN": {
    uz: "«{event}» da roʻyxatdan oʻtdingiz — xush kelibsiz!",
    ru: "Вы отмечены на «{event}» — добро пожаловать!",
    en: "You are checked in at “{event}” — welcome!",
  },
  "notif.acc.EVENT_REMINDER": {
    uz: "Eslatma: «{event}» yaqinlashmoqda",
    ru: "Напоминание: скоро «{event}»",
    en: "Reminder: “{event}” is coming up",
  },
  "notif.acc.EVENT_STARTING": {
    uz: "«{event}» boshlanmoqda",
    ru: "Событие «{event}» начинается",
    en: "“{event}” is starting",
  },
  "notif.acc.EVENT_CANCELLED": {
    uz: "«{event}» bekor qilindi",
    ru: "Событие «{event}» отменено",
    en: "“{event}” was cancelled",
  },
  "notif.acc.REGISTRATION_CLOSING": {
    uz: "«{event}» ga roʻyxatga olish tez orada yopiladi",
    ru: "Регистрация на «{event}» скоро закроется",
    en: "Registration for “{event}” closes soon",
  },
  "notif.acc.FEW_SEATS_LEFT": {
    uz: "«{event}» da joylar kam qoldi",
    ru: "На «{event}» осталось мало мест",
    en: "Few seats left for “{event}”",
  },
  "notif.acc.EVENT_SUMMARY": {
    uz: "«{event}» uchun rahmat — yakunlar ichkarida",
    ru: "Спасибо за участие в «{event}» — итоги внутри",
    en: "Thanks for joining “{event}” — see the wrap-up",
  },
  "notif.acc.CERTIFICATE_ISSUED": {
    uz: "«{event}» uchun sertifikatingiz tayyor",
    ru: "Ваш сертификат за «{event}» готов",
    en: "Your certificate for “{event}” is ready",
  },
  "notif.acc.empty.body": {
    uz: "Arizalaringiz, biletlaringiz va eslatmalar shu yerda paydo boʻladi.",
    ru: "Здесь появятся ваши заявки, билеты и напоминания.",
    en: "Your registrations, tickets and reminders will show up here.",
  },
  // --- Discover: nothing in the selected city, but other regions have events ---
  "home.otherRegions.title": {
    uz: "{city}da hozircha tadbir yoʻq",
    ru: "В городе {city} пока ничего нет",
    en: "Nothing in {city} yet",
  },
  "home.otherRegions.body": {
    uz: "Boshqa hududlarda nimalar boʻlayotganini koʻring.",
    ru: "Вот что происходит в других регионах.",
    en: "Here's what's happening in other regions.",
  },
  "home.otherRegions.action": {
    uz: "Barcha hududlarni koʻrsatish",
    ru: "Показать все регионы",
    en: "Show all regions",
  },
} satisfies Record<string, L>;

export type StringKey = keyof typeof STRINGS;
