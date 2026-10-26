import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EventFormat, EventType } from '@prisma/client';
import { CreateEventDto } from '../events/dto/create-event.dto';

describe('business translation DTO validation', () => {
  const baseEvent = {
    title: 'Event',
    description: [
      {
        id: 'block-1',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'Full description', styles: {} }],
        children: [],
      },
    ],
    type: EventType.FREE,
    format: EventFormat.OFFLINE,
    startDate: '2026-06-01T10:00:00Z',
    endDate: '2026-06-01T12:00:00Z',
  };

  it('rejects unsupported translation locale keys', async () => {
    const dto = plainToInstance(CreateEventDto, {
      ...baseEvent,
      translations: {
        title: { fr: 'Bonjour' },
      },
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'translations')).toBe(true);
  });

  it('rejects unsupported translation metadata statuses', async () => {
    const dto = plainToInstance(CreateEventDto, {
      ...baseEvent,
      translationMeta: {
        title: {
          ru: { status: 'reviewed' },
        },
      },
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'translationMeta')).toBe(
      true,
    );
  });
});
