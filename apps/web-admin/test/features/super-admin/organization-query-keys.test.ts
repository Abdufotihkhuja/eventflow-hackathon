import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { QueryClient } from '@tanstack/react-query'

import {
  ADMIN_ORGANIZATION_QUERY_KEY,
  ADMIN_ORGANIZATIONS_QUERY_KEY,
  PENDING_ORGANIZATIONS_QUERY_KEY,
  invalidateOrganizationQueries,
} from '../../../src/features/super-admin/api/organization-query-keys.ts'

const ORG_ID = 'org-1'
const OTHER_ORG_ID = 'org-2'

function seededClient() {
  const queryClient = new QueryClient()
  queryClient.setQueryData([...ADMIN_ORGANIZATIONS_QUERY_KEY, { page: 1 }], { data: [] })
  queryClient.setQueryData([...PENDING_ORGANIZATIONS_QUERY_KEY, undefined], { data: [] })
  queryClient.setQueryData([...ADMIN_ORGANIZATION_QUERY_KEY, ORG_ID], { id: ORG_ID })
  queryClient.setQueryData([...ADMIN_ORGANIZATION_QUERY_KEY, OTHER_ORG_ID], { id: OTHER_ORG_ID })
  return queryClient
}

function isInvalidated(queryClient: QueryClient, queryKey: readonly unknown[]) {
  return queryClient.getQueryState(queryKey)?.isInvalidated
}

describe('invalidateOrganizationQueries', () => {
  // Регрессия: reject/approve сбрасывали только списки, карточка организации
  // оставалась со старым статусом, повторный клик падал с «уже отклонена».
  it('invalidates the organization details query, not only the lists', async () => {
    const queryClient = seededClient()

    await invalidateOrganizationQueries(queryClient, ORG_ID)

    assert.equal(isInvalidated(queryClient, [...ADMIN_ORGANIZATION_QUERY_KEY, ORG_ID]), true)
    assert.equal(isInvalidated(queryClient, [...ADMIN_ORGANIZATIONS_QUERY_KEY, { page: 1 }]), true)
    assert.equal(isInvalidated(queryClient, [...PENDING_ORGANIZATIONS_QUERY_KEY, undefined]), true)
  })

  it('leaves other organizations cached', async () => {
    const queryClient = seededClient()

    await invalidateOrganizationQueries(queryClient, ORG_ID)

    assert.equal(
      isInvalidated(queryClient, [...ADMIN_ORGANIZATION_QUERY_KEY, OTHER_ORG_ID]),
      false
    )
  })
})
