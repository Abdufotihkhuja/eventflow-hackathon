import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateMemberDto } from './create-member.dto';
import { UpdateMemberDto } from './update-member.dto';

const baseCreateMember = {
  email: 'member@example.com',
  password: 'password123',
  firstName: 'Ivan',
  lastName: 'Ivanov',
  roleId: '550e8400-e29b-41d4-a716-446655440000',
  sendInvitation: false,
};

describe('member phone DTO normalization', () => {
  it('accepts an empty optional phone on create', () => {
    const dto = plainToInstance(CreateMemberDto, {
      ...baseCreateMember,
      phone: '',
    });
    const errors = validateSync(dto);

    expect(errors.find((error) => error.property === 'phone')).toBeUndefined();
    expect(dto.phone).toBeUndefined();
  });

  it('normalizes a formatted phone on create before validation', () => {
    const dto = plainToInstance(CreateMemberDto, {
      ...baseCreateMember,
      phone: '+998 90 123 45 67',
    });
    const errors = validateSync(dto);

    expect(errors.find((error) => error.property === 'phone')).toBeUndefined();
    expect(dto.phone).toBe('+998901234567');
  });

  it('accepts an empty optional phone on update', () => {
    const dto = plainToInstance(UpdateMemberDto, {
      firstName: 'Ivan',
      phone: '',
    });
    const errors = validateSync(dto);

    expect(errors.find((error) => error.property === 'phone')).toBeUndefined();
    expect(dto.phone).toBeUndefined();
  });
});
