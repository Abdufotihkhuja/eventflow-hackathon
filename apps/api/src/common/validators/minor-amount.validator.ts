import { registerDecorator, ValidationOptions } from 'class-validator';
import { parseMinorAmount } from '../money/money';

/**
 * Валидатор входящих денежных сумм (D-3, string-on-wire).
 *
 * Принимает СТРОКУ из цифр — неотрицательное целое в минорных единицах
 * (тийины/центы), без знака, дробной части, экспоненты и пробелов.
 * Number на входе отклоняется намеренно: float-путь для денег закрыт.
 */
export function IsMinorAmountString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isMinorAmountString',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} должен быть строкой из цифр — сумма в минорных единицах (тийины/центы)`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          try {
            parseMinorAmount(value);
            return true;
          } catch {
            return false;
          }
        },
      },
    });
  };
}
