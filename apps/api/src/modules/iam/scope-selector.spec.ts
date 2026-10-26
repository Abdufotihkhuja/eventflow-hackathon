import { parseScopeSelector } from './scope-selector';

describe('parseScopeSelector', () => {
  it('parses the exact personal selector', () => {
    expect(parseScopeSelector('personal')).toEqual({ kind: 'PERSONAL' });
  });

  it('parses a canonical lowercase v4 organization UUID', () => {
    expect(
      parseScopeSelector('organization:550e8400-e29b-41d4-a716-446655440000'),
    ).toEqual({
      kind: 'ORGANIZATION',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it.each([
    undefined,
    '',
    ' personal',
    'PERSONAL',
    'organization:550E8400-E29B-41D4-A716-446655440000',
    'organization:not-a-uuid',
    'personal, organization:550e8400-e29b-41d4-a716-446655440000',
    'x'.repeat(65),
  ])('rejects malformed or duplicate selector %#', (value) => {
    try {
      parseScopeSelector(value);
      throw new Error('expected selector rejection');
    } catch (error) {
      expect(
        (error as { getResponse: () => unknown }).getResponse(),
      ).toMatchObject({ code: 'SCOPE_INVALID' });
    }
  });
});
