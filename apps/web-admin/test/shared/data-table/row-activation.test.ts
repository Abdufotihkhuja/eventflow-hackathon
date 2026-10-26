import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { isRowActivation } from '../../../src/shared/ui/data-table/row-activation.ts'

// Минимальные заглушки DOM: node:test работает без браузера.
type FakeElement = { closest: (selector: string) => FakeElement | null }

function element(interactiveAncestor: boolean): FakeElement {
  const self: FakeElement = {
    closest: () => (interactiveAncestor ? self : null),
  }
  return self
}

function row(children: FakeElement[]) {
  return { contains: (node: unknown) => children.includes(node as FakeElement) }
}

describe('isRowActivation', () => {
  it('activates on a plain cell click inside the row', () => {
    const cell = element(false)
    assert.equal(isRowActivation(row([cell]), cell as unknown as EventTarget), true)
  })

  // Регрессия: пункт «Архивировать» из портала DropdownMenu всплывал до <tr>
  // и уводил на карточку организации вместо диалога архивации.
  it('ignores events from portaled content outside the row', () => {
    const menuItem = element(true)
    assert.equal(isRowActivation(row([]), menuItem as unknown as EventTarget), false)
  })

  it('ignores clicks on interactive elements inside the row', () => {
    const menuTrigger = element(true)
    assert.equal(isRowActivation(row([menuTrigger]), menuTrigger as unknown as EventTarget), false)
  })

  it('ignores targets that are not elements', () => {
    assert.equal(isRowActivation(row([]), null), false)
    assert.equal(isRowActivation(row([]), {} as EventTarget), false)
  })
})
