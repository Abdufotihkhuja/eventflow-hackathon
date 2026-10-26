import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { QuestionType, QuestionCategory } from '@prisma/client';

/**
 * Валидатор для проверки соответствия category и type вопроса
 */
@ValidatorConstraint({ name: 'ValidateQuestionCategory', async: false })
export class ValidateQuestionCategoryConstraint implements ValidatorConstraintInterface {
  validate(category: QuestionCategory, args: ValidationArguments): boolean {
    const object = args.object as any;
    const type: QuestionType = object.type;
    const options: string[] = object.options || [];
    const informationalText: string | undefined = object.informationalText;

    // FILE_UPLOAD: тип-ответ файлом, не относится к скоринговым категориям.
    // Категория формально OPEN (свободный ответ), доп. проверки не нужны —
    // настройки валидируются через fileUploadConfig.
    if (type === QuestionType.FILE_UPLOAD) {
      return true;
    }

    // OPEN: должен быть TEXT или TEXTAREA
    if (category === QuestionCategory.OPEN) {
      if (type !== QuestionType.TEXT && type !== QuestionType.TEXTAREA) {
        return false;
      }
    }

    // CLOSED: «Да / Нет» — выбор одного из двух. Фронт хранит это как SELECT
    // (в enum нет RADIO), старые записи могут быть CHECKBOX. Принимаем оба
    // типа, но требуем ровно 2 варианта.
    if (category === QuestionCategory.CLOSED) {
      if (type !== QuestionType.SELECT && type !== QuestionType.CHECKBOX) {
        return false;
      }
      if (options.length !== 2) {
        return false;
      }
    }

    // ALTERNATIVE: должен быть SELECT или CHECKBOX с вариантами
    if (category === QuestionCategory.ALTERNATIVE) {
      if (type !== QuestionType.SELECT && type !== QuestionType.CHECKBOX) {
        return false;
      }
      if (!options || options.length === 0) {
        return false;
      }
    }

    // RHETORICAL: должен быть informationalText
    if (category === QuestionCategory.RHETORICAL) {
      if (!informationalText || informationalText.trim() === '') {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const object = args.object as any;
    const category: QuestionCategory = object.category;
    const type: QuestionType = object.type;

    if (category === QuestionCategory.OPEN) {
      return 'Для открытых вопросов (OPEN) тип должен быть TEXT или TEXTAREA';
    }

    if (category === QuestionCategory.CLOSED) {
      if (type !== QuestionType.SELECT && type !== QuestionType.CHECKBOX) {
        return 'Для закрытых вопросов (CLOSED) тип должен быть SELECT или CHECKBOX';
      }
      return 'Для закрытых вопросов (CLOSED) необходимо указать ровно 2 варианта ответа (например, "Да" и "Нет")';
    }

    if (category === QuestionCategory.ALTERNATIVE) {
      if (type !== QuestionType.SELECT && type !== QuestionType.CHECKBOX) {
        return 'Для альтернативных вопросов (ALTERNATIVE) тип должен быть SELECT или CHECKBOX';
      }
      return 'Для альтернативных вопросов (ALTERNATIVE) необходимо указать минимум 1 вариант ответа';
    }

    if (category === QuestionCategory.RHETORICAL) {
      return 'Для риторических вопросов (RHETORICAL) необходимо указать информационный текст (informationalText)';
    }

    return 'Несоответствие категории и типа вопроса';
  }
}

/**
 * Декоратор для валидации соответствия category и type вопроса
 */
export function ValidateQuestionCategory(
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: ValidateQuestionCategoryConstraint,
    });
  };
}
