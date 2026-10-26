import { ValidationArguments } from 'class-validator';
import { QuestionType, QuestionCategory } from '@prisma/client';
import { ValidateQuestionCategoryConstraint } from './validate-question-category.decorator';

const c = new ValidateQuestionCategoryConstraint();

function check(object: Record<string, unknown>): boolean {
  return c.validate(object.category as QuestionCategory, {
    object,
  } as unknown as ValidationArguments);
}

describe('ValidateQuestionCategoryConstraint', () => {
  describe('CLOSED (Yes / No)', () => {
    // Regression: the form sends CLOSED as SELECT (single-choice). The validator
    // used to demand CHECKBOX, so every Yes/No question failed to save.
    it('accepts SELECT with exactly 2 options', () => {
      expect(
        check({
          category: QuestionCategory.CLOSED,
          type: QuestionType.SELECT,
          options: ['Да', 'Нет'],
        }),
      ).toBe(true);
    });

    it('still accepts legacy CHECKBOX with 2 options', () => {
      expect(
        check({
          category: QuestionCategory.CLOSED,
          type: QuestionType.CHECKBOX,
          options: ['Yes', 'No'],
        }),
      ).toBe(true);
    });

    it('rejects a non-choice type (TEXT)', () => {
      expect(
        check({
          category: QuestionCategory.CLOSED,
          type: QuestionType.TEXT,
          options: ['Yes', 'No'],
        }),
      ).toBe(false);
    });

    it('rejects when there are not exactly 2 options', () => {
      expect(
        check({
          category: QuestionCategory.CLOSED,
          type: QuestionType.SELECT,
          options: ['Yes'],
        }),
      ).toBe(false);
    });
  });

  describe('other categories (sanity)', () => {
    it('OPEN requires TEXT/TEXTAREA', () => {
      expect(
        check({ category: QuestionCategory.OPEN, type: QuestionType.TEXT }),
      ).toBe(true);
      expect(
        check({ category: QuestionCategory.OPEN, type: QuestionType.SELECT }),
      ).toBe(false);
    });

    it('ALTERNATIVE requires SELECT/CHECKBOX with options', () => {
      expect(
        check({
          category: QuestionCategory.ALTERNATIVE,
          type: QuestionType.SELECT,
          options: ['A', 'B'],
        }),
      ).toBe(true);
    });

    it('FILE_UPLOAD is always valid regardless of category', () => {
      expect(
        check({
          category: QuestionCategory.OPEN,
          type: QuestionType.FILE_UPLOAD,
        }),
      ).toBe(true);
    });
  });
});
