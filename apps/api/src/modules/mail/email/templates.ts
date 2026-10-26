import type {
  EmailContext,
  EmailCta,
  EmailDocument,
  EmailTemplateBuilder,
  Locale,
} from './types';
import { formatEventDateTime } from './format';
// Плюрализация счётчиков — то же CLDR-зеркало, что у пушей (BL-11/BL-26);
// при переезде словаря в packages/i18n (BL-53) импорт меняется на оригинал.
import {
  plural,
  type LocalizedPluralForms,
} from '../../notifications/i18n/plural';

/** Localized string helper (Uzbek is Latin). */
function L(locale: Locale, m: { ru: string; en: string; uz: string }): string {
  return m[locale] ?? m.ru;
}

function str(ctx: EmailContext, key: string, fallback = ''): string {
  const v = ctx[key];
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v as string | number | boolean);
}

function bool(ctx: EmailContext, key: string): boolean {
  return Boolean(ctx[key]);
}

function greeting(locale: Locale, name?: string): string {
  const hi = L(locale, { ru: 'Здравствуйте', en: 'Hello', uz: 'Assalomu alaykum' });
  return name && name.trim() ? `${hi}, ${name.trim()}!` : `${hi}!`;
}

// ─── Security / auth code emails ──────────────────────────────────────────────

function codeEmail(
  ctx: EmailContext,
  locale: Locale,
  kind: 'verify' | 'reset' | 'change',
): EmailDocument {
  const code = str(ctx, 'code');
  const firstName = str(ctx, 'firstName');

  const subject = L(locale, {
    ru: {
      verify: 'Код подтверждения email — EventFlow',
      reset: 'Код для сброса пароля — EventFlow',
      change: 'Код подтверждения смены email — EventFlow',
    }[kind],
    en: {
      verify: 'Your email verification code — EventFlow',
      reset: 'Your password reset code — EventFlow',
      change: 'Your email change code — EventFlow',
    }[kind],
    uz: {
      verify: 'Email tasdiqlash kodi — EventFlow',
      reset: 'Parolni tiklash kodi — EventFlow',
      change: 'Email almashtirish tasdiq kodi — EventFlow',
    }[kind],
  });

  const intro = L(locale, {
    ru: {
      verify: 'Вы запросили подтверждение адреса электронной почты в EventFlow. Используйте этот код, чтобы продолжить.',
      reset: 'Вы запросили сброс пароля в EventFlow. Используйте этот код, чтобы задать новый пароль.',
      change: 'Вы запросили смену адреса электронной почты в EventFlow. Используйте этот код, чтобы подтвердить изменение.',
    }[kind],
    en: {
      verify: 'You requested email verification on EventFlow. Use the code below to continue.',
      reset: 'You requested a password reset on EventFlow. Use the code below to set a new password.',
      change: 'You requested an email change on EventFlow. Use the code below to confirm it.',
    }[kind],
    uz: {
      verify: "EventFlow'da email tasdiqlashni so'radingiz. Davom etish uchun quyidagi koddan foydalaning.",
      reset: "EventFlow'da parolni tiklashni so'radingiz. Yangi parol o'rnatish uchun quyidagi koddan foydalaning.",
      change: "EventFlow'da email almashtirishni so'radingiz. Tasdiqlash uchun quyidagi koddan foydalaning.",
    }[kind],
  });

  return {
    lang: locale,
    category: 'transactional',
    subject,
    preheader: L(locale, {
      ru: 'Ваш код действителен 5 минут.',
      en: 'Your code is valid for 5 minutes.',
      uz: 'Kodingiz 5 daqiqa amal qiladi.',
    }),
    heading: greeting(locale, firstName),
    intro: [intro],
    blocks: [
      {
        type: 'code',
        value: code,
        note: L(locale, {
          ru: 'Код действителен в течение 5 минут.',
          en: 'This code is valid for 5 minutes.',
          uz: 'Bu kod 5 daqiqa amal qiladi.',
        }),
      },
      {
        type: 'infobox',
        tone: 'neutral',
        lines: [
          L(locale, {
            ru: 'Если вы не запрашивали это действие, просто проигнорируйте письмо — ваш аккаунт в безопасности.',
            en: "If you didn't request this, you can safely ignore this email — your account is secure.",
            uz: "Agar buni so'ramagan bo'lsangiz, ushbu xatni e'tiborsiz qoldiring — hisobingiz xavfsiz.",
          }),
        ],
      },
    ],
    outro: [
      L(locale, {
        ru: 'Никому не сообщайте этот код.',
        en: 'Never share this code with anyone.',
        uz: "Bu kodni hech kimga aytmang.",
      }),
    ],
  };
}

// ─── Security notifications (password / email changed) ────────────────────────

function passwordChanged(ctx: EmailContext, locale: Locale): EmailDocument {
  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: 'Пароль изменён — EventFlow',
      en: 'Your password was changed — EventFlow',
      uz: "Parolingiz o'zgartirildi — EventFlow",
    }),
    preheader: L(locale, {
      ru: 'Если это были не вы — немедленно свяжитесь с поддержкой.',
      en: "If this wasn't you, contact support right away.",
      uz: "Agar bu siz bo'lmasangiz, darhol qo'llab-quvvatlashga murojaat qiling.",
    }),
    heading: greeting(locale, str(ctx, 'firstName')),
    intro: [
      L(locale, {
        ru: 'Пароль вашего аккаунта EventFlow был успешно изменён.',
        en: 'The password for your EventFlow account was successfully changed.',
        uz: "EventFlow hisobingiz paroli muvaffaqiyatli o'zgartirildi.",
      }),
    ],
    blocks: [
      {
        type: 'keyvalue',
        rows: [
          [
            L(locale, { ru: 'Аккаунт', en: 'Account', uz: 'Hisob' }),
            str(ctx, 'email'),
          ],
          [
            L(locale, { ru: 'Дата и время', en: 'Date & time', uz: 'Sana va vaqt' }),
            str(ctx, 'changeDate'),
          ],
        ],
      },
      {
        type: 'infobox',
        tone: 'warning',
        lines: [
          L(locale, {
            ru: 'Если вы не меняли пароль, немедленно восстановите доступ и свяжитесь с поддержкой.',
            en: "If you didn't change your password, reset access immediately and contact support.",
            uz: "Agar parolni o'zgartirmagan bo'lsangiz, darhol kirishni tiklang va qo'llab-quvvatlashga murojaat qiling.",
          }),
        ],
      },
    ],
  };
}

function emailChanged(ctx: EmailContext, locale: Locale): EmailDocument {
  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: 'Email изменён — EventFlow',
      en: 'Your email was changed — EventFlow',
      uz: "Email manzilingiz o'zgartirildi — EventFlow",
    }),
    preheader: L(locale, {
      ru: 'Уведомление об изменении адреса электронной почты.',
      en: 'Notification about an email address change.',
      uz: "Email manzili o'zgarishi haqida bildirishnoma.",
    }),
    heading: greeting(locale, str(ctx, 'firstName')),
    intro: [
      L(locale, {
        ru: 'Адрес электронной почты вашего аккаунта EventFlow был изменён.',
        en: 'The email address for your EventFlow account was changed.',
        uz: "EventFlow hisobingiz email manzili o'zgartirildi.",
      }),
    ],
    blocks: [
      {
        type: 'keyvalue',
        rows: [
          [
            L(locale, { ru: 'Прежний email', en: 'Previous email', uz: 'Avvalgi email' }),
            str(ctx, 'oldEmail'),
          ],
          [
            L(locale, { ru: 'Новый email', en: 'New email', uz: 'Yangi email' }),
            str(ctx, 'newEmail'),
          ],
          [
            L(locale, { ru: 'Дата и время', en: 'Date & time', uz: 'Sana va vaqt' }),
            str(ctx, 'changeDate'),
          ],
        ],
      },
      {
        type: 'infobox',
        tone: 'warning',
        lines: [
          L(locale, {
            ru: 'Если вы не меняли email, немедленно свяжитесь с поддержкой.',
            en: "If you didn't make this change, contact support immediately.",
            uz: "Agar buni siz qilmagan bo'lsangiz, darhol qo'llab-quvvatlashga murojaat qiling.",
          }),
        ],
      },
    ],
  };
}

// ─── Invitations ──────────────────────────────────────────────────────────────

function memberInvitation(ctx: EmailContext, locale: Locale): EmailDocument {
  const org = str(ctx, 'organizationName');
  const name = `${str(ctx, 'firstName')} ${str(ctx, 'lastName')}`.trim();
  const userExists = bool(ctx, 'userExists');
  const authMethods = Array.isArray(ctx.authMethods)
    ? (ctx.authMethods as string[])
    : [];
  // OAuth-only user (Google/LinkedIn, no password) gets a provider-specific hint.
  const oauthOnly =
    userExists &&
    !authMethods.includes('password') &&
    (authMethods.includes('google') || authMethods.includes('linkedin'));
  const oauthProvider = authMethods.includes('google')
    ? 'Google'
    : authMethods.includes('linkedin')
      ? 'LinkedIn'
      : null;

  return {
    lang: locale,
    category: 'transactional',
    subject: userExists
      ? L(locale, {
          ru: `Вас пригласили в организацию ${org} в EventFlow`,
          en: `You've been invited to join ${org} on EventFlow`,
          uz: `Sizni EventFlow'dagi ${org} tashkilotiga taklif qilishdi`,
        })
      : L(locale, {
          ru: `Приглашение в организацию ${org} в EventFlow`,
          en: `Invitation to join ${org} on EventFlow`,
          uz: `${org} tashkilotiga taklif — EventFlow`,
        }),
    preheader: userExists
      ? L(locale, {
          ru: 'Войдите в существующий аккаунт, чтобы принять приглашение.',
          en: 'Sign in to your existing account to accept the invitation.',
          uz: 'Taklifni qabul qilish uchun mavjud hisobingizga kiring.',
        })
      : L(locale, {
          ru: 'Создайте аккаунт, чтобы принять приглашение.',
          en: 'Create an account to accept the invitation.',
          uz: 'Taklifni qabul qilish uchun hisob yarating.',
        }),
    heading: greeting(locale, name),
    intro: [
      L(locale, {
        ru: `Вас пригласили присоединиться к организации «${org}» в EventFlow.`,
        en: `You have been invited to join "${org}" on EventFlow.`,
        uz: `Sizni EventFlow'dagi "${org}" tashkilotiga taklif qilishdi.`,
      }),
      userExists
        ? oauthOnly && oauthProvider
          ? L(locale, {
              ru: `Войдите через ${oauthProvider}, чтобы принять приглашение.`,
              en: `Sign in with ${oauthProvider} to accept the invitation.`,
              uz: `Taklifni qabul qilish uchun ${oauthProvider} orqali kiring.`,
            })
          : L(locale, {
              ru: 'Войдите в существующий аккаунт, чтобы принять приглашение.',
              en: 'Sign in to your existing account to accept the invitation.',
              uz: 'Taklifni qabul qilish uchun mavjud hisobingizga kiring.',
            })
        : L(locale, {
            ru: 'Создайте аккаунт, чтобы принять приглашение.',
            en: 'Create an account to accept the invitation.',
            uz: 'Taklifni qabul qilish uchun hisob yarating.',
          }),
    ],
    blocks: [
      {
        type: 'keyvalue',
        rows: [
          [
            L(locale, { ru: 'Email для входа', en: 'Sign-in email', uz: 'Kirish uchun email' }),
            str(ctx, 'email'),
          ],
          [
            L(locale, { ru: 'Организация', en: 'Organization', uz: 'Tashkilot' }),
            org,
          ],
        ],
      },
      {
        type: 'infobox',
        tone: 'neutral',
        lines: [
          L(locale, {
            ru: 'Ссылка действительна 48 часов.',
            en: 'The invitation link is valid for 48 hours.',
            uz: 'Havola 48 soat amal qiladi.',
          }),
        ],
      },
    ],
    cta: {
      label: userExists
        ? L(locale, {
            ru: 'Принять приглашение',
            en: 'Accept invitation',
            uz: 'Taklifni qabul qilish',
          })
        : L(locale, {
            ru: 'Создать аккаунт и принять приглашение',
            en: 'Create account and accept',
            uz: 'Hisob yaratish va qabul qilish',
          }),
      url: str(ctx, 'activationUrl'),
    },
  };
}

function speakerInvitation(ctx: EmailContext, locale: Locale): EmailDocument {
  const event = str(ctx, 'eventTitle');
  const org = str(ctx, 'organizationName');
  const userExists = bool(ctx, 'userExists');
  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Приглашение выступить на «${event}» — EventFlow`,
      en: `Invitation to speak at "${event}" — EventFlow`,
      uz: `"${event}" tadbirida ma'ruza qilishga taklif — EventFlow`,
    }),
    preheader: L(locale, {
      ru: 'Подтвердите или отклоните участие как спикер.',
      en: 'Accept or decline the speaker invitation.',
      uz: "Ma'ruzachi taklifini tasdiqlang yoki rad eting.",
    }),
    heading: greeting(locale, str(ctx, 'name')),
    intro: [
      L(locale, {
        ru: `Организация «${org}» приглашает вас выступить на мероприятии «${event}».`,
        en: `"${org}" invites you to speak at "${event}".`,
        uz: `"${org}" sizni "${event}" tadbirida ma'ruza qilishga taklif qiladi.`,
      }),
      userExists
        ? L(locale, {
            ru: 'Подтвердите участие по кнопке ниже.',
            en: 'Confirm your participation using the button below.',
            uz: 'Quyidagi tugma orqali ishtirokingizni tasdiqlang.',
          })
        : L(locale, {
            ru: 'После подтверждения вы сможете создать аккаунт спикера.',
            en: 'After accepting, you can create a speaker account.',
            uz: "Tasdiqlagandan so'ng ma'ruzachi hisobini yaratishingiz mumkin.",
          }),
    ],
    blocks: [
      {
        type: 'infobox',
        tone: 'neutral',
        lines: [
          L(locale, {
            ru: `Приглашение действительно ${str(ctx, 'expiresIn', '48 часов')}.`,
            en: `This invitation is valid for ${str(ctx, 'expiresIn', '48 hours')}.`,
            uz: `Taklif ${str(ctx, 'expiresIn', '48 soat')} amal qiladi.`,
          }),
        ],
      },
    ],
    cta: {
      label: L(locale, {
        ru: 'Подтвердить участие',
        en: 'Accept invitation',
        uz: 'Taklifni qabul qilish',
      }),
      url: str(ctx, 'acceptUrl'),
    },
    outro: [
      L(locale, {
        ru: `Чтобы отклонить приглашение, перейдите по ссылке: ${str(ctx, 'rejectUrl')}`,
        en: `To decline, use this link: ${str(ctx, 'rejectUrl')}`,
        uz: `Rad etish uchun ushbu havoladan foydalaning: ${str(ctx, 'rejectUrl')}`,
      }),
    ],
  };
}

// Personal invitations to PRIVATE events carry no shared code, only the link.
function eventInvitation(ctx: EmailContext, locale: Locale): EmailDocument {
  const event = str(ctx, 'eventTitle');
  const org = str(ctx, 'organizationName');
  const inviteCode = str(ctx, 'inviteCode');
  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Приглашение на мероприятие «${event}» — EventFlow`,
      en: `You're invited to "${event}" — EventFlow`,
      uz: `"${event}" tadbiriga taklif — EventFlow`,
    }),
    preheader: L(locale, {
      ru: 'Перейдите по ссылке, чтобы зарегистрироваться.',
      en: 'Follow the link to register.',
      uz: "Ro'yxatdan o'tish uchun havolaga o'ting.",
    }),
    heading: L(locale, {
      ru: 'Приглашение на мероприятие',
      en: 'Event invitation',
      uz: 'Tadbirga taklif',
    }),
    intro: [
      L(locale, {
        ru: `Организация «${org}» приглашает вас на мероприятие «${event}».`,
        en: `"${org}" invites you to the event "${event}".`,
        uz: `"${org}" sizni "${event}" tadbiriga taklif qiladi.`,
      }),
    ],
    blocks: inviteCode
      ? [
          {
            type: 'keyvalue',
            rows: [
              [
                L(locale, { ru: 'Код приглашения', en: 'Invite code', uz: 'Taklif kodi' }),
                inviteCode,
              ],
            ],
          },
        ]
      : [],
    cta: {
      label: L(locale, {
        ru: 'Перейти к регистрации',
        en: 'Register now',
        uz: "Ro'yxatdan o'tish",
      }),
      url: str(ctx, 'inviteLink'),
    },
  };
}

// ─── Registration / tickets ───────────────────────────────────────────────────

function registrationCreated(ctx: EmailContext, locale: Locale): EmailDocument {
  const event = str(ctx, 'eventTitle');
  const org = str(ctx, 'organizationName');
  const isPending = bool(ctx, 'isPending');
  const ticketNumber = str(ctx, 'ticketNumber');
  const ticketUrl = str(ctx, 'ticketUrl');

  const doc: EmailDocument = {
    lang: locale,
    category: 'transactional',
    subject: isPending
      ? L(locale, {
          ru: `Регистрация на «${event}» получена`,
          en: `Registration received for "${event}"`,
          uz: `"${event}" uchun ro'yxat qabul qilindi`,
        })
      : L(locale, {
          ru: `Ваш билет на «${event}»`,
          en: `Your ticket for "${event}"`,
          uz: `"${event}" uchun chiptangiz`,
        }),
    preheader: isPending
      ? L(locale, {
          ru: 'Заявка ожидает подтверждения организатором.',
          en: 'Your request is awaiting organizer approval.',
          uz: 'Arizangiz tashkilotchi tasdigʻini kutmoqda.',
        })
      : L(locale, {
          ru: 'Билет готов — QR-код доступен на странице билета.',
          en: 'Your ticket is ready — the QR code is on the ticket page.',
          uz: 'Chipta tayyor — QR-kod chipta sahifasida.',
        }),
    heading: greeting(locale, str(ctx, 'userName')),
    intro: [
      isPending
        ? L(locale, {
            ru: `Мы получили вашу регистрацию на «${event}». Заявка ожидает рассмотрения организатором — мы пришлём отдельное письмо после одобрения.`,
            en: `We received your registration for "${event}". It is awaiting organizer approval — we will email you once it is approved.`,
            uz: `"${event}" uchun ro'yxatingizni qabul qildik. Ariza tashkilotchi ko'rib chiqishini kutmoqda — tasdiqlangach alohida xat yuboramiz.`,
          })
        : L(locale, {
            ru: `Ваша регистрация на «${event}» подтверждена. Билет готов.`,
            en: `Your registration for "${event}" is confirmed. Your ticket is ready.`,
            uz: `"${event}" uchun ro'yxatingiz tasdiqlandi. Chipta tayyor.`,
          }),
    ],
    blocks: ticketNumber
      ? [
          {
            type: 'ticket',
            org,
            number: ticketNumber,
            event,
            badge: isPending
              ? L(locale, {
                  ru: 'На рассмотрении',
                  en: 'Pending review',
                  uz: "Ko'rib chiqilmoqda",
                })
              : undefined,
            // Пока заявка на рассмотрении, билета ещё нет — карточка не должна
            // называть себя «E-TICKET».
            ...(isPending && {
              label: L(locale, {
                ru: 'Заявка',
                en: 'Request',
                uz: 'Ariza',
              }),
            }),
          },
        ]
      : [],
  };

  if (ticketUrl) {
    doc.cta = {
      // У заявки на рассмотрении билета ещё нет: кнопка «Открыть мой билет»
      // обещает то, чего на странице не будет, и читается как сбой.
      label: isPending
        ? L(locale, {
            ru: 'Статус заявки',
            en: 'Request status',
            uz: 'Ariza holati',
          })
        : L(locale, {
            ru: 'Открыть мой билет',
            en: 'Open my ticket',
            uz: 'Chiptamni ochish',
          }),
      url: ticketUrl,
    };
    doc.outro = [
      isPending
        ? L(locale, {
            ru: 'Билет будет активирован после одобрения. QR-код появится автоматически.',
            en: 'The ticket activates after approval. The QR code will appear automatically.',
            uz: "Chipta tasdiqlangach faollashadi. QR-kod avtomatik paydo bo'ladi.",
          })
        : L(locale, {
            ru: 'QR-код для входа уже доступен на странице билета. Покажите его на входе.',
            en: 'The entry QR code is available on the ticket page. Show it at the entrance.',
            uz: 'Kirish QR-kodi chipta sahifasida. Uni kirishda koʻrsating.',
          }),
    ];
  }

  return doc;
}

function registrationApproved(ctx: EmailContext, locale: Locale): EmailDocument {
  const event = str(ctx, 'eventTitle');
  const org = str(ctx, 'organizationName');
  const ticketNumber = str(ctx, 'ticketNumber');
  const ticketUrl = str(ctx, 'ticketUrl');

  const doc: EmailDocument = {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Заявка на «${event}» одобрена`,
      en: `Your request for "${event}" is approved`,
      uz: `"${event}" uchun arizangiz tasdiqlandi`,
    }),
    preheader: L(locale, {
      ru: 'Ваше участие подтверждено.',
      en: 'Your participation is confirmed.',
      uz: 'Ishtirokingiz tasdiqlandi.',
    }),
    heading: greeting(locale, str(ctx, 'userName')),
    intro: [
      L(locale, {
        ru: `Рады сообщить: ваша заявка на участие в мероприятии «${event}» одобрена.`,
        en: `Good news — your request to attend "${event}" has been approved.`,
        uz: `Xush xabar: "${event}" tadbirida ishtirok etish arizangiz tasdiqlandi.`,
      }),
    ],
    blocks: ticketNumber
      ? [{ type: 'ticket', org, number: ticketNumber, event }]
      : [],
  };

  if (ticketUrl) {
    doc.cta = {
      label: L(locale, {
        ru: 'Открыть мой билет',
        en: 'Open my ticket',
        uz: 'Chiptamni ochish',
      }),
      url: ticketUrl,
    };
    doc.outro = [
      L(locale, {
        ru: 'QR-код для входа доступен на странице билета. Покажите его на входе.',
        en: 'The entry QR code is on the ticket page. Show it at the entrance.',
        uz: "Kirish QR-kodi chipta sahifasida. Uni kirishda ko'rsating.",
      }),
    ];
  } else {
    doc.outro = [
      L(locale, {
        ru: 'QR-код для входа доступен в вашем личном кабинете.',
        en: 'The entry QR code is available in your account.',
        uz: 'Kirish QR-kodi shaxsiy kabinetingizda mavjud.',
      }),
    ];
  }

  return doc;
}

function registrationRejected(ctx: EmailContext, locale: Locale): EmailDocument {
  const event = str(ctx, 'eventTitle');
  const reason = str(ctx, 'reason');
  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Заявка на «${event}» отклонена`,
      en: `Your request for "${event}" was declined`,
      uz: `"${event}" uchun arizangiz rad etildi`,
    }),
    preheader: L(locale, {
      ru: 'Информация о статусе вашей заявки.',
      en: 'An update on your registration status.',
      uz: 'Arizangiz holati haqida maʼlumot.',
    }),
    heading: greeting(locale, str(ctx, 'userName')),
    intro: [
      L(locale, {
        ru: `К сожалению, ваша заявка на участие в мероприятии «${event}» была отклонена.`,
        en: `Unfortunately, your request to attend "${event}" was not approved.`,
        uz: `Afsuski, "${event}" tadbirida ishtirok etish arizangiz tasdiqlanmadi.`,
      }),
    ],
    blocks: reason
      ? [
          {
            type: 'infobox',
            tone: 'neutral',
            title: L(locale, {
              ru: 'Причина',
              en: 'Reason',
              uz: 'Sabab',
            }),
            lines: [reason],
          },
        ]
      : [],
    outro: [
      L(locale, {
        ru: 'Вы можете обратиться к организатору за уточнениями.',
        en: 'You may contact the organizer for more details.',
        uz: "Tafsilotlar uchun tashkilotchiga murojaat qilishingiz mumkin.",
      }),
    ],
  };
}

function registrationCancelled(ctx: EmailContext, locale: Locale): EmailDocument {
  const event = str(ctx, 'eventTitle');
  const reason = str(ctx, 'reason');
  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Участие в «${event}» отменено`,
      en: `Your participation in "${event}" was cancelled`,
      uz: `"${event}" tadbiridagi ishtirokingiz bekor qilindi`,
    }),
    preheader: L(locale, {
      ru: 'Информация о статусе вашего участия.',
      en: 'An update on your participation.',
      uz: 'Ishtirokingiz holati haqida maʼlumot.',
    }),
    heading: greeting(locale, str(ctx, 'userName')),
    intro: [
      L(locale, {
        ru: `Ваше участие в мероприятии «${event}» было отменено организатором.`,
        en: `Your participation in "${event}" has been cancelled by the organizer.`,
        uz: `"${event}" tadbiridagi ishtirokingiz tashkilotchi tomonidan bekor qilindi.`,
      }),
    ],
    blocks: reason
      ? [
          {
            type: 'infobox',
            tone: 'neutral',
            title: L(locale, {
              ru: 'Причина',
              en: 'Reason',
              uz: 'Sabab',
            }),
            lines: [reason],
          },
        ]
      : [],
    outro: [
      L(locale, {
        ru: 'Если это произошло по ошибке, свяжитесь с организатором. При необходимости вы можете зарегистрироваться повторно.',
        en: 'If this was a mistake, contact the organizer. You may register again if needed.',
        uz: "Agar bu xato bo'lsa, tashkilotchiga murojaat qiling. Zarur bo'lsa, qayta ro'yxatdan o'tishingiz mumkin.",
      }),
    ],
  };
}

function registrationRevoked(ctx: EmailContext, locale: Locale): EmailDocument {
  const event = str(ctx, 'eventTitle');
  const reason = str(ctx, 'reason');
  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Подтверждение участия в «${event}» отозвано`,
      en: `Your confirmation for "${event}" was withdrawn`,
      uz: `"${event}" uchun ishtirok tasdig'i qaytarib olindi`,
    }),
    preheader: L(locale, {
      ru: 'Ваша заявка снова на рассмотрении.',
      en: 'Your request is under review again.',
      uz: 'Arizangiz qayta koʻrib chiqilmoqda.',
    }),
    heading: greeting(locale, str(ctx, 'userName')),
    intro: [
      L(locale, {
        ru: `Подтверждение вашего участия в мероприятии «${event}» было отозвано организатором. Заявка снова находится на рассмотрении.`,
        en: `The organizer has withdrawn the confirmation of your participation in "${event}". Your request is under review again.`,
        uz: `Tashkilotchi "${event}" tadbiridagi ishtirokingiz tasdig'ini qaytarib oldi. Arizangiz qayta ko'rib chiqilmoqda.`,
      }),
    ],
    blocks: reason
      ? [
          {
            type: 'infobox',
            tone: 'neutral',
            title: L(locale, {
              ru: 'Причина',
              en: 'Reason',
              uz: 'Sabab',
            }),
            lines: [reason],
          },
        ]
      : [],
    outro: [
      L(locale, {
        ru: 'Мы сообщим вам о решении. Билет станет действительным снова после повторного одобрения.',
        en: 'We will notify you of the decision. Your ticket becomes valid again after re-approval.',
        uz: "Qaror haqida sizga xabar beramiz. Chipta qayta tasdiqlangach yana amal qiladi.",
      }),
    ],
  };
}

// ─── Organizer broadcast ──────────────────────────────────────────────────────

function eventNotification(ctx: EmailContext, locale: Locale): EmailDocument {
  const event = str(ctx, 'eventTitle');
  const org = str(ctx, 'organizationName');
  return {
    lang: locale,
    category: 'notification',
    subject: str(ctx, '__subject', `${org}: ${event}`),
    preheader: L(locale, {
      ru: `Сообщение от организатора мероприятия «${event}».`,
      en: `A message from the organizer of "${event}".`,
      uz: `"${event}" tadbiri tashkilotchisidan xabar.`,
    }),
    heading: greeting(locale, str(ctx, 'userName')),
    intro: [
      L(locale, {
        ru: `Организатор мероприятия «${event}» отправил вам сообщение:`,
        en: `The organizer of "${event}" sent you a message:`,
        uz: `"${event}" tadbiri tashkilotchisi sizga xabar yubordi:`,
      }),
    ],
    blocks: [{ type: 'message', text: str(ctx, 'message') }],
    outro: [
      L(locale, {
        ru: `С уважением, команда «${org}».`,
        en: `Best regards, the ${org} team.`,
        uz: `Hurmat bilan, "${org}" jamoasi.`,
      }),
    ],
  };
}

// ─── Operational notifications ────────────────────────────────────────────────

function contactRequest(ctx: EmailContext, locale: Locale): EmailDocument {
  const isRental = bool(ctx, 'isPlaceRental');
  const rows: Array<[string, string]> = [
    [L(locale, { ru: 'Имя', en: 'Name', uz: 'Ism' }), str(ctx, 'userName')],
    [L(locale, { ru: 'Телефон', en: 'Phone', uz: 'Telefon' }), str(ctx, 'phone')],
  ];
  if (isRental) {
    if (ctx.rentalPlaceTitle)
      rows.push([
        L(locale, { ru: 'Площадка', en: 'Venue', uz: 'Maydon' }),
        str(ctx, 'rentalPlaceTitle'),
      ]);
    if (ctx.rentalTypeName)
      rows.push([
        L(locale, { ru: 'Тип аренды', en: 'Rental type', uz: 'Ijara turi' }),
        str(ctx, 'rentalTypeName'),
      ]);
    if (ctx.requesterOrganizationName)
      rows.push([
        L(locale, { ru: 'Организация', en: 'Organization', uz: 'Tashkilot' }),
        str(ctx, 'requesterOrganizationName'),
      ]);
  }
  const message = str(ctx, 'message');
  return {
    lang: locale,
    category: 'transactional',
    subject: isRental
      ? L(locale, {
          ru: 'Новая заявка на аренду площадки — EventFlow',
          en: 'New venue rental request — EventFlow',
          uz: 'Maydon ijarasi uchun yangi ariza — EventFlow',
        })
      : L(locale, {
          ru: 'Новая заявка на связь — EventFlow',
          en: 'New contact request — EventFlow',
          uz: "Bog'lanish uchun yangi ariza — EventFlow",
        }),
    preheader: L(locale, {
      ru: 'Подробности заявки внутри.',
      en: 'Request details inside.',
      uz: 'Ariza tafsilotlari ichkarida.',
    }),
    heading: isRental
      ? L(locale, {
          ru: 'Новая заявка на аренду площадки',
          en: 'New venue rental request',
          uz: 'Maydon ijarasi uchun yangi ariza',
        })
      : L(locale, {
          ru: 'Новая заявка на связь',
          en: 'New contact request',
          uz: "Bog'lanish uchun yangi ariza",
        }),
    intro: [
      L(locale, {
        ru: 'Поступила новая заявка от пользователя:',
        en: 'A new request was submitted by a user:',
        uz: 'Foydalanuvchidan yangi ariza keldi:',
      }),
    ],
    blocks: [
      { type: 'keyvalue', rows },
      ...(message
        ? [
            {
              type: 'infobox' as const,
              tone: 'neutral' as const,
              title: L(locale, { ru: 'Сообщение', en: 'Message', uz: 'Xabar' }),
              lines: [message],
            },
          ]
        : []),
    ],
    cta: {
      label: L(locale, {
        ru: 'Открыть в кабинете',
        en: 'Open in dashboard',
        uz: 'Kabinetda ochish',
      }),
      url: str(ctx, 'dashboardUrl'),
    },
  };
}

/** E-11b/§2.1: напоминание о скором истечении пакета тарифа. */
function planExpiryReminder(ctx: EmailContext, locale: Locale): EmailDocument {
  const planKey = str(ctx, 'planKey');
  const expiresAt = str(ctx, 'expiresAtFormatted');
  const daysLeft = str(ctx, 'daysLeft');
  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Тариф ${planKey} истекает ${expiresAt} — EventFlow`,
      en: `Your ${planKey} plan expires on ${expiresAt} — EventFlow`,
      uz: `${planKey} tarifingiz ${expiresAt} kuni tugaydi — EventFlow`,
    }),
    preheader: L(locale, {
      ru: 'Продлите пакет, чтобы сохранить условия тарифа.',
      en: 'Renew to keep your plan benefits.',
      uz: 'Tarif shartlarini saqlash uchun paketni uzaytiring.',
    }),
    heading: L(locale, {
      ru: 'Пакет скоро истекает',
      en: 'Your plan is expiring soon',
      uz: 'Paket tez orada tugaydi',
    }),
    intro: [
      L(locale, {
        ru: `Пакет тарифа ${planKey} истекает ${expiresAt} (через ${daysLeft} дн.). После истечения организация перейдёт на условия START, а неиспользованные кредиты событий сгорят — при продлении выдаются свежие.`,
        en: `Your ${planKey} pack expires on ${expiresAt} (${daysLeft} days left). After expiry the organization reverts to START terms and unused event credits are reset — renewal grants a fresh set.`,
        uz: `${planKey} paketi ${expiresAt} kuni tugaydi (${daysLeft} kun qoldi). Tugagach tashkilot START shartlariga o'tadi, ishlatilmagan kreditlar bekor bo'ladi — uzaytirishda yangilari beriladi.`,
      }),
    ],
    cta: {
      label: L(locale, {
        ru: 'Продлить в кабинете',
        en: 'Renew in the cabinet',
        uz: 'Kabinetda uzaytirish',
      }),
      url: str(ctx, 'billingUrl'),
    },
  };
}

function blogApproved(ctx: EmailContext, locale: Locale): EmailDocument {
  const title = str(ctx, 'postTitle');
  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Статья «${title}» одобрена — EventFlow`,
      en: `Your article "${title}" was approved — EventFlow`,
      uz: `"${title}" maqolangiz tasdiqlandi — EventFlow`,
    }),
    preheader: L(locale, {
      ru: 'Статья опубликована.',
      en: 'Your article is now published.',
      uz: 'Maqola endi chop etildi.',
    }),
    heading: L(locale, {
      ru: 'Статья одобрена',
      en: 'Article approved',
      uz: 'Maqola tasdiqlandi',
    }),
    intro: [
      L(locale, {
        ru: `Ваша статья «${title}» прошла модерацию и опубликована.`,
        en: `Your article "${title}" passed moderation and is now published.`,
        uz: `"${title}" maqolangiz moderatsiyadan o'tdi va chop etildi.`,
      }),
    ],
    cta: {
      label: L(locale, {
        ru: 'Открыть статью',
        en: 'Open article',
        uz: 'Maqolani ochish',
      }),
      url: str(ctx, 'dashboardUrl'),
    },
  };
}

function blogRejected(ctx: EmailContext, locale: Locale): EmailDocument {
  const title = str(ctx, 'postTitle');
  const reason = str(ctx, 'reason');
  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Статья «${title}» отклонена — EventFlow`,
      en: `Your article "${title}" needs changes — EventFlow`,
      uz: `"${title}" maqolangiz qayta ko'rib chiqilishi kerak — EventFlow`,
    }),
    preheader: L(locale, {
      ru: 'Требуются изменения перед публикацией.',
      en: 'Changes are required before publishing.',
      uz: "Chop etishdan oldin o'zgartirish kerak.",
    }),
    heading: L(locale, {
      ru: 'Статья отклонена',
      en: 'Article not approved',
      uz: 'Maqola tasdiqlanmadi',
    }),
    intro: [
      L(locale, {
        ru: `Ваша статья «${title}» не прошла модерацию.`,
        en: `Your article "${title}" did not pass moderation.`,
        uz: `"${title}" maqolangiz moderatsiyadan o'tmadi.`,
      }),
    ],
    blocks: reason
      ? [
          {
            type: 'infobox',
            tone: 'neutral',
            title: L(locale, { ru: 'Причина', en: 'Reason', uz: 'Sabab' }),
            lines: [reason],
          },
        ]
      : [],
    cta: {
      label: L(locale, {
        ru: 'Редактировать статью',
        en: 'Edit article',
        uz: 'Maqolani tahrirlash',
      }),
      url: str(ctx, 'dashboardUrl'),
    },
  };
}

// ─── Organization verification ────────────────────────────────────────────────

function organizationApproved(ctx: EmailContext, locale: Locale): EmailDocument {
  const org = str(ctx, 'organizationName');
  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Организация «${org}» верифицирована — EventFlow`,
      en: `"${org}" is verified — EventFlow`,
      uz: `"${org}" tashkiloti tasdiqlandi — EventFlow`,
    }),
    preheader: L(locale, {
      ru: 'Проверка пройдена — можно публиковать мероприятия.',
      en: 'Verification passed — you can publish events now.',
      uz: "Tekshiruv o'tildi — endi tadbir chop etishingiz mumkin.",
    }),
    heading: L(locale, {
      ru: 'Организация верифицирована',
      en: 'Organization verified',
      uz: 'Tashkilot tasdiqlandi',
    }),
    intro: [
      L(locale, {
        ru: `Организация «${org}» прошла проверку на EventFlow. Теперь вы можете отправлять мероприятия на модерацию и публиковать их.`,
        en: `"${org}" has passed verification on EventFlow. You can now submit events for moderation and publish them.`,
        uz: `"${org}" EventFlow'da tekshiruvdan o'tdi. Endi tadbirlarni moderatsiyaga yuborib, chop etishingiz mumkin.`,
      }),
    ],
    blocks: [
      {
        type: 'infobox',
        tone: 'success',
        title: L(locale, {
          ru: 'Что доступно',
          en: 'What you can do',
          uz: 'Nimalar ochildi',
        }),
        lines: [
          L(locale, {
            ru: 'Создание и публикация мероприятий, приём регистраций и билеты.',
            en: 'Create and publish events, accept registrations and issue tickets.',
            uz: "Tadbir yaratish va chop etish, ro'yxatga olish va chiptalar.",
          }),
          L(locale, {
            ru: 'Статьи блога, сертификаты и бейджи участников.',
            en: 'Blog articles, participant certificates and badges.',
            uz: 'Blog maqolalari, ishtirokchi sertifikatlari va beyjlari.',
          }),
        ],
      },
    ],
    cta: {
      label: L(locale, {
        ru: 'Перейти в кабинет',
        en: 'Open the cabinet',
        uz: 'Kabinetga o‘tish',
      }),
      url: str(ctx, 'dashboardUrl'),
    },
  };
}

function organizationRejected(ctx: EmailContext, locale: Locale): EmailDocument {
  const org = str(ctx, 'organizationName');
  const reason = str(ctx, 'reason');
  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Организация «${org}» не прошла верификацию — EventFlow`,
      en: `"${org}" did not pass verification — EventFlow`,
      uz: `"${org}" tasdiqlashdan o'tmadi — EventFlow`,
    }),
    preheader: L(locale, {
      ru: 'Нужны корректные данные организации.',
      en: 'Corrected organization details are required.',
      uz: "Tashkilot ma'lumotlarini to'g'rilash kerak.",
    }),
    heading: L(locale, {
      ru: 'Верификация отклонена',
      en: 'Verification declined',
      uz: 'Tasdiqlash rad etildi',
    }),
    intro: [
      L(locale, {
        ru: `Организация «${org}» не прошла проверку. Публикация мероприятий остаётся недоступной до повторной верификации.`,
        en: `"${org}" did not pass verification. Publishing events stays unavailable until it is verified.`,
        uz: `"${org}" tekshiruvdan o'tmadi. Qayta tasdiqlanmaguncha tadbir chop etish yopiq bo'ladi.`,
      }),
    ],
    blocks: reason
      ? [
          {
            type: 'infobox',
            tone: 'warning',
            title: L(locale, {
              ru: 'Причина отказа',
              en: 'Reason',
              uz: 'Rad etish sababi',
            }),
            lines: [reason],
          },
        ]
      : [],
    cta: {
      label: L(locale, {
        ru: 'Открыть настройки организации',
        en: 'Open organization settings',
        uz: 'Tashkilot sozlamalarini ochish',
      }),
      url: str(ctx, 'dashboardUrl'),
    },
    outro: [
      L(locale, {
        ru: 'Исправьте данные организации в настройках и напишите в поддержку — мы проверим заявку повторно.',
        en: 'Update your organization details in the settings and contact support — we will review the application again.',
        uz: "Sozlamalarda tashkilot ma'lumotlarini to'g'rilang va qo'llab-quvvatlash xizmatiga yozing — arizani qayta ko'rib chiqamiz.",
      }),
    ],
  };
}

// ─── Event moderation ─────────────────────────────────────────────────────────

function eventModerationRows(
  ctx: EmailContext,
  locale: Locale,
): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const startDate = str(ctx, 'startDate');
  const venue = str(ctx, 'venue');
  if (startDate)
    rows.push([
      L(locale, { ru: 'Дата начала', en: 'Starts', uz: 'Boshlanish' }),
      startDate,
    ]);
  if (venue)
    rows.push([
      L(locale, { ru: 'Место', en: 'Venue', uz: 'Joy' }),
      venue,
    ]);
  return rows;
}

function eventApproved(ctx: EmailContext, locale: Locale): EmailDocument {
  const title = str(ctx, 'eventTitle');
  const publicUrl = str(ctx, 'publicUrl');
  const rows = eventModerationRows(ctx, locale);

  const doc: EmailDocument = {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Мероприятие «${title}» опубликовано — EventFlow`,
      en: `Your event "${title}" is published — EventFlow`,
      uz: `"${title}" tadbiringiz chop etildi — EventFlow`,
    }),
    preheader: L(locale, {
      ru: 'Модерация пройдена, мероприятие доступно участникам.',
      en: 'Moderation passed — your event is live.',
      uz: "Moderatsiya o'tildi — tadbir endi ochiq.",
    }),
    heading: L(locale, {
      ru: 'Мероприятие одобрено',
      en: 'Event approved',
      uz: 'Tadbir tasdiqlandi',
    }),
    intro: [
      L(locale, {
        ru: `Мероприятие «${title}» прошло проверку и опубликовано на EventFlow — теперь оно доступно для просмотра и регистрации.`,
        en: `Your event "${title}" passed review and is now published on EventFlow — it is open for viewing and registration.`,
        uz: `"${title}" tadbiringiz tekshiruvdan o'tdi va EventFlow'da chop etildi — endi u ko'rish va ro'yxatdan o'tish uchun ochiq.`,
      }),
    ],
    blocks: rows.length ? [{ type: 'keyvalue', rows }] : [],
    outro: [
      L(locale, {
        ru: 'Управлять мероприятием, участниками и материалами можно в кабинете организатора.',
        en: 'You can manage the event, its participants and materials in the organizer cabinet.',
        uz: "Tadbir, ishtirokchilar va materiallarni tashkilotchi kabinetida boshqarishingiz mumkin.",
      }),
    ],
  };

  const ctaUrl = publicUrl || str(ctx, 'dashboardUrl');
  if (ctaUrl) {
    doc.cta = {
      label: publicUrl
        ? L(locale, {
            ru: 'Открыть страницу мероприятия',
            en: 'Open the event page',
            uz: 'Tadbir sahifasini ochish',
          })
        : L(locale, {
            ru: 'Открыть в кабинете',
            en: 'Open in the cabinet',
            uz: 'Kabinetda ochish',
          }),
      url: ctaUrl,
    };
  }

  return doc;
}

function eventRejected(ctx: EmailContext, locale: Locale): EmailDocument {
  const title = str(ctx, 'eventTitle');
  const reason = str(ctx, 'reason');
  const rows = eventModerationRows(ctx, locale);

  const blocks: EmailDocument['blocks'] = [];
  if (reason) {
    blocks.push({
      type: 'infobox',
      tone: 'warning',
      title: L(locale, {
        ru: 'Причина отказа',
        en: 'Reason',
        uz: 'Rad etish sababi',
      }),
      lines: [reason],
    });
  }
  if (rows.length) blocks.push({ type: 'keyvalue', rows });

  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Мероприятие «${title}» не прошло модерацию — EventFlow`,
      en: `Your event "${title}" needs changes — EventFlow`,
      uz: `"${title}" tadbiringiz qayta ko'rib chiqilishi kerak — EventFlow`,
    }),
    preheader: L(locale, {
      ru: 'Требуются изменения перед публикацией.',
      en: 'Changes are required before publishing.',
      uz: "Chop etishdan oldin o'zgartirish kerak.",
    }),
    heading: L(locale, {
      ru: 'Мероприятие отклонено',
      en: 'Event not approved',
      uz: 'Tadbir tasdiqlanmadi',
    }),
    intro: [
      L(locale, {
        ru: `Мероприятие «${title}» не прошло модерацию и возвращено в черновики. Внесите правки и отправьте его на проверку повторно.`,
        en: `Your event "${title}" did not pass moderation and was returned to drafts. Make the changes and submit it for review again.`,
        uz: `"${title}" tadbiringiz moderatsiyadan o'tmadi va qoralamalarga qaytarildi. O'zgartirish kiriting va qayta ko'rib chiqishga yuboring.`,
      }),
    ],
    blocks,
    cta: {
      label: L(locale, {
        ru: 'Редактировать мероприятие',
        en: 'Edit the event',
        uz: 'Tadbirni tahrirlash',
      }),
      url: str(ctx, 'dashboardUrl'),
    },
    outro: [
      L(locale, {
        ru: 'Если решение кажется ошибочным, напишите в поддержку — мы разберёмся.',
        en: 'If you believe this decision is a mistake, contact support and we will look into it.',
        uz: "Agar bu qaror xato deb hisoblasangiz, qo'llab-quvvatlash xizmatiga yozing — tekshirib chiqamiz.",
      }),
    ],
  };
}

// ─── Task notifications ───────────────────────────────────────────────────────

function taskAssigned(ctx: EmailContext, locale: Locale): EmailDocument {
  const taskTitle = str(ctx, 'taskTitle');
  const rows: Array<[string, string]> = [
    [L(locale, { ru: 'Доска', en: 'Board', uz: 'Doska' }), str(ctx, 'boardName')],
    [L(locale, { ru: 'Колонка', en: 'Column', uz: 'Ustun' }), str(ctx, 'columnName')],
    [
      L(locale, { ru: 'Назначил', en: 'Assigned by', uz: 'Tayinladi' }),
      str(ctx, 'assignedByName'),
    ],
  ];
  if (ctx.priority)
    rows.push([
      L(locale, { ru: 'Приоритет', en: 'Priority', uz: 'Muhimlik' }),
      str(ctx, 'priority'),
    ]);
  if (ctx.dueDate)
    rows.push([
      L(locale, { ru: 'Срок', en: 'Due date', uz: 'Muddat' }),
      str(ctx, 'dueDate'),
    ]);
  return {
    lang: locale,
    category: 'notification',
    subject: L(locale, {
      ru: `Вам назначена задача: ${taskTitle}`,
      en: `You were assigned a task: ${taskTitle}`,
      uz: `Sizga vazifa tayinlandi: ${taskTitle}`,
    }),
    preheader: L(locale, {
      ru: 'Новая задача в вашей доске.',
      en: 'A new task on your board.',
      uz: 'Doskangizdagi yangi vazifa.',
    }),
    heading: greeting(locale, str(ctx, 'assigneeName')),
    intro: [
      L(locale, {
        ru: `Вам назначена задача «${taskTitle}».`,
        en: `You have been assigned the task "${taskTitle}".`,
        uz: `Sizga "${taskTitle}" vazifasi tayinlandi.`,
      }),
    ],
    blocks: [{ type: 'keyvalue', rows }],
    cta: {
      label: L(locale, {
        ru: 'Открыть задачу',
        en: 'Open task',
        uz: 'Vazifani ochish',
      }),
      url: str(ctx, 'taskUrl'),
    },
  };
}

function taskDeadline(ctx: EmailContext, locale: Locale): EmailDocument {
  const taskTitle = str(ctx, 'taskTitle');
  const isOverdue = bool(ctx, 'isOverdue');
  return {
    lang: locale,
    category: 'notification',
    subject: isOverdue
      ? L(locale, {
          ru: `Просрочена задача: ${taskTitle}`,
          en: `Overdue task: ${taskTitle}`,
          uz: `Muddati o'tgan vazifa: ${taskTitle}`,
        })
      : L(locale, {
          ru: `Приближается срок задачи: ${taskTitle}`,
          en: `Task deadline approaching: ${taskTitle}`,
          uz: `Vazifa muddati yaqinlashmoqda: ${taskTitle}`,
        }),
    preheader: isOverdue
      ? L(locale, {
          ru: 'Задача требует внимания.',
          en: 'This task needs attention.',
          uz: "Bu vazifa e'tibor talab qiladi.",
        })
      : L(locale, {
          ru: 'Не пропустите срок выполнения.',
          en: "Don't miss the due date.",
          uz: "Muddatni o'tkazib yubormang.",
        }),
    heading: greeting(locale, str(ctx, 'assigneeName')),
    intro: [
      isOverdue
        ? L(locale, {
            ru: `Задача «${taskTitle}» просрочена на ${str(ctx, 'daysOverdue')} дн.`,
            en: `The task "${taskTitle}" is overdue by ${str(ctx, 'daysOverdue')} day(s).`,
            uz: `"${taskTitle}" vazifasi ${str(ctx, 'daysOverdue')} kunga kechikdi.`,
          })
        : L(locale, {
            ru: `До срока задачи «${taskTitle}» осталось ${str(ctx, 'daysLeft')} дн.`,
            en: `The task "${taskTitle}" is due in ${str(ctx, 'daysLeft')} day(s).`,
            uz: `"${taskTitle}" vazifasi muddatiga ${str(ctx, 'daysLeft')} kun qoldi.`,
          }),
    ],
    blocks: [
      {
        type: 'keyvalue',
        rows: [
          [L(locale, { ru: 'Доска', en: 'Board', uz: 'Doska' }), str(ctx, 'boardName')],
          [L(locale, { ru: 'Колонка', en: 'Column', uz: 'Ustun' }), str(ctx, 'columnName')],
          [L(locale, { ru: 'Срок', en: 'Due date', uz: 'Muddat' }), str(ctx, 'dueDate')],
        ],
      },
    ],
    cta: {
      label: L(locale, {
        ru: 'Открыть задачу',
        en: 'Open task',
        uz: 'Vazifani ochish',
      }),
      url: str(ctx, 'taskUrl'),
    },
  };
}

function taskMentioned(ctx: EmailContext, locale: Locale): EmailDocument {
  const taskTitle = str(ctx, 'taskTitle');
  return {
    lang: locale,
    category: 'notification',
    subject: L(locale, {
      ru: `Вас упомянули в задаче: ${taskTitle}`,
      en: `You were mentioned in: ${taskTitle}`,
      uz: `Sizni vazifada eslab o'tishdi: ${taskTitle}`,
    }),
    preheader: L(locale, {
      ru: 'Новое упоминание в комментарии.',
      en: 'A new mention in a comment.',
      uz: 'Izohda yangi eslatma.',
    }),
    heading: greeting(locale, str(ctx, 'mentionedName')),
    intro: [
      L(locale, {
        ru: `${str(ctx, 'authorName')} упомянул вас в задаче «${taskTitle}» (доска «${str(
          ctx,
          'boardName',
        )}»):`,
        en: `${str(ctx, 'authorName')} mentioned you in the task "${taskTitle}" (board "${str(
          ctx,
          'boardName',
        )}"):`,
        uz: `${str(ctx, 'authorName')} sizni "${taskTitle}" vazifasida eslab o'tdi ("${str(
          ctx,
          'boardName',
        )}" doskasi):`,
      }),
    ],
    blocks: [{ type: 'message', text: str(ctx, 'commentText') }],
    cta: {
      label: L(locale, {
        ru: 'Перейти к задаче',
        en: 'Go to task',
        uz: "Vazifaga o'tish",
      }),
      url: str(ctx, 'taskUrl'),
    },
  };
}

function certificateIssued(ctx: EmailContext, locale: Locale): EmailDocument {
  const event = str(ctx, 'eventName');
  const eventDate = str(ctx, 'eventDate');
  const certificatesUrl = str(ctx, 'certificatesUrl');
  const verifyUrl = str(ctx, 'verifyUrl');

  const rows: Array<[string, string]> = [
    [L(locale, { ru: 'Мероприятие', en: 'Event', uz: 'Tadbir' }), event],
  ];
  if (eventDate) {
    rows.push([L(locale, { ru: 'Дата', en: 'Date', uz: 'Sana' }), eventDate]);
  }

  const doc: EmailDocument = {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Ваш сертификат за «${event}» готов`,
      en: `Your certificate for "${event}" is ready`,
      uz: `"${event}" uchun sertifikatingiz tayyor`,
    }),
    preheader: L(locale, {
      ru: 'Поздравляем! Сертификат можно скачать.',
      en: 'Congratulations! Your certificate is available.',
      uz: 'Tabriklaymiz! Sertifikatingizni yuklab olishingiz mumkin.',
    }),
    heading: greeting(locale, str(ctx, 'recipientName')),
    intro: [
      L(locale, {
        ru: `Поздравляем! Вам выдан сертификат за участие в мероприятии «${event}».`,
        en: `Congratulations! You have been issued a certificate for taking part in "${event}".`,
        uz: `Tabriklaymiz! Sizga "${event}" tadbirida ishtirok etganingiz uchun sertifikat berildi.`,
      }),
    ],
    blocks: [{ type: 'keyvalue', rows }],
  };

  if (certificatesUrl) {
    doc.cta = {
      label: L(locale, {
        ru: 'Открыть мои сертификаты',
        en: 'Open my certificates',
        uz: 'Sertifikatlarimni ochish',
      }),
      url: certificatesUrl,
    };
  }

  const outro: string[] = [];
  if (verifyUrl) {
    outro.push(
      L(locale, {
        ru: `Подлинность сертификата можно проверить по ссылке: ${verifyUrl}`,
        en: `You can verify the certificate here: ${verifyUrl}`,
        uz: `Sertifikat haqiqiyligini quyidagi havola orqali tekshirishingiz mumkin: ${verifyUrl}`,
      }),
    );
  }
  if (outro.length) {
    doc.outro = outro;
  }

  return doc;
}

// ─── Notification chains (BL-26): reminders, summaries, moderation queue ──────

/** «# участник / # участника / # участников» (ru one/few/many — легенда каталога). */
const ATTENDEES_PLURAL: LocalizedPluralForms = {
  ru: {
    one: '# участник',
    few: '# участника',
    many: '# участников',
    other: '# участника',
  },
  uz: { other: '# ishtirokchi' },
  en: { one: '# attendee', other: '# attendees' },
};

const HOURS_PLURAL: LocalizedPluralForms = {
  ru: { one: '# час', few: '# часа', many: '# часов', other: '# часа' },
  uz: { other: '# soat' },
  en: { one: '# hour', other: '# hours' },
};

const EVENTS_PLURAL: LocalizedPluralForms = {
  ru: {
    one: '# событие',
    few: '# события',
    many: '# событий',
    other: '# события',
  },
  uz: { other: '# tadbir' },
  en: { one: '# event', other: '# events' },
};

function num(ctx: EmailContext, key: string): number | null {
  const v = ctx[key];
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * REM-01 email-fallback (OQ-17): напоминание участнику без push-токена.
 * Время — в TZ события (`Event.timezone ?? Asia/Tashkent`), площадка/адрес,
 * ссылка на билет. Категория transactional по решению OQ-17.
 */
function eventReminder(ctx: EmailContext, locale: Locale): EmailDocument {
  const title = str(ctx, 'eventTitle');
  const when = formatEventDateTime(ctx.startsAt, ctx.timezone, locale);
  const venue = str(ctx, 'venue');
  const address = str(ctx, 'address');
  const ticketNumber = str(ctx, 'ticketNumber');
  const ticketUrl = str(ctx, 'ticketUrl');

  const rows: Array<[string, string]> = [];
  if (when)
    rows.push([L(locale, { ru: 'Начало', en: 'Starts', uz: 'Boshlanishi' }), when]);
  if (venue)
    rows.push([L(locale, { ru: 'Место', en: 'Venue', uz: 'Joy' }), venue]);
  if (address)
    rows.push([L(locale, { ru: 'Адрес', en: 'Address', uz: 'Manzil' }), address]);
  if (bool(ctx, 'isOnline'))
    rows.push([
      L(locale, { ru: 'Формат', en: 'Format', uz: 'Format' }),
      L(locale, { ru: 'Онлайн', en: 'Online', uz: 'Onlayn' }),
    ]);
  if (ticketNumber)
    rows.push([
      L(locale, { ru: 'Билет', en: 'Ticket', uz: 'Chipta' }),
      ticketNumber,
    ]);

  const doc: EmailDocument = {
    lang: locale,
    category: 'transactional',
    subject: when
      ? L(locale, {
          ru: `Напоминание: «${title}» — ${when}`,
          en: `Reminder: "${title}" — ${when}`,
          uz: `Eslatma: "${title}" — ${when}`,
        })
      : L(locale, {
          ru: `Напоминание о мероприятии «${title}»`,
          en: `Reminder about "${title}"`,
          uz: `"${title}" tadbiri haqida eslatma`,
        }),
    preheader: L(locale, {
      ru: 'Мероприятие уже скоро — билет внутри письма.',
      en: 'Your event is coming up — your ticket is inside.',
      uz: 'Tadbir yaqinlashmoqda — chiptangiz xat ichida.',
    }),
    heading: greeting(locale, str(ctx, 'userName')),
    intro: [
      when
        ? L(locale, {
            ru: `Напоминаем: мероприятие «${title}» начнётся ${when}.`,
            en: `A quick reminder: "${title}" starts on ${when}.`,
            uz: `Eslatib o'tamiz: "${title}" tadbiri ${when} da boshlanadi.`,
          })
        : L(locale, {
            ru: `Напоминаем: мероприятие «${title}» уже скоро.`,
            en: `A quick reminder: "${title}" is coming up soon.`,
            uz: `Eslatib o'tamiz: "${title}" tadbiri yaqinlashmoqda.`,
          }),
    ],
    blocks: rows.length ? [{ type: 'keyvalue', rows }] : [],
  };

  if (ticketUrl) {
    doc.cta = {
      label: L(locale, {
        ru: 'Открыть билет',
        en: 'Open my ticket',
        uz: 'Chiptani ochish',
      }),
      url: ticketUrl,
    };
    doc.outro = [
      L(locale, {
        ru: 'Покажите QR-код из билета на входе — это ускорит регистрацию.',
        en: 'Show the QR code from your ticket at the entrance to speed up check-in.',
        uz: "Kirishda chiptadagi QR-kodni ko'rsating — bu ro'yxatdan o'tishni tezlashtiradi.",
      }),
    ];
  }

  return doc;
}

/**
 * SUM-01: сводка участнику после события — спасибо, сертификат (если выдан),
 * материалы, анонс следующего события организатора. Informational →
 * категория notification (List-Unsubscribe действует).
 */
function eventSummaryAttendee(ctx: EmailContext, locale: Locale): EmailDocument {
  const title = str(ctx, 'eventTitle');
  const orgName = str(ctx, 'organizationName');
  const certificateUrl = str(ctx, 'certificateUrl');
  const materialsUrl = str(ctx, 'materialsUrl');
  const nextEventTitle = str(ctx, 'nextEventTitle');
  const nextEventUrl = str(ctx, 'nextEventUrl');
  const eventUrl = str(ctx, 'eventUrl');

  const blocks: EmailDocument['blocks'] = [];
  if (certificateUrl) {
    blocks.push({
      type: 'infobox',
      tone: 'success',
      title: L(locale, {
        ru: 'Ваш сертификат готов',
        en: 'Your certificate is ready',
        uz: 'Sertifikatingiz tayyor',
      }),
      lines: [
        L(locale, {
          ru: 'Вам выдан сертификат участника — он уже доступен для скачивания.',
          en: 'You have been issued a participation certificate — it is ready to download.',
          uz: 'Sizga ishtirokchi sertifikati berildi — uni yuklab olishingiz mumkin.',
        }),
      ],
    });
  }
  if (nextEventTitle && nextEventUrl) {
    blocks.push({
      type: 'infobox',
      tone: 'neutral',
      title: L(locale, {
        ru: 'Что дальше',
        en: "What's next",
        uz: 'Keyingi tadbir',
      }),
      lines: [
        L(locale, {
          ru: `Следующее мероприятие организатора — «${nextEventTitle}»: ${nextEventUrl}`,
          en: `The organizer's next event is "${nextEventTitle}": ${nextEventUrl}`,
          uz: `Tashkilotchining keyingi tadbiri — "${nextEventTitle}": ${nextEventUrl}`,
        }),
      ],
    });
  }

  const outro: string[] = [];
  if (materialsUrl) {
    outro.push(
      L(locale, {
        ru: `Материалы мероприятия доступны по ссылке: ${materialsUrl}`,
        en: `Event materials are available here: ${materialsUrl}`,
        uz: `Tadbir materiallari quyidagi havolada: ${materialsUrl}`,
      }),
    );
  }
  outro.push(
    L(locale, {
      ru: 'Будем рады видеть вас снова.',
      en: 'We hope to see you again.',
      uz: "Sizni yana ko'rishdan xursand bo'lamiz.",
    }),
  );

  const doc: EmailDocument = {
    lang: locale,
    category: 'notification',
    subject: L(locale, {
      ru: `Спасибо за участие в «${title}»`,
      en: `Thank you for attending "${title}"`,
      uz: `"${title}" tadbirida ishtirok etganingiz uchun rahmat`,
    }),
    preheader: L(locale, {
      ru: 'Итоги, сертификат и материалы мероприятия.',
      en: 'Highlights, your certificate and event materials.',
      uz: 'Yakunlar, sertifikat va tadbir materiallari.',
    }),
    heading: greeting(locale, str(ctx, 'userName')),
    intro: [
      orgName
        ? L(locale, {
            ru: `Мероприятие «${title}» завершилось. Организатор ${orgName} благодарит вас за участие!`,
            en: `"${title}" has wrapped up. ${orgName} thanks you for taking part!`,
            uz: `"${title}" tadbiri yakunlandi. ${orgName} ishtirokingiz uchun minnatdorchilik bildiradi!`,
          })
        : L(locale, {
            ru: `Мероприятие «${title}» завершилось. Спасибо за участие!`,
            en: `"${title}" has wrapped up. Thank you for taking part!`,
            uz: `"${title}" tadbiri yakunlandi. Ishtirokingiz uchun rahmat!`,
          }),
    ],
    blocks,
    outro,
  };

  if (certificateUrl) {
    doc.cta = {
      label: L(locale, {
        ru: 'Открыть сертификат',
        en: 'Open my certificate',
        uz: 'Sertifikatni ochish',
      }),
      url: certificateUrl,
    };
  } else if (eventUrl) {
    doc.cta = {
      label: L(locale, {
        ru: 'Страница мероприятия',
        en: 'Event page',
        uz: 'Tadbir sahifasi',
      }),
      url: eventUrl,
    };
  }

  return doc;
}

/**
 * SUM-02: сводка организатору — посещаемость (checked-in/APPROVED),
 * конверсия (APPROVED/viewsCount), выручка UZS и комиссия, выплата по
 * расписанию платформы; в письме полная таблица (каталог §7).
 */
function eventSummaryOrganizer(
  ctx: EmailContext,
  locale: Locale,
): EmailDocument {
  const title = str(ctx, 'eventTitle');
  const checkedIn = num(ctx, 'checkedInCount');
  const approved = num(ctx, 'approvedCount');
  const attendancePercent = num(ctx, 'attendancePercent');
  const views = num(ctx, 'viewsCount');
  const conversionPercent = num(ctx, 'conversionPercent');
  const revenue = str(ctx, 'revenueFormatted');
  const commission = str(ctx, 'commissionFormatted');
  const analyticsUrl = str(ctx, 'analyticsUrl');
  const createEventUrl = str(ctx, 'createEventUrl');

  const rows: Array<[string, string]> = [];
  if (checkedIn !== null && approved !== null) {
    rows.push([
      L(locale, { ru: 'Посещаемость', en: 'Attendance', uz: 'Qatnashuv' }),
      attendancePercent !== null
        ? `${checkedIn} / ${approved} (${attendancePercent}%)`
        : `${checkedIn} / ${approved}`,
    ]);
  }
  if (views !== null)
    rows.push([
      L(locale, {
        ru: 'Просмотры страницы',
        en: 'Page views',
        uz: "Sahifa ko'rishlari",
      }),
      String(views),
    ]);
  if (conversionPercent !== null)
    rows.push([
      L(locale, {
        ru: 'Конверсия в заявку',
        en: 'View-to-registration conversion',
        uz: "Ro'yxatdan o'tish konversiyasi",
      }),
      `${conversionPercent}%`,
    ]);
  if (revenue)
    rows.push([
      L(locale, { ru: 'Выручка', en: 'Revenue', uz: 'Tushum' }),
      `${revenue} UZS`,
    ]);
  if (commission)
    rows.push([
      L(locale, {
        ru: 'Комиссия платформы',
        en: 'Platform fee',
        uz: 'Platforma komissiyasi',
      }),
      `${commission} UZS`,
    ]);

  const attended =
    checkedIn !== null ? plural(locale, checkedIn, ATTENDEES_PLURAL) : '';

  const outro: string[] = [];
  if (revenue) {
    outro.push(
      L(locale, {
        ru: 'Выплата поступит по расписанию платформы.',
        en: 'The payout will arrive on the platform schedule.',
        uz: "To'lov platforma jadvali bo'yicha amalga oshiriladi.",
      }),
    );
  }
  if (createEventUrl) {
    outro.push(
      L(locale, {
        ru: `Создать следующее событие: ${createEventUrl}`,
        en: `Create your next event: ${createEventUrl}`,
        uz: `Keyingi tadbirni yaratish: ${createEventUrl}`,
      }),
    );
  }

  const doc: EmailDocument = {
    lang: locale,
    category: 'notification',
    subject: L(locale, {
      ru: `Итоги «${title}»: посещаемость и конверсия`,
      en: `"${title}" wrap-up: attendance and conversion`,
      uz: `"${title}" yakunlari: qatnashuv va konversiya`,
    }),
    preheader: L(locale, {
      ru: 'Краткая сводка завершившегося мероприятия.',
      en: 'A short summary of your finished event.',
      uz: 'Yakunlangan tadbir yuzasidan qisqa hisobot.',
    }),
    heading: L(locale, {
      ru: 'Мероприятие завершилось',
      en: 'Your event has finished',
      uz: 'Tadbir yakunlandi',
    }),
    intro: [
      attended && approved !== null
        ? L(locale, {
            ru: `Мероприятие «${title}» завершилось: пришло ${attended} из ${approved} подтверждённых.`,
            en: `"${title}" has finished: ${attended} out of ${approved} approved registrations checked in.`,
            uz: `"${title}" tadbiri yakunlandi: tasdiqlangan ${approved} ishtirokchidan ${attended} keldi.`,
          })
        : L(locale, {
            ru: `Мероприятие «${title}» завершилось. Краткие итоги — ниже, полная аналитика в кабинете.`,
            en: `"${title}" has finished. Highlights are below; full analytics are in the cabinet.`,
            uz: `"${title}" tadbiri yakunlandi. Qisqa yakunlar quyida, to'liq analitika kabinetda.`,
          }),
    ],
    blocks: rows.length ? [{ type: 'keyvalue', rows }] : [],
    outro,
  };

  if (analyticsUrl) {
    doc.cta = {
      label: L(locale, {
        ru: 'Открыть аналитику',
        en: 'Open analytics',
        uz: 'Analitikani ochish',
      }),
      url: analyticsUrl,
    };
  }

  return doc;
}

/** Общие строки модераторских писем (MOD-02/03/06) — адресат ops-ящик (OQ-31). */
function moderationRows(ctx: EmailContext, locale: Locale): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    [
      L(locale, { ru: 'Событие', en: 'Event', uz: 'Tadbir' }),
      str(ctx, 'eventTitle'),
    ],
  ];
  const orgName = str(ctx, 'organizationName');
  if (orgName)
    rows.push([
      L(locale, { ru: 'Организация', en: 'Organization', uz: 'Tashkilot' }),
      orgName,
    ]);
  const submitted = formatEventDateTime(ctx.submittedAt, ctx.timezone, locale);
  if (submitted)
    rows.push([
      L(locale, { ru: 'Отправлено', en: 'Submitted', uz: 'Yuborilgan' }),
      submitted,
    ]);
  return rows;
}

function moderationQueueCta(ctx: EmailContext, locale: Locale): EmailCta | undefined {
  const queueUrl = str(ctx, 'queueUrl');
  if (!queueUrl) return undefined;
  return {
    label: L(locale, {
      ru: 'Открыть очередь модерации',
      en: 'Open the moderation queue',
      uz: 'Moderatsiya navbatini ochish',
    }),
    url: queueUrl,
  };
}

/** MOD-02: событие ушло в PENDING_REVIEW — письмо операторам (supportEmail). */
function moderationQueueNew(ctx: EmailContext, locale: Locale): EmailDocument {
  const title = str(ctx, 'eventTitle');
  const pending = num(ctx, 'pendingCount');

  const blocks: EmailDocument['blocks'] = [
    { type: 'keyvalue', rows: moderationRows(ctx, locale) },
  ];
  if (pending !== null && pending > 0) {
    const pendingText = plural(locale, pending, EVENTS_PLURAL);
    blocks.push({
      type: 'infobox',
      tone: 'neutral',
      lines: [
        L(locale, {
          ru: `Сейчас в очереди: ${pendingText}.`,
          en: `Currently in the queue: ${pendingText}.`,
          uz: `Hozir navbatda: ${pendingText}.`,
        }),
      ],
    });
  }

  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Модерация: «${title}» ждёт проверки`,
      en: `Moderation: "${title}" is awaiting review`,
      uz: `Moderatsiya: "${title}" tekshiruvni kutmoqda`,
    }),
    preheader: L(locale, {
      ru: 'Новое событие в очереди модерации.',
      en: 'A new event is in the moderation queue.',
      uz: 'Moderatsiya navbatida yangi tadbir.',
    }),
    heading: L(locale, {
      ru: 'Новое событие в очереди модерации',
      en: 'New event in the moderation queue',
      uz: 'Moderatsiya navbatida yangi tadbir',
    }),
    intro: [
      L(locale, {
        ru: 'Организатор отправил событие на проверку.',
        en: 'An organizer has submitted an event for review.',
        uz: "Tashkilotchi tadbirni tekshiruvga yubordi.",
      }),
    ],
    blocks,
    cta: moderationQueueCta(ctx, locale),
  };
}

/** MOD-06: повторная подача после reject — в письме прежняя причина отклонения. */
function moderationQueueResubmit(
  ctx: EmailContext,
  locale: Locale,
): EmailDocument {
  const title = str(ctx, 'eventTitle');
  const previousReason = str(ctx, 'previousReason');

  const blocks: EmailDocument['blocks'] = [];
  if (previousReason) {
    blocks.push({
      type: 'infobox',
      tone: 'warning',
      title: L(locale, {
        ru: 'Прежняя причина отклонения',
        en: 'Previous rejection reason',
        uz: 'Avvalgi rad etish sababi',
      }),
      lines: [previousReason],
    });
  }
  blocks.push({ type: 'keyvalue', rows: moderationRows(ctx, locale) });

  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `Модерация: повторная подача «${title}»`,
      en: `Moderation: "${title}" was resubmitted`,
      uz: `Moderatsiya: "${title}" qayta yuborildi`,
    }),
    preheader: L(locale, {
      ru: 'Организатор внёс правки и снова отправил событие.',
      en: 'The organizer made changes and submitted the event again.',
      uz: "Tashkilotchi o'zgartirish kiritib, tadbirni qayta yubordi.",
    }),
    heading: L(locale, {
      ru: 'Повторная подача на модерацию',
      en: 'Resubmitted for moderation',
      uz: 'Moderatsiyaga qayta yuborildi',
    }),
    intro: [
      L(locale, {
        ru: 'Событие уже отклонялось: организатор внёс правки и отправил его на проверку повторно.',
        en: 'This event was rejected before: the organizer made changes and submitted it for review again.',
        uz: "Bu tadbir avval rad etilgan edi: tashkilotchi o'zgartirish kiritib, uni qayta tekshiruvga yubordi.",
      }),
    ],
    blocks,
    cta: moderationQueueCta(ctx, locale),
  };
}

/** MOD-03: SLA-таймер — событие висит в PENDING_REVIEW дольше 24 часов. */
function moderationSlaOverdue(
  ctx: EmailContext,
  locale: Locale,
): EmailDocument {
  const title = str(ctx, 'eventTitle');
  const hoursPending = num(ctx, 'hoursPending');
  const hoursText =
    hoursPending !== null ? plural(locale, hoursPending, HOURS_PLURAL) : '';

  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `SLA модерации нарушен: «${title}»`,
      en: `Moderation SLA breached: "${title}"`,
      uz: `Moderatsiya SLA buzildi: "${title}"`,
    }),
    preheader: L(locale, {
      ru: 'Событие ждёт модерации дольше суток.',
      en: 'An event has been awaiting review for over a day.',
      uz: 'Tadbir bir kundan ortiq tekshiruvni kutmoqda.',
    }),
    heading: L(locale, {
      ru: 'Событие ждёт модерации слишком долго',
      en: 'An event has been waiting too long',
      uz: 'Tadbir tekshiruvni juda uzoq kutmoqda',
    }),
    intro: [
      hoursText
        ? L(locale, {
            ru: `Событие «${title}» находится в статусе PENDING_REVIEW уже ${hoursText} — дольше SLA в 24 часа.`,
            en: `"${title}" has been in PENDING_REVIEW for ${hoursText} — beyond the 24-hour SLA.`,
            uz: `"${title}" tadbiri PENDING_REVIEW holatida ${hoursText} turibdi — 24 soatlik SLA'dan uzoqroq.`,
          })
        : L(locale, {
            ru: `Событие «${title}» находится в статусе PENDING_REVIEW дольше SLA в 24 часа.`,
            en: `"${title}" has been in PENDING_REVIEW beyond the 24-hour SLA.`,
            uz: `"${title}" tadbiri PENDING_REVIEW holatida 24 soatlik SLA'dan uzoqroq turibdi.`,
          }),
    ],
    blocks: [
      {
        type: 'infobox',
        tone: 'warning',
        lines: [
          L(locale, {
            ru: 'Проверьте событие: организатор ждёт решения, публикация заблокирована.',
            en: 'Please review the event: the organizer is waiting and publishing is blocked.',
            uz: "Tadbirni ko'rib chiqing: tashkilotchi qaror kutmoqda, chop etish bloklangan.",
          }),
        ],
      },
      { type: 'keyvalue', rows: moderationRows(ctx, locale) },
    ],
    cta: moderationQueueCta(ctx, locale),
  };
}

/**
 * Приглашённый отказался вступить в команду. Организатору важно получить ответ,
 * а не тишину: без письма приглашение просто пропадало из ожидающих, и он слал
 * повторно вслепую. Комментарий, если приглашённый его оставил, показываем
 * дословно — это и есть главная ценность письма.
 */
function memberInviteDeclined(
  ctx: EmailContext,
  locale: Locale,
): EmailDocument {
  const person = str(ctx, 'personName');
  const org = str(ctx, 'organizationName');
  const roleName = str(ctx, 'roleName');
  const reason = str(ctx, 'reason');
  return {
    lang: locale,
    category: 'transactional',
    subject: L(locale, {
      ru: `${person} отказался от приглашения — EventFlow`,
      en: `${person} declined your invitation — EventFlow`,
      uz: `${person} taklifni rad etdi — EventFlow`,
    }),
    preheader: L(locale, {
      ru: 'Приглашение в команду отклонено.',
      en: 'The team invitation was declined.',
      uz: 'Jamoaga taklif rad etildi.',
    }),
    heading: L(locale, {
      ru: 'Приглашение отклонено',
      en: 'Invitation declined',
      uz: 'Taklif rad etildi',
    }),
    intro: [
      L(locale, {
        ru: `${person} отказался от приглашения в организацию «${org}» на роль «${roleName}».`,
        en: `${person} declined the invitation to join "${org}" as ${roleName}.`,
        uz: `${person} "${org}" tashkilotiga "${roleName}" roli bo'yicha taklifni rad etdi.`,
      }),
    ],
    blocks: [
      ...(reason
        ? [
            {
              type: 'infobox' as const,
              tone: 'neutral' as const,
              title: L(locale, {
                ru: 'Комментарий',
                en: 'Comment',
                uz: 'Izoh',
              }),
              lines: [reason],
            },
          ]
        : []),
      {
        type: 'infobox' as const,
        tone: 'neutral' as const,
        title: L(locale, {
          ru: 'Что дальше',
          en: 'What is next',
          uz: 'Keyingi qadam',
        }),
        lines: [
          L(locale, {
            ru: 'Место в тарифе освободилось: можно пригласить этого же человека позже или сразу другого.',
            en: 'The seat is free again: you can invite the same person later or someone else right away.',
            uz: "O'rin bo'shadi: xuddi shu odamni keyinroq yoki boshqasini hoziroq taklif qilishingiz mumkin.",
          }),
        ],
      },
    ],
    cta: {
      label: L(locale, {
        ru: 'Открыть сотрудников',
        en: 'Open staff',
        uz: 'Xodimlarni ochish',
      }),
      url: str(ctx, 'staffUrl'),
    },
  };
}

export const TEMPLATES: Record<string, EmailTemplateBuilder> = {
  'email-verification-code': (c, l) => codeEmail(c, l, 'verify'),
  'password-reset-code': (c, l) => codeEmail(c, l, 'reset'),
  'email-change-code': (c, l) => codeEmail(c, l, 'change'),
  'password-changed-notification': passwordChanged,
  'email-changed-notification': emailChanged,
  'member-invitation': memberInvitation,
  'member-invite-declined': memberInviteDeclined,
  'speaker-invitation': speakerInvitation,
  'event-invitation': eventInvitation,
  'registration-created': registrationCreated,
  'registration-approved': registrationApproved,
  'registration-rejected': registrationRejected,
  'registration-cancelled': registrationCancelled,
  'registration-revoked': registrationRevoked,
  'certificate-issued': certificateIssued,
  'event-notification': eventNotification,
  'contact-request': contactRequest,
  'plan-expiry-reminder': planExpiryReminder,
  'blog-post-approved': blogApproved,
  'blog-post-rejected': blogRejected,
  'event-approved': eventApproved,
  'event-rejected': eventRejected,
  'organization-approved': organizationApproved,
  'organization-rejected': organizationRejected,
  'task-assigned': taskAssigned,
  'task-deadline': taskDeadline,
  'task-mentioned': taskMentioned,
  // BL-26 — email-плечи цепочек REM/SUM/MOD (NOTIFICATIONS_CATALOG §5–7).
  'event-reminder': eventReminder,
  'event-summary-attendee': eventSummaryAttendee,
  'event-summary-organizer': eventSummaryOrganizer,
  'moderation-queue-new': moderationQueueNew,
  'moderation-queue-resubmit': moderationQueueResubmit,
  'moderation-sla-overdue': moderationSlaOverdue,
};
