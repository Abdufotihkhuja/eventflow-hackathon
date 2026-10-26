# OAuth First Login Redirect

This is now a historical note.

## Current contract

- the backend establishes a HttpOnly-cookie session and redirects with only
  non-secret query metadata (`oauth=success`, onboarding flags)
- onboarding routing should use `isOnboardingCompleted`
- `isNewUser` may be used as a first-login hint, never as authority

For the active flow, use `OAUTH_INTEGRATION_GUIDE.md` in this folder.
