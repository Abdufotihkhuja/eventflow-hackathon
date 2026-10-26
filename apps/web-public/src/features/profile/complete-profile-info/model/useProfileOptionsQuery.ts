/**
 * @module features/profile/complete-profile-info/model/useProfileOptionsQuery
 * GET /api/v1/public/profile-options — справочники для формы доп. полей (публичный)
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  getProfileOptions,
  type ProfileOptionsResponse,
} from "@entities/profile";

export const PROFILE_OPTIONS_QUERY_KEY = ["profile", "options"] as const;

export function useProfileOptionsQuery(
  enabled = true
): UseQueryResult<ProfileOptionsResponse, Error> {
  return useQuery({
    queryKey: PROFILE_OPTIONS_QUERY_KEY,
    queryFn: () => getProfileOptions(),
    staleTime: 10 * 60 * 1000,
    enabled,
  });
}
