import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  applyRichTextSegments,
  computeRichTextStructureHash,
  computeRichTextVisibleTextHash,
  extractRichTextSegments,
  isBlockNoteDocument,
  validateRichTextStructurePreserved,
  type BlockNoteDocument,
  type RichTextSegment,
} from '../../../src/shared/lib/rich-text-translation.ts'

function paragraph(id: string, text: string): BlockNoteDocument[number] {
  return {
    id,
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text, styles: {} }],
    children: [],
  }
}

function translated(segments: RichTextSegment[], values: string[]): RichTextSegment[] {
  return segments.map((segment, index) => ({
    ...segment,
    text: values[index] ?? segment.text,
  }))
}

describe('rich text translation traversal utilities', () => {
  it('accepts an empty top-level BlockNote block array', () => {
    assert.equal(isBlockNoteDocument([]), true)
    assert.deepEqual(extractRichTextSegments([]), [])
  })

  it('extracts and reinserts a simple paragraph without mutating the original', () => {
    const document = [paragraph('1', 'Visible text')]
    const segments = extractRichTextSegments(document)

    assert.deepEqual(
      segments.map(segment => ({
        kind: segment.kind,
        path: segment.path,
        text: segment.text,
        blockId: segment.blockId,
        blockType: segment.blockType,
      })),
      [
        {
          kind: 'text',
          path: [0, 'content', 0, 'text'],
          text: 'Visible text',
          blockId: '1',
          blockType: 'paragraph',
        },
      ]
    )

    const result = applyRichTextSegments(document, translated(segments, ['Translated text']))

    assert.equal(result.validation.valid, true)
    assert.equal(result.appliedCount, 1)
    assert.equal(result.document[0]?.content?.[0]?.text, 'Translated text')
    assert.equal(document[0]?.content?.[0]?.text, 'Visible text')
  })

  it('preserves segment order across multiple paragraphs', () => {
    const document = [paragraph('1', 'First'), paragraph('2', 'Second')]

    assert.deepEqual(
      extractRichTextSegments(document).map(segment => segment.text),
      ['First', 'Second']
    )
  })

  it('extracts styled text and preserves inline styles after reinsertion', () => {
    const document: BlockNoteDocument = [
      {
        id: 'styled',
        type: 'paragraph',
        props: {},
        content: [
          {
            type: 'text',
            text: 'Styled',
            styles: { bold: true, italic: true, underline: true, strike: true, code: true },
          },
        ],
        children: [],
      },
    ]
    const segments = extractRichTextSegments(document)
    const result = applyRichTextSegments(document, translated(segments, ['Translated']))

    assert.equal(result.validation.valid, true)
    assert.deepEqual(result.document[0]?.content?.[0]?.styles, document[0]?.content?.[0]?.styles)
  })

  it('extracts visible link text and preserves href after reinsertion', () => {
    const document: BlockNoteDocument = [
      {
        id: 'link-block',
        type: 'paragraph',
        props: {},
        content: [
          { type: 'text', text: 'Open ', styles: {} },
          {
            type: 'link',
            href: 'https://eventflow.uz/docs',
            content: [{ type: 'text', text: 'docs', styles: { underline: true } }],
          },
        ],
        children: [],
      },
    ]
    const segments = extractRichTextSegments(document)

    assert.deepEqual(
      segments.map(segment => ({ kind: segment.kind, text: segment.text })),
      [
        { kind: 'text', text: 'Open ' },
        { kind: 'link_text', text: 'docs' },
      ]
    )

    const result = applyRichTextSegments(document, translated(segments, ['Ochish ', 'hujjatlar']))

    assert.equal(result.validation.valid, true)
    assert.equal(result.document[0]?.content?.[1]?.href, 'https://eventflow.uz/docs')
    assert.equal(result.document[0]?.content?.[1]?.content?.[0]?.text, 'hujjatlar')
  })

  it('extracts heading and list item text', () => {
    const document: BlockNoteDocument = [
      {
        id: 'heading',
        type: 'heading',
        props: { level: 2 },
        content: [{ type: 'text', text: 'Agenda', styles: {} }],
        children: [],
      },
      {
        id: 'bullet',
        type: 'bulletListItem',
        props: {},
        content: [{ type: 'text', text: 'Registration', styles: {} }],
        children: [],
      },
    ]

    assert.deepEqual(
      extractRichTextSegments(document).map(segment => [segment.blockType, segment.text]),
      [
        ['heading', 'Agenda'],
        ['bulletListItem', 'Registration'],
      ]
    )
  })

  it('traverses nested children blocks', () => {
    const document: BlockNoteDocument = [
      {
        ...paragraph('parent', 'Parent'),
        children: [paragraph('child', 'Child')],
      },
    ]

    assert.deepEqual(
      extractRichTextSegments(document).map(segment => ({ path: segment.path, text: segment.text })),
      [
        { path: [0, 'content', 0, 'text'], text: 'Parent' },
        { path: [0, 'children', 0, 'content', 0, 'text'], text: 'Child' },
      ]
    )
  })

  it('extracts confirmed BlockNote table cell text and preserves table dimensions', () => {
    const document: BlockNoteDocument = [
      {
        id: 'table',
        type: 'table',
        props: {},
        content: {
          type: 'tableContent',
          columnWidths: [120, 160],
          headerRows: 1,
          rows: [
            {
              cells: [
                {
                  type: 'tableCell',
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    textColor: 'default',
                    textAlignment: 'left',
                    backgroundColor: 'default',
                  },
                  content: [{ type: 'text', text: 'Name', styles: { bold: true } }],
                },
                {
                  type: 'tableCell',
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    textColor: 'default',
                    textAlignment: 'left',
                    backgroundColor: 'default',
                  },
                  content: [{ type: 'text', text: 'Price', styles: {} }],
                },
              ],
            },
          ],
        },
        children: [],
      },
    ]
    const segments = extractRichTextSegments(document)

    assert.deepEqual(
      segments.map(segment => ({ kind: segment.kind, text: segment.text })),
      [
        { kind: 'table_cell_text', text: 'Name' },
        { kind: 'table_cell_text', text: 'Price' },
      ]
    )

    const result = applyRichTextSegments(document, translated(segments, ['Nomi', 'Narxi']))

    assert.equal(result.validation.valid, true)
    assert.deepEqual(result.document[0]?.content?.columnWidths, [120, 160])
    assert.equal(result.document[0]?.content?.headerRows, 1)
    assert.equal(result.document[0]?.content?.rows?.[0]?.cells?.length, 2)
  })

  it('skips image/media props and preserves URL, name, and caption-like metadata', () => {
    const document: BlockNoteDocument = [
      {
        id: 'image',
        type: 'image',
        props: {
          url: 'https://cdn.eventflow.uz/image.png',
          name: 'venue.png',
          caption: 'Displayed caption needs confirmation',
        },
        content: undefined,
        children: [],
      },
    ]

    assert.deepEqual(extractRichTextSegments(document), [])
    const result = applyRichTextSegments(document, [])

    assert.equal(result.validation.valid, true)
    assert.deepEqual(result.document[0]?.props, document[0]?.props)
  })

  it('skips code blocks', () => {
    const document: BlockNoteDocument = [
      {
        id: 'code',
        type: 'codeBlock',
        props: { language: 'ts' },
        content: [{ type: 'text', text: 'const secret = "not translated"', styles: {} }],
        children: [],
      },
    ]

    assert.deepEqual(extractRichTextSegments(document), [])
  })

  it('skips visible text segments that are standalone non-translatable tokens', () => {
    const document: BlockNoteDocument = [
      paragraph('url', 'https://eventflow.uz/events'),
      paragraph('email', 'hello@eventflow.uz'),
      paragraph('phone', '+998 90 123 45 67'),
      paragraph('price', '120000 UZS'),
      paragraph('date', '2026-04-27'),
      paragraph('path', '/uploads/venue.png'),
      paragraph('text', 'Human visible sentence'),
    ]

    assert.deepEqual(
      extractRichTextSegments(document).map(segment => segment.text),
      ['Human visible sentence']
    )
  })

  it('handles malformed or non-array documents without uncontrolled errors', () => {
    assert.equal(isBlockNoteDocument({ blocks: [] }), false)
    assert.deepEqual(extractRichTextSegments({ blocks: [] }), [])

    const result = applyRichTextSegments({ blocks: [] }, [])
    assert.equal(result.validation.valid, false)
    assert.equal(result.validation.errors[0]?.code, 'invalid_document')
  })

  it('fails safely when a translated segment path is missing', () => {
    const document = [paragraph('1', 'Original')]
    const segments = extractRichTextSegments(document)
    const broken = [{ ...segments[0]!, path: [0, 'content', 10, 'text'], text: 'Broken' }]

    const result = applyRichTextSegments(document, broken)

    assert.equal(result.validation.valid, false)
    assert.equal(result.validation.errors[0]?.code, 'missing_path')
    assert.equal(result.appliedCount, 0)
    assert.equal(result.document[0]?.content?.[0]?.text, 'Original')
  })

  it('computes visible text and structure hashes with different sensitivity', () => {
    const original = [paragraph('1', 'Original text')]
    const translatedResult = applyRichTextSegments(
      original,
      translated(extractRichTextSegments(original), ['Translated text'])
    )

    assert.notEqual(
      computeRichTextVisibleTextHash(original),
      computeRichTextVisibleTextHash(translatedResult.document)
    )
    assert.equal(
      computeRichTextStructureHash(original),
      computeRichTextStructureHash(translatedResult.document)
    )
  })

  it('validates structure preservation and catches block type/order changes', () => {
    const original = [paragraph('1', 'First'), paragraph('2', 'Second')]
    const translated = [paragraph('1', 'Birinci'), paragraph('2', 'Ikkinchi')]
    const reordered = [translated[1]!, translated[0]!]
    const retagged = [{ ...translated[0]!, type: 'heading' }, translated[1]!]

    assert.equal(validateRichTextStructurePreserved(original, translated).valid, true)
    assert.equal(validateRichTextStructurePreserved(original, reordered).valid, false)
    assert.equal(validateRichTextStructurePreserved(original, retagged).valid, false)
  })

  it('validates table dimensions as structural invariants', () => {
    const original: BlockNoteDocument = [
      {
        id: 'table',
        type: 'table',
        props: {},
        content: {
          type: 'tableContent',
          columnWidths: [120],
          headerRows: 0,
          rows: [
            {
              cells: [
                {
                  type: 'tableCell',
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    textColor: 'default',
                    textAlignment: 'left',
                    backgroundColor: 'default',
                  },
                  content: [{ type: 'text', text: 'Cell', styles: {} }],
                },
              ],
            },
          ],
        },
        children: [],
      },
    ]
    const changedDimensions = JSON.parse(JSON.stringify(original)) as BlockNoteDocument
    changedDimensions[0]!.content.rows.push({
      cells: [
        {
          type: 'tableCell',
          props: {
            colspan: 1,
            rowspan: 1,
            textColor: 'default',
            textAlignment: 'left',
            backgroundColor: 'default',
          },
          content: [{ type: 'text', text: 'Extra', styles: {} }],
        },
      ],
    })

    assert.equal(validateRichTextStructurePreserved(original, changedDimensions).valid, false)
  })
})
