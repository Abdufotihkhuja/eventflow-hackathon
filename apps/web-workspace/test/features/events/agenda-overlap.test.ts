import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  groupByOverlap,
  startMinutesOf,
  endMinutesOf,
  formatMinutes,
  normalizeLocation,
} from '../../../src/features/events/lib/agenda-overlap.ts'

type Item = {
  id: string
  startTime: string
  duration: number
  sortOrder: number
}

function item(id: string, startTime: string, duration: number, sortOrder = 0): Item {
  return { id, startTime, duration, sortOrder }
}

describe('groupByOverlap', () => {
  it('returns empty list for no items', () => {
    assert.deepEqual(groupByOverlap([] as never), [])
  })

  it('keeps a single item in its own slot', () => {
    const result = groupByOverlap([item('a', '10:00', 60)] as never)
    assert.equal(result.length, 1)
    assert.equal(result[0]!.items.length, 1)
    assert.equal(result[0]!.startMin, 600)
    assert.equal(result[0]!.endMin, 660)
  })

  it('groups two overlapping items into one slot', () => {
    const result = groupByOverlap([
      item('a', '10:00', 60),
      item('b', '10:15', 30),
    ] as never)
    assert.equal(result.length, 1)
    assert.equal(result[0]!.items.length, 2)
    assert.equal(result[0]!.endMin, 660)
  })

  it('groups three overlapping items even when later ones extend the envelope', () => {
    const result = groupByOverlap([
      item('a', '10:00', 30),
      item('b', '10:15', 60),
      item('c', '10:45', 60),
    ] as never)
    assert.equal(result.length, 1)
    assert.equal(result[0]!.items.length, 3)
    assert.equal(result[0]!.endMin, 705)
  })

  it('keeps adjacent items (10:00–11:00 + 11:00–12:00) in separate slots', () => {
    const result = groupByOverlap([
      item('a', '10:00', 60),
      item('b', '11:00', 60),
    ] as never)
    assert.equal(result.length, 2)
    assert.equal(result[0]!.items.length, 1)
    assert.equal(result[1]!.items.length, 1)
  })

  it('preserves sortOrder by accepting the input order', () => {
    const result = groupByOverlap([
      item('a', '10:00', 60, 0),
      item('b', '10:00', 60, 1),
      item('c', '10:00', 60, 2),
    ] as never)
    assert.equal(result.length, 1)
    assert.deepEqual(
      result[0]!.items.map((i) => i.id),
      ['a', 'b', 'c'],
    )
  })

  it('parses ISO datetime startTime values', () => {
    const result = groupByOverlap([
      {
        id: 'a',
        startTime: '1970-01-01T09:00:00.000Z',
        duration: 60,
        sortOrder: 0,
      } as never,
    ])
    assert.equal(result[0]!.startMin, 540)
  })
})

describe('time helpers', () => {
  it('startMinutesOf reads HH:MM and ISO', () => {
    assert.equal(startMinutesOf({ startTime: '09:30' } as never), 570)
    assert.equal(
      startMinutesOf({ startTime: '1970-01-01T07:15:00.000Z' } as never),
      435,
    )
  })

  it('endMinutesOf adds duration', () => {
    assert.equal(
      endMinutesOf({ startTime: '09:00', duration: 75 } as never),
      615,
    )
  })

  it('formatMinutes pads zeroes', () => {
    assert.equal(formatMinutes(0), '00:00')
    assert.equal(formatMinutes(75), '01:15')
    assert.equal(formatMinutes(60 * 24), '24:00')
  })

  it('normalizeLocation trims and lowercases', () => {
    assert.equal(normalizeLocation('  Hall A '), 'hall a')
    assert.equal(normalizeLocation(null), '')
    assert.equal(normalizeLocation(undefined), '')
  })
})
