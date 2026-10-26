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

describe('groupByOverlap (admin mirror)', () => {
  it('returns empty list for no items', () => {
    assert.deepEqual(groupByOverlap([] as never), [])
  })

  it('keeps a single item in its own slot', () => {
    const result = groupByOverlap([item('a', '10:00', 60)] as never)
    assert.equal(result.length, 1)
    assert.equal(result[0]!.items.length, 1)
  })

  it('groups two overlapping items into one slot', () => {
    const result = groupByOverlap([
      item('a', '10:00', 60),
      item('b', '10:15', 30),
    ] as never)
    assert.equal(result.length, 1)
    assert.equal(result[0]!.items.length, 2)
  })

  it('keeps adjacent items separate', () => {
    const result = groupByOverlap([
      item('a', '10:00', 60),
      item('b', '11:00', 60),
    ] as never)
    assert.equal(result.length, 2)
  })

  it('parses ISO startTime', () => {
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

describe('time helpers (admin mirror)', () => {
  it('startMinutesOf parses HH:MM', () => {
    assert.equal(startMinutesOf({ startTime: '09:30' } as never), 570)
  })

  it('endMinutesOf adds duration', () => {
    assert.equal(
      endMinutesOf({ startTime: '09:00', duration: 75 } as never),
      615,
    )
  })

  it('formatMinutes pads zeroes', () => {
    assert.equal(formatMinutes(75), '01:15')
  })

  it('normalizeLocation trims and lowercases', () => {
    assert.equal(normalizeLocation('  Hall A '), 'hall a')
  })
})
