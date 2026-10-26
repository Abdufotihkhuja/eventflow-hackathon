import assert from 'node:assert/strict'
import test from 'node:test'

import { isEmail, parseEmailList } from '../../../src/features/events/lib/parse-email-list'

void test('splits a pasted list on commas, semicolons and whitespace', () => {
  assert.deepEqual(parseEmailList('a@x.uz, b@x.uz;c@x.uz\n d@x.uz\te@x.uz'), [
    'a@x.uz',
    'b@x.uz',
    'c@x.uz',
    'd@x.uz',
    'e@x.uz',
  ])
})

void test('normalizes case and drops duplicates, including already added chips', () => {
  assert.deepEqual(parseEmailList(' Guest@Lex.uz guest@lex.uz NEW@lex.uz', ['new@lex.uz']), [
    'guest@lex.uz',
  ])
})

void test('keeps invalid entries so the organizer can fix them', () => {
  const chips = parseEmailList('ok@lex.uz jamshid@advokat')
  assert.deepEqual(chips, ['ok@lex.uz', 'jamshid@advokat'])
  assert.deepEqual(chips.map(isEmail), [true, false])
})

void test('ignores empty input', () => {
  assert.deepEqual(parseEmailList('  , ;  '), [])
})
