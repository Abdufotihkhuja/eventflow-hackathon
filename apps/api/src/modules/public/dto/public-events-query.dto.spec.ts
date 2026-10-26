import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { PublicEventsQueryDto } from './public-events-query.dto';

function validateQuery(query: Record<string, unknown>) {
  const dto = plainToInstance(PublicEventsQueryDto, query, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  return { dto, errors };
}

describe('PublicEventsQueryDto', () => {
  it('accepts public event list query with locale', () => {
    const { dto, errors } = validateQuery({ limit: '50', locale: 'en' });

    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(50);
    expect(dto.locale).toBe('en');
  });

  it('accepts featured public event query with locale', () => {
    const { dto, errors } = validateQuery({
      limit: '5',
      featured: 'true',
      category: 'hackathon',
      locale: 'en',
    });

    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(5);
    expect(dto.featured).toBe(true);
    expect(dto.category).toBe('hackathon');
    expect(dto.locale).toBe('en');
  });

  it('normalizes regional locale values to supported app locale', () => {
    const { dto, errors } = validateQuery({ locale: 'EN-US' });

    expect(errors).toHaveLength(0);
    expect(dto.locale).toBe('en');
  });

  it('accepts comma-separated cities list for landing-page OR filter', () => {
    const { dto, errors } = validateQuery({
      cities: 'tashkent,Ташкент,Toshkent',
      locale: 'ru',
    });

    expect(errors).toHaveLength(0);
    expect(dto.cities).toBe('tashkent,Ташкент,Toshkent');
  });
});
