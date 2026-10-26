/**
 * Карта транслитерации кириллицы в латиницу
 */
const translitMap: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  // Узбекские символы
  ў: 'o',
  қ: 'q',
  ғ: 'g',
  ҳ: 'h',
};

/**
 * Генерирует URL-friendly slug из текста
 * Поддерживает транслитерацию кириллицы и узбекских символов
 *
 * @param text - Исходный текст
 * @returns slug в формате kebab-case
 *
 * @example
 * generateSlug('Конференция') // => 'konferentsiya'
 * generateSlug('Для начинающих') // => 'dlya-nachinayuschih'
 * generateSlug('IT & Technology') // => 'it-technology'
 */
export function generateSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // Транслитерация кириллицы
      .split('')
      .map((char) => translitMap[char] || char)
      .join('')
      // Удаление всех символов кроме букв, цифр и дефисов
      .replace(/[^a-z0-9]+/g, '-')
      // Удаление дефисов в начале и конце
      .replace(/^-+|-+$/g, '')
      // Замена множественных дефисов на один
      .replace(/-{2,}/g, '-')
  );
}
