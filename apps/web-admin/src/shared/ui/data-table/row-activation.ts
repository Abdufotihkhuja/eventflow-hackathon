/**
 * Решает, должен ли клик или Enter по строке DataTable открыть строку
 * (onRowClick). Вызывается в обработчиках `<tr>` с event.currentTarget и
 * event.target.
 *
 * React всплывает события по дереву компонентов, а не по DOM, поэтому клик по
 * пункту меню из портала (DropdownMenu, диалог) доходит до `<tr>`. Без этой
 * проверки «Архивировать» в меню строки уводил на карточку, а диалог
 * архивации пропадал вместе со списком.
 */

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, [role="menuitem"], [role="option"], [role="dialog"], [role="alertdialog"]'

type RowElement = { contains: (node: Node | null) => boolean }

export function isRowActivation(row: RowElement, target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return false
  const element = target as Element
  // Цель вне строки в DOM: событие пришло из портала.
  if (!row.contains(element)) return false
  // Кнопки, ссылки и поля внутри строки работают сами по себе.
  return element.closest(INTERACTIVE_SELECTOR) === null
}
