import { adminSdk } from '@api/adminSdk'

export const sessionService = {
  getMe: () => adminSdk.session.getMe(),
} as const
