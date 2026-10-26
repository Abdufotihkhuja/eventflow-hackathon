import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { RegistrationMode, TestEvaluationType } from '@prisma/client';

/**
 * Валидатор для проверки настроек теста
 */
@ValidatorConstraint({ name: 'ValidateTestSettings', async: false })
export class ValidateTestSettingsConstraint implements ValidatorConstraintInterface {
  validate(
    registrationMode: RegistrationMode,
    args: ValidationArguments,
  ): boolean {
    const object = args.object as any;
    const testEvaluationType: TestEvaluationType | undefined =
      object.testEvaluationType;
    const minTestScore: number | undefined = object.minTestScore;

    // Если режим TEST, обязательны testEvaluationType и minTestScore
    if (registrationMode === RegistrationMode.TEST) {
      if (!testEvaluationType) {
        return false;
      }
      if (minTestScore === undefined || minTestScore === null) {
        return false;
      }
      if (minTestScore < 0) {
        return false;
      }
    }

    // Если режим QUESTIONS, testEvaluationType и minTestScore не должны быть указаны
    if (registrationMode === RegistrationMode.QUESTIONS) {
      if (testEvaluationType !== undefined) {
        return false;
      }
      if (minTestScore !== undefined) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const object = args.object as any;
    const registrationMode: RegistrationMode = object.registrationMode;
    const testEvaluationType: TestEvaluationType | undefined =
      object.testEvaluationType;
    const minTestScore: number | undefined = object.minTestScore;

    if (registrationMode === RegistrationMode.TEST) {
      if (!testEvaluationType) {
        return 'Для режима TEST обязательно указать тип оценки (testEvaluationType): AUTO_REJECT или EVALUATION';
      }
      if (minTestScore === undefined || minTestScore === null) {
        return 'Для режима TEST обязательно указать минимальный балл для прохождения (minTestScore)';
      }
      if (minTestScore < 0) {
        return 'Минимальный балл для прохождения теста (minTestScore) не может быть отрицательным';
      }
    }

    if (registrationMode === RegistrationMode.QUESTIONS) {
      return 'Для режима QUESTIONS не нужно указывать настройки теста (testEvaluationType, minTestScore)';
    }

    return 'Некорректные настройки теста';
  }
}

/**
 * Декоратор для валидации настроек теста
 */
export function ValidateTestSettings(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: ValidateTestSettingsConstraint,
    });
  };
}
