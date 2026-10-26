import { renderEmail, isKnownTemplate } from './render';
import { TEMPLATES } from './templates';
import type { EmailContext } from './types';

const FIXTURES: Record<string, EmailContext> = {
  'plan-expiry-reminder': {
    planKey: 'PRO',
    expiresAtFormatted: '2026-10-02',
    daysLeft: '3',
    billingUrl: 'https://app.eventflow.uz/settings/billing',
  },
  'email-verification-code': { firstName: 'Ali', code: '482913' },
  'password-reset-code': { firstName: 'Ali', code: '739104' },
  'email-change-code': { firstName: 'Ali', code: '550021' },
  'password-changed-notification': {
    firstName: 'Ali',
    email: 'ali@example.com',
    changeDate: '17 May 2026, 14:30',
  },
  'email-changed-notification': {
    firstName: 'Ali',
    oldEmail: 'old@example.com',
    newEmail: 'new@example.com',
    changeDate: '17 May 2026, 14:30',
  },
  'member-invitation': {
    firstName: 'Ali',
    lastName: 'Valiyev',
    organizationName: 'Acme Events',
    email: 'ali@example.com',
    activationUrl: 'https://app.eventflow.uz/invite/activate?token=abc123',
  },
  'member-invite-declined': {
    personName: 'Ali Valiyev',
    organizationName: 'Acme Events',
    roleName: 'Менеджер событий',
    reason: 'Сейчас нет времени, вернусь к этому осенью',
    staffUrl: 'https://app.eventflow.uz/users',
  },
  'speaker-invitation': {
    name: 'Ali Valiyev',
    eventTitle: 'Tech Summit 2026',
    organizationName: 'Acme Events',
    acceptUrl: 'https://app.eventflow.uz/speaker-invitation/accept?token=t1',
    rejectUrl: 'https://app.eventflow.uz/speaker-invitation/reject?token=t1',
    userExists: true,
    expiresIn: '48 часов',
  },
  'event-invitation': {
    email: 'ali@example.com',
    eventTitle: 'Tech Summit 2026',
    organizationName: 'Acme Events',
    inviteLink: 'https://eventflow.uz/events/tech-summit?invite=XYZ',
    inviteCode: 'XYZ789',
  },
  'registration-created': {
    userName: 'Ali',
    eventTitle: 'Tech Summit 2026',
    organizationName: 'Acme Events',
    ticketNumber: 'TS-000142',
    ticketUrl: 'https://eventflow.uz/tickets/TS-000142',
    isPending: true,
  },
  'registration-approved': {
    userName: 'Ali',
    eventTitle: 'Tech Summit 2026',
    organizationName: 'Acme Events',
    ticketNumber: 'TS-000142',
    ticketUrl: 'https://eventflow.uz/tickets/TS-000142',
  },
  'registration-rejected': {
    userName: 'Ali',
    eventTitle: 'Tech Summit 2026',
    organizationName: 'Acme Events',
    reason: 'Event is at full capacity.',
  },
  'registration-cancelled': {
    userName: 'Ali',
    eventTitle: 'Tech Summit 2026',
    organizationName: 'Acme Events',
    reason: 'Schedule conflict.',
  },
  'registration-revoked': {
    userName: 'Ali',
    eventTitle: 'Tech Summit 2026',
    organizationName: 'Acme Events',
    reason: 'Needs re-review.',
  },
  'certificate-issued': {
    recipientName: 'Ali',
    eventName: 'Tech Summit 2026',
    eventDate: '2026-05-22',
    certificatesUrl: 'https://eventflow.uz/profile/certificates',
    verifyUrl: 'https://eventflow.uz/certificates/verify?code=abc123',
  },
  'event-notification': {
    userName: 'Ali',
    eventTitle: 'Tech Summit 2026',
    organizationName: 'Acme Events',
    message: 'Doors open at 9:00.\nPlease bring your ticket.',
  },
  'contact-request': {
    userName: 'Ali',
    phone: '+998901234567',
    message: 'Interested in sponsoring.',
    dashboardUrl: 'https://app.eventflow.uz/contacts',
    isPlaceRental: false,
  },
  'blog-post-approved': {
    postTitle: 'How we built EventFlow',
    dashboardUrl: 'https://app.eventflow.uz/dashboard/blog/1',
  },
  'blog-post-rejected': {
    postTitle: 'How we built EventFlow',
    reason: 'Needs more detail.',
    dashboardUrl: 'https://app.eventflow.uz/dashboard/blog/1/edit',
  },
  'organization-approved': {
    organizationName: 'Acme Events',
    dashboardUrl: 'https://app.eventflow.uz/dashboard',
  },
  'organization-rejected': {
    organizationName: 'Acme Events',
    reason: 'Company details do not match the registry.',
    dashboardUrl: 'https://app.eventflow.uz/settings',
  },
  'event-approved': {
    eventTitle: 'Tech Summit 2026',
    startDate: '22 мая 2026, 10:00',
    venue: 'IT Park Tashkent',
    publicUrl: 'https://eventflow.uz/events/tech-summit-2026',
    dashboardUrl: 'https://app.eventflow.uz/my-events/1',
  },
  'event-rejected': {
    eventTitle: 'Tech Summit 2026',
    reason: 'Cover image is unreadable.',
    startDate: '22 мая 2026, 10:00',
    venue: 'IT Park Tashkent',
    dashboardUrl: 'https://app.eventflow.uz/my-events/1/edit',
  },
  'task-assigned': {
    taskTitle: 'Prepare stage',
    taskUrl: 'https://app.eventflow.uz/tasks/1',
    assignedByName: 'Dilshod',
    assigneeName: 'Ali',
    boardName: 'Logistics',
    columnName: 'To do',
    dueDate: '20 May 2026',
    priority: 'High',
    priorityClass: 'high',
  },
  'task-deadline': {
    taskTitle: 'Prepare stage',
    taskUrl: 'https://app.eventflow.uz/tasks/1',
    assigneeName: 'Ali',
    boardName: 'Logistics',
    columnName: 'To do',
    dueDate: '20 May 2026',
    daysLeft: '2',
    isOverdue: false,
  },
  'task-mentioned': {
    taskTitle: 'Prepare stage',
    taskUrl: 'https://app.eventflow.uz/tasks/1',
    authorName: 'Dilshod',
    mentionedName: 'Ali',
    boardName: 'Logistics',
    commentText: 'Can you take this @Ali?',
  },
  'event-reminder': {
    userName: 'Ali',
    eventTitle: 'Tech Summit 2026',
    startsAt: '2026-05-22T05:00:00.000Z',
    timezone: 'Asia/Tashkent',
    venue: 'IT Park Tashkent',
    address: 'Muhammad al-Xorazmiy 17, Tashkent',
    ticketNumber: 'TS-000142',
    ticketUrl: 'https://eventflow.uz/tickets/TS-000142',
  },
  'event-summary-attendee': {
    userName: 'Ali',
    eventTitle: 'Tech Summit 2026',
    organizationName: 'Acme Events',
    certificateUrl: 'https://eventflow.uz/profile/certificates',
    materialsUrl: 'https://eventflow.uz/events/tech-summit-2026#materials',
    nextEventTitle: 'Design Meetup',
    nextEventUrl: 'https://eventflow.uz/events/design-meetup',
    eventUrl: 'https://eventflow.uz/events/tech-summit-2026',
  },
  'event-summary-organizer': {
    eventTitle: 'Tech Summit 2026',
    checkedInCount: 45,
    approvedCount: 60,
    attendancePercent: 75,
    viewsCount: 1200,
    conversionPercent: 5,
    revenueFormatted: '1 250 000',
    commissionFormatted: '62 500',
    analyticsUrl: 'https://app.eventflow.uz/analytics/1',
    createEventUrl: 'https://app.eventflow.uz/my-events/create',
  },
  'moderation-queue-new': {
    eventTitle: 'Tech Summit 2026',
    organizationName: 'Acme Events',
    submittedAt: '2026-05-20T09:00:00.000Z',
    pendingCount: 3,
    queueUrl: 'https://admin.eventflow.uz/events?status=PENDING_REVIEW',
  },
  'moderation-queue-resubmit': {
    eventTitle: 'Tech Summit 2026',
    organizationName: 'Acme Events',
    submittedAt: '2026-05-21T09:00:00.000Z',
    previousReason: 'Cover image is unreadable.',
    queueUrl: 'https://admin.eventflow.uz/events?status=PENDING_REVIEW',
  },
  'moderation-sla-overdue': {
    eventTitle: 'Tech Summit 2026',
    organizationName: 'Acme Events',
    submittedAt: '2026-05-20T09:00:00.000Z',
    hoursPending: 26,
    queueUrl: 'https://admin.eventflow.uz/events?status=PENDING_REVIEW',
  },
};

const TEMPLATE_NAMES = Object.keys(TEMPLATES);

function collectHrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

describe('email rendering — coverage', () => {
  it('has a fixture for every registered template', () => {
    for (const name of TEMPLATE_NAMES) {
      expect(FIXTURES[name]).toBeDefined();
    }
  });
});

describe.each(TEMPLATE_NAMES)('email template "%s"', (name) => {
  const rendered = renderEmail(name, FIXTURES[name], undefined, 'Fallback subject');

  it('produces all required parts', () => {
    expect(rendered.subject.trim().length).toBeGreaterThan(0);
    expect(rendered.preheader.trim().length).toBeGreaterThan(0);
    expect(rendered.html.length).toBeGreaterThan(0);
    expect(rendered.text.trim().length).toBeGreaterThan(0);
    expect(['transactional', 'notification']).toContain(rendered.category);
  });

  it('is valid, script-free HTML with a preheader', () => {
    expect(rendered.html).toMatch(/<!DOCTYPE html/i);
    expect(rendered.html.toLowerCase()).not.toContain('<script');
    expect(rendered.html.toLowerCase()).not.toContain('javascript:');
    expect(rendered.html.toLowerCase()).not.toContain('onclick=');
    // hidden preheader present (HTML-escaped form, as rendered)
    const escapedPreheader = rendered.preheader
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    expect(rendered.html).toContain(escapedPreheader);
  });

  it('leaves no unresolved tokens or null/undefined leakage', () => {
    expect(rendered.html).not.toContain('{{');
    expect(rendered.html).not.toMatch(/>\s*(undefined|null)\s*</);
    expect(rendered.text).not.toMatch(/\b(undefined|null)\b/);
  });

  it('uses only absolute links', () => {
    for (const href of collectHrefs(rendered.html)) {
      expect(href).toMatch(/^(https?:|mailto:)/);
    }
  });

  it('renders the brand logo with an absolute src and alt fallback', () => {
    const img = rendered.html.match(/<img[^>]+>/);
    expect(img).not.toBeNull();
    const tag = img![0];
    const src = tag.match(/src="([^"]+)"/)?.[1] ?? '';
    const alt = tag.match(/alt="([^"]*)"/)?.[1] ?? '';
    expect(src).toMatch(/^https:\/\//);
    expect(src).not.toMatch(/\.svg(\?|$)/i); // SVG not email-safe
    expect(alt.trim().length).toBeGreaterThan(0);
  });

  it('keeps a healthy plain-text / HTML balance', () => {
    // plain text must carry real content, not be a stub
    expect(rendered.text.length).toBeGreaterThan(120);
    const ratio = rendered.text.length / rendered.html.length;
    expect(ratio).toBeGreaterThan(0.03);
  });

  it('mirrors the CTA URL into the plain-text part', () => {
    const ctaHref = collectHrefs(rendered.html).find(
      (h) =>
        !h.startsWith('mailto:') &&
        h !== 'https://eventflow.uz' &&
        !h.includes('eventflow.uz"'),
    );
    if (ctaHref && FIXTURES[name] && /Url|Link|url/.test(JSON.stringify(FIXTURES[name]))) {
      // at least one action URL from the fixture appears in text
      const urls = Object.values(FIXTURES[name]).filter(
        (v) => typeof v === 'string' && /^https?:/.test(v),
      ) as string[];
      const anyInText = urls.some((u) => rendered.text.includes(u));
      expect(anyInText).toBe(true);
    }
  });
});

describe('email rendering — key data & i18n', () => {
  it('carries the verification code in HTML and text', () => {
    const r = renderEmail('email-verification-code', {
      code: '482913',
      firstName: 'Ali',
    });
    expect(r.html).toContain('482913');
    expect(r.text).toContain('482913');
  });

  it('carries the ticket number in HTML and text', () => {
    const r = renderEmail('registration-approved', FIXTURES['registration-approved']);
    expect(r.html).toContain('TS-000142');
    expect(r.text).toContain('TS-000142');
  });

  it('escapes user-provided broadcast content (no raw HTML injection)', () => {
    const r = renderEmail('event-notification', {
      userName: 'Ali',
      eventTitle: 'Demo',
      organizationName: 'Acme',
      message: '<img src=x onerror=alert(1)>',
    });
    expect(r.html).not.toContain('<img src=x');
    expect(r.html).toContain('&lt;img');
  });

  it('localizes subject by context.locale', () => {
    const ru = renderEmail('email-verification-code', { code: '1', locale: 'ru' });
    const en = renderEmail('email-verification-code', { code: '1', locale: 'en' });
    const uz = renderEmail('email-verification-code', { code: '1', locale: 'uz' });
    expect(ru.subject).not.toEqual(en.subject);
    expect(en.subject).not.toEqual(uz.subject);
  });

  it('defaults to Russian when locale is absent (back-compat)', () => {
    const r = renderEmail('password-reset-code', { code: '1' });
    expect(r.subject).toContain('сброс'.slice(0, 4));
  });

  it('uses the enqueued subject for organizer broadcasts', () => {
    const r = renderEmail(
      'event-notification',
      { userName: 'Ali', eventTitle: 'E', organizationName: 'O', message: 'Hi' },
      undefined,
      'Custom organizer subject',
    );
    expect(r.subject).toBe('Custom organizer subject');
  });

  it('classifies operational/security mail as transactional (no unsubscribe)', () => {
    for (const name of [
      'email-verification-code',
      'password-reset-code',
      'email-change-code',
      'password-changed-notification',
      'email-changed-notification',
      'member-invitation',
      'member-invite-declined',
      'speaker-invitation',
      'event-invitation',
      'registration-created',
      'registration-approved',
      'registration-rejected',
      'registration-cancelled',
      'registration-revoked',
      'contact-request',
      'blog-post-approved',
      'blog-post-rejected',
      'event-approved',
      'event-rejected',
      'organization-approved',
      'organization-rejected',
      // BL-26: REM-01 email-fallback — transactional по решению OQ-17;
      // модераторские письма — операторский ящик, отписка недопустима.
      'event-reminder',
      'moderation-queue-new',
      'moderation-queue-resubmit',
      'moderation-sla-overdue',
    ]) {
      expect(renderEmail(name, FIXTURES[name]).category).toBe('transactional');
    }
  });

  it('classifies broadcast/collaboration mail as notification', () => {
    for (const name of [
      'event-notification',
      'task-assigned',
      'task-deadline',
      'task-mentioned',
      // BL-26: сводки SUM-01/02 — informational, List-Unsubscribe действует.
      'event-summary-attendee',
      'event-summary-organizer',
    ]) {
      expect(renderEmail(name, FIXTURES[name]).category).toBe('notification');
    }
  });

  it('throws on unknown templates', () => {
    expect(isKnownTemplate('does-not-exist')).toBe(false);
    expect(() => renderEmail('does-not-exist', {})).toThrow();
  });
});

describe('BL-26 templates — REM/SUM/MOD email-плечи', () => {
  const BL26_TEMPLATES = [
    'event-reminder',
    'event-summary-attendee',
    'event-summary-organizer',
    'moderation-queue-new',
    'moderation-queue-resubmit',
    'moderation-sla-overdue',
  ] as const;

  it.each(BL26_TEMPLATES.map((n) => [n]))(
    '%s рендерится на трёх локалях с разными subject',
    (name) => {
      const subjects = (['ru', 'en', 'uz'] as const).map(
        (locale) =>
          renderEmail(name, { ...FIXTURES[name], locale }).subject,
      );
      expect(new Set(subjects).size).toBe(3);
      for (const subject of subjects) {
        expect(subject.trim().length).toBeGreaterThan(0);
      }
    },
  );

  it.each(BL26_TEMPLATES.map((n) => [n]))(
    '%s экранирует пользовательские данные (нет raw-HTML инъекции)',
    (name) => {
      const r = renderEmail(name, {
        ...FIXTURES[name],
        eventTitle: '<img src=x onerror=alert(1)>',
        organizationName: '<script>alert(2)</script>',
        previousReason: '<b>bold</b>',
      });
      expect(r.html).not.toContain('<img src=x');
      expect(r.html.toLowerCase()).not.toContain('<script');
      expect(r.html).toContain('&lt;img');
    },
  );

  it('event-reminder показывает время в TZ события (Event.timezone)', () => {
    // 2026-05-22T05:00Z = 10:00 в Asia/Tashkent (UTC+5).
    const r = renderEmail('event-reminder', {
      ...FIXTURES['event-reminder'],
      locale: 'ru',
    });
    expect(r.text).toContain('10:00');
    expect(r.text).toContain('2026');
  });

  it('event-reminder: невалидная таймзона падает обратно на Asia/Tashkent', () => {
    const r = renderEmail('event-reminder', {
      ...FIXTURES['event-reminder'],
      timezone: 'Not/AZone',
      locale: 'ru',
    });
    expect(r.text).toContain('10:00');
  });

  it('event-summary-organizer: русская плюрализация счётчика участников', () => {
    const one = renderEmail('event-summary-organizer', {
      ...FIXTURES['event-summary-organizer'],
      checkedInCount: 21,
      locale: 'ru',
    });
    expect(one.text).toContain('21 участник');
    const few = renderEmail('event-summary-organizer', {
      ...FIXTURES['event-summary-organizer'],
      checkedInCount: 3,
      locale: 'ru',
    });
    expect(few.text).toContain('3 участника');
    const many = renderEmail('event-summary-organizer', {
      ...FIXTURES['event-summary-organizer'],
      checkedInCount: 45,
      locale: 'ru',
    });
    expect(many.text).toContain('45 участников');
  });

  it('event-summary-organizer несёт полную таблицу: выручка и комиссия в UZS', () => {
    const r = renderEmail(
      'event-summary-organizer',
      FIXTURES['event-summary-organizer'],
    );
    expect(r.text).toContain('1 250 000 UZS');
    expect(r.text).toContain('62 500 UZS');
    expect(r.text).toContain('75%');
  });

  it('event-summary-attendee без сертификата ведёт на страницу события', () => {
    const withCert = renderEmail(
      'event-summary-attendee',
      FIXTURES['event-summary-attendee'],
    );
    expect(withCert.html).toContain('https://eventflow.uz/profile/certificates');
    const withoutCert = renderEmail('event-summary-attendee', {
      ...FIXTURES['event-summary-attendee'],
      certificateUrl: undefined,
    });
    expect(withoutCert.html).toContain(
      'https://eventflow.uz/events/tech-summit-2026',
    );
  });

  it('moderation-queue-resubmit несёт прежнюю причину отклонения (MOD-06)', () => {
    const r = renderEmail(
      'moderation-queue-resubmit',
      FIXTURES['moderation-queue-resubmit'],
    );
    expect(r.text).toContain('Cover image is unreadable.');
  });

  it('moderation-sla-overdue: ru-плюрализация часов ожидания', () => {
    const r = renderEmail('moderation-sla-overdue', {
      ...FIXTURES['moderation-sla-overdue'],
      hoursPending: 26,
      locale: 'ru',
    });
    expect(r.text).toContain('26 часов');
    const r2 = renderEmail('moderation-sla-overdue', {
      ...FIXTURES['moderation-sla-overdue'],
      hoursPending: 31,
      locale: 'ru',
    });
    expect(r2.text).toContain('31 час');
  });
});
