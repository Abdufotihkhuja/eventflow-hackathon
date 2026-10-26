import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getAppQueryScopeGeneration,
  queryClient,
  rotateAppQueryScope,
} from '../../../src/shared/lib/query-client'

test.afterEach(() => {
  queryClient.clear()
})

void test('workspace cache rotates scope and generation deterministically', () => {
  const before = getAppQueryScopeGeneration()
  rotateAppQueryScope('organization:org-a')
  const first = getAppQueryScopeGeneration()
  rotateAppQueryScope('organization:org-b')
  const second = getAppQueryScopeGeneration()

  assert.equal(first.scope, 'organization:org-a')
  assert.equal(first.generation, before.generation + 1)
  assert.equal(second.scope, 'organization:org-b')
  assert.equal(second.generation, first.generation + 1)
})

void test('late workspace response from organization A cannot populate B', async () => {
  let release!: (value: string) => void
  const delayed = new Promise<string>(resolve => {
    release = resolve
  })
  const request = queryClient.fetchQuery({
    queryKey: ['members'],
    queryFn: () => delayed,
  })

  await Promise.resolve()
  rotateAppQueryScope('organization:org-b')
  release('org-a')
  await assert.rejects(request, (error: Error) => error.message === 'CancelledError')

  assert.equal(queryClient.getQueryData(['members']), undefined)
})

void test('workspace scope rotation clears optimistic mutations', () => {
  queryClient.getMutationCache().build(queryClient, {
    mutationKey: ['members', 'update'],
    mutationFn: async () => 'ok',
  })
  assert.equal(queryClient.getMutationCache().getAll().length, 1)

  rotateAppQueryScope('organization:org-c')

  assert.equal(queryClient.getMutationCache().getAll().length, 0)
})
