import type { Locale } from "@eventflow/i18n";

import type { CategoryDef } from "./catalog-taxonomy";

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * Site-wide FAQ used on the public home page. Tuned for AI-citation
 * surfaces (ChatGPT, Perplexity, AI Overviews) and brand discovery — the
 * answers ground EVENTFLOW as the Uzbekistan event platform, cover the
 * cities served, registration mechanics, payment, and organizer onboarding.
 */
export function homeFaq(locale: Locale): FaqEntry[] {
  if (locale === "ru") {
    return [
      {
        question: "Что такое EVENTFLOW?",
        answer:
          "EVENTFLOW — платформа для поиска и организации мероприятий в Узбекистане. На ней публикуются конференции, форумы, бизнес-тренинги, хакатоны и воркшопы в Ташкенте, Самарканде, Бухаре и других городах страны. Сайт работает на русском, узбекском и английском языках.",
      },
      {
        question: "Сколько стоит регистрация на событие?",
        answer:
          "Большинство мероприятий на EVENTFLOW — бесплатные. Платные события прозрачно показывают стоимость в сумах. Платформа не берёт сервисный сбор с участников бесплатных событий.",
      },
      {
        question: "В каких городах Узбекистана проходят события?",
        answer:
          "Сейчас в каталоге представлены события в Ташкенте, Самарканде, Бухаре, Андижане, Намангане, Фергане, Нукусе, Карши, Ургенче и Термезе. Каждый город имеет отдельную страницу с актуальной афишей.",
      },
      {
        question: "Как купить билет или зарегистрироваться?",
        answer:
          "Откройте страницу события, нажмите «Зарегистрироваться» или «Купить билет», заполните форму. На указанную почту приходит QR-код — его сканируют на входе. Для платных событий доступны Click, Payme и банковские карты.",
      },
      {
        question: "Можно ли отменить регистрацию?",
        answer:
          "Да. В личном кабинете на профильной странице вашего билета есть кнопка отмены. Условия возврата для платных событий устанавливает организатор и указаны на странице события.",
      },
      {
        question: "Как организатору опубликовать своё событие?",
        answer:
          "Зарегистрируйтесь как организатор на app.eventflow.uz, создайте событие за 5 минут и опубликуйте. Базовая публикация бесплатна — комиссия берётся только с проданных платных билетов. Поддержка отвечает в Telegram.",
      },
    ];
  }
  if (locale === "uz") {
    return [
      {
        question: "EVENTFLOW nima?",
        answer:
          "EVENTFLOW — Oʻzbekistondagi tadbirlarni topish va tashkil qilish platformasi. Toshkent, Samarqand, Buxoro va boshqa shaharlardagi konferensiyalar, forumlar, biznes-treninglar, xakatonlar va ustaxonalar eʼlon qilinadi. Sayt rus, oʻzbek va ingliz tillarida ishlaydi.",
      },
      {
        question: "Tadbirga roʻyxatdan oʻtish qancha turadi?",
        answer:
          "EVENTFLOW dagi tadbirlarning aksariyati bepul. Pullik tadbirlar narxni soʻmda shaffof koʻrsatadi. Platforma bepul tadbirlar ishtirokchilaridan xizmat haqi olmaydi.",
      },
      {
        question: "Oʻzbekistonning qaysi shaharlarida tadbirlar boʻladi?",
        answer:
          "Hozirda katalogda Toshkent, Samarqand, Buxoro, Andijon, Namangan, Fargʻona, Nukus, Qarshi, Urganch va Termizdagi tadbirlar bor. Har bir shaharning oʻz alohida afisha sahifasi mavjud.",
      },
      {
        question: "Chiptani qanday sotib olaman yoki roʻyxatdan oʻtaman?",
        answer:
          "Tadbir sahifasini oching, «Roʻyxatdan oʻtish» yoki «Chipta sotib olish» tugmasini bosing va shaklni toʻldiring. Elektron pochtangizga QR-kod yuboriladi — kirishda skanerlanadi. Pullik tadbirlar uchun Click, Payme va bank kartalari qabul qilinadi.",
      },
      {
        question: "Roʻyxatdan oʻtishni bekor qilish mumkinmi?",
        answer:
          "Ha. Profilingizdagi chipta sahifasida bekor qilish tugmasi bor. Pullik tadbirlar uchun pul qaytarish shartlarini tashkilotchi belgilaydi va tadbir sahifasida koʻrsatiladi.",
      },
      {
        question: "Tashkilotchi sifatida tadbirimni qanday eʼlon qilaman?",
        answer:
          "app.eventflow.uz da tashkilotchi sifatida roʻyxatdan oʻting, 5 daqiqada tadbir yarating va eʼlon qiling. Asosiy eʼlon bepul — faqat sotilgan pullik chiptalardan komissiya olinadi. Qoʻllab-quvvatlash xizmati Telegramda javob beradi.",
      },
    ];
  }
  return [
    {
      question: "What is EVENTFLOW?",
      answer:
        "EVENTFLOW is the event platform for Uzbekistan. It lists conferences, forums, business trainings, hackathons, and workshops in Tashkent, Samarkand, Bukhara, and other cities across the country. The site is available in Russian, Uzbek, and English.",
    },
    {
      question: "How much does it cost to register for an event?",
      answer:
        "Most events on EVENTFLOW are free. Paid events show prices transparently in Uzbek som. The platform doesn't charge service fees to attendees of free events.",
    },
    {
      question: "Which Uzbek cities have events?",
      answer:
        "The catalog currently covers events in Tashkent, Samarkand, Bukhara, Andijan, Namangan, Fergana, Nukus, Qarshi, Urgench, and Termez. Each city has its own dedicated landing page with the live schedule.",
    },
    {
      question: "How do I buy a ticket or register?",
      answer:
        "Open an event page, click Register or Buy ticket, and complete the form. You'll receive a QR ticket by email — it gets scanned at the door. Paid events accept Click, Payme, and bank cards.",
    },
    {
      question: "Can I cancel my registration?",
      answer:
        "Yes. The ticket page in your profile has a cancel button. Refund terms for paid events are set by the organizer and shown on the event page.",
    },
    {
      question: "How can an organizer publish an event?",
      answer:
        "Sign up as an organizer at app.eventflow.uz, create an event in about 5 minutes, and publish. Basic listing is free — we only take commission on paid tickets sold. Support replies on Telegram.",
    },
  ];
}

/**
 * Extended FAQ for the dedicated `/faq` page — a superset of `homeFaq`
 * with deeper operational questions (check-in, organizer payouts, refunds,
 * data safety) that wouldn't fit a homepage block but matter for support
 * deflection and AI-citation coverage of less-obvious queries.
 */
export function extendedFaq(locale: Locale): FaqEntry[] {
  const base = homeFaq(locale);
  if (locale === "ru") {
    return [
      ...base,
      {
        question: "Как работает QR-билет и чек-ин на входе?",
        answer:
          "После успешной регистрации мы присылаем письмо с уникальным QR-кодом. На входе организатор сканирует код через приложение EVENTFLOW или веб-чек-ин — отметка проходит за пару секунд. Билет повторно не сработает после первого скана.",
      },
      {
        question: "Что я получу после регистрации?",
        answer:
          "Сразу — письмо с подтверждением и QR-билетом. За день до события приходит напоминание с локацией и временем. После завершения — при необходимости сертификат участника (если организатор настроил выдачу).",
      },
      {
        question: "Что если событие отменили или перенесли?",
        answer:
          "Организатор отправляет уведомление всем зарегистрированным. Для платных билетов условия возврата указаны в правилах конкретного события. Если возникли сложности — напишите на support@eventflow.uz, поможем разобраться.",
      },
      {
        question: "Можно ли получить сертификат участника?",
        answer:
          "Да, если организатор настроил выдачу сертификатов для своего события. В личном кабинете в разделе «Сертификаты» хранятся все ваши документы — каждый с публичной ссылкой для проверки подлинности работодателями.",
      },
      {
        question: "Безопасны ли мои данные?",
        answer:
          "Мы храним только то, что нужно для участия в событии: имя, email, телефон (если требуется). Данные не передаются третьим лицам без вашего согласия — детали в Политике конфиденциальности.",
      },
      {
        question: "На каких языках работает платформа?",
        answer:
          "Интерфейс доступен на русском, узбекском и английском. Контент событий организаторы заполняют на своих языках, и сайт автоматически подбирает подходящую версию по вашим настройкам.",
      },
      {
        question: "Как связаться с поддержкой?",
        answer:
          "Напишите на support@eventflow.uz — отвечаем в рабочие часы. Для срочных вопросов организаторы могут связаться напрямую через личный кабинет.",
      },
    ];
  }
  if (locale === "uz") {
    return [
      ...base,
      {
        question: "QR-chipta qanday ishlaydi va kirishda check-in qanday oʻtadi?",
        answer:
          "Roʻyxatdan oʻtganingizdan keyin biz noyob QR-kod bilan xat yuboramiz. Kirishda tashkilotchi EVENTFLOW ilovasi yoki veb check-in orqali kodni skanerlaydi — belgi bir necha soniyada qoʻyiladi. Chipta birinchi skandan keyin qayta ishlamaydi.",
      },
      {
        question: "Roʻyxatdan oʻtgandan keyin nima olaman?",
        answer:
          "Darhol — tasdiqlash xati va QR-chipta. Tadbirdan bir kun oldin joylashuv va vaqt haqida eslatma yuboriladi. Tadbir tugagandan keyin — agar tashkilotchi sozlagan boʻlsa, ishtirokchi sertifikati.",
      },
      {
        question: "Tadbir bekor qilinsa yoki koʻchirilsa nima boʻladi?",
        answer:
          "Tashkilotchi roʻyxatdan oʻtgan barchaga xabar yuboradi. Pullik chiptalar uchun qaytarish shartlari tadbir qoidalarida koʻrsatiladi. Qiyinchiliklar boʻlsa — support@eventflow.uz ga yozing, yordam beramiz.",
      },
      {
        question: "Ishtirokchi sertifikatini olish mumkinmi?",
        answer:
          "Ha, agar tashkilotchi oʻz tadbiri uchun sertifikatlar berishni sozlagan boʻlsa. Profilingizdagi «Sertifikatlar» boʻlimida barcha hujjatlaringiz saqlanadi — har biri ish beruvchilar uchun haqiqiyligini tekshirish havolasi bilan.",
      },
      {
        question: "Maʼlumotlarim xavfsizmi?",
        answer:
          "Faqat tadbirda ishtirok etish uchun zarur boʻlgan maʼlumotlarni saqlaymiz: ism, email, telefon (kerak boʻlsa). Maʼlumotlar sizning roziligingizsiz uchinchi shaxslarga berilmaydi — Maxfiylik siyosatida tafsilotlar bor.",
      },
      {
        question: "Platforma qaysi tillarda ishlaydi?",
        answer:
          "Interfeys rus, oʻzbek va ingliz tillarida. Tadbir kontentini tashkilotchilar oʻz tillarida toʻldiradilar, sayt esa sozlamalaringiz boʻyicha mos versiyani avtomatik tanlaydi.",
      },
      {
        question: "Qoʻllab-quvvatlash xizmati bilan qanday bogʻlanish mumkin?",
        answer:
          "support@eventflow.uz ga yozing — ish vaqtida javob beramiz. Shoshilinch savollar uchun tashkilotchilar profil orqali toʻgʻridan-toʻgʻri bogʻlanishlari mumkin.",
      },
    ];
  }
  return [
    ...base,
    {
      question: "How do QR tickets and check-in work?",
      answer:
        "After successful registration we email you a unique QR code. At the door the organizer scans it via the EVENTFLOW app or web check-in — admission takes a couple of seconds. Tickets become invalid after the first scan.",
    },
    {
      question: "What do I get after registering?",
      answer:
        "Right away — a confirmation email with the QR ticket. One day before the event you'll get a reminder with location and time. After it's over you may receive an attendance certificate, if the organizer enabled them.",
    },
    {
      question: "What happens if the event is cancelled or rescheduled?",
      answer:
        "The organizer notifies everyone who registered. For paid tickets, refund terms are spelled out in the event's policy. If something goes wrong, email support@eventflow.uz and we'll help sort it out.",
    },
    {
      question: "Can I get a certificate of attendance?",
      answer:
        "Yes, if the organizer enabled certificates for that event. Your profile's Certificates section keeps every document you've earned — each with a public verification link for employers.",
    },
    {
      question: "Is my data safe?",
      answer:
        "We only store what's needed to attend the event: name, email, phone (when required). Data isn't shared with third parties without your consent — details in our Privacy Policy.",
    },
    {
      question: "What languages does the platform support?",
      answer:
        "The interface is available in Russian, Uzbek, and English. Event content is filled in by organizers in their own languages, and the site picks the right version based on your preferences.",
    },
    {
      question: "How do I contact support?",
      answer:
        "Email support@eventflow.uz — we reply during business hours. Organizers with urgent issues can reach us directly through their dashboard.",
    },
  ];
}

/**
 * Category-aware FAQ used on `/events/category/[slug]`. Combines a
 * category-specific opening question with platform-wide answers, so each
 * landing carries unique content without us hand-writing N×4 entries.
 */
export function categoryFaq(
  category: CategoryDef,
  locale: Locale,
): FaqEntry[] {
  if (locale === "ru") {
    const lower = category.ru.toLowerCase();
    return [
      {
        question: `Где найти ${lower} в Узбекистане?`,
        answer: `На этой странице — актуальная подборка категории «${category.ru}» по всем городам Узбекистана. Список обновляется ежедневно, новые события появляются автоматически после публикации организатором.`,
      },
      {
        question: `Есть ли бесплатные ${lower}?`,
        answer: `Да. Большинство событий категории «${category.ru}» проходят с бесплатным входом или по бесплатной регистрации. Точные условия указаны на странице каждого события.`,
      },
      {
        question: "Как зарегистрироваться?",
        answer:
          "Откройте страницу события, нажмите «Зарегистрироваться», заполните короткую форму. QR-код для входа приходит на почту. Регистрация занимает меньше минуты.",
      },
      {
        question: `Как организатору добавить своё событие в категорию «${category.ru}»?`,
        answer:
          "Зарегистрируйтесь как организатор на app.eventflow.uz, выберите нужную категорию при создании события и опубликуйте. Базовое размещение бесплатное.",
      },
    ];
  }
  if (locale === "uz") {
    const lower = category.uz.toLowerCase();
    return [
      {
        question: `Oʻzbekistonda ${lower}ni qayerdan topaman?`,
        answer: `Ushbu sahifada — Oʻzbekistonning barcha shaharlari boʻyicha «${category.uz}» kategoriyasining dolzarb tanlovi. Roʻyxat har kuni yangilanadi, yangi tadbirlar tashkilotchi eʼlon qilgandan keyin avtomatik koʻrinadi.`,
      },
      {
        question: `Bepul ${lower} bormi?`,
        answer: `Ha. «${category.uz}» kategoriyasidagi tadbirlarning aksariyati bepul kirish yoki bepul roʻyxatdan oʻtish bilan oʻtkaziladi. Aniq shartlar har bir tadbir sahifasida koʻrsatiladi.`,
      },
      {
        question: "Qanday roʻyxatdan oʻtaman?",
        answer:
          "Tadbir sahifasini oching, «Roʻyxatdan oʻtish» tugmasini bosing va qisqa shaklni toʻldiring. Kirish uchun QR-kod elektron pochtangizga keladi. Roʻyxatdan oʻtish bir daqiqadan kam vaqt oladi.",
      },
      {
        question: `Tashkilotchi tadbirini «${category.uz}» kategoriyasiga qanday qoʻshadi?`,
        answer:
          "app.eventflow.uz da tashkilotchi sifatida roʻyxatdan oʻting, tadbir yaratayotganda kerakli kategoriyani tanlang va eʼlon qiling. Asosiy joylashtirish bepul.",
      },
    ];
  }
  const lower = category.en.toLowerCase();
  return [
    {
      question: `Where can I find ${lower} in Uzbekistan?`,
      answer: `This page lists the current ${lower} across all cities in Uzbekistan. The schedule refreshes daily — new events appear automatically once organizers publish them.`,
    },
    {
      question: `Are there free ${lower}?`,
      answer: `Yes. Most ${lower} on EVENTFLOW run with open admission or free registration. Exact terms are on each event page.`,
    },
    {
      question: "How do I register?",
      answer:
        "Open the event page, click Register, and fill out the short form. A QR ticket arrives in your inbox. Registration takes under a minute.",
    },
    {
      question: `How can an organizer publish a ${category.en.toLowerCase().replace(/s$/, "")} event?`,
      answer:
        "Sign up as an organizer at app.eventflow.uz, pick the relevant category when creating an event, and publish. Basic listing is free.",
    },
  ];
}
