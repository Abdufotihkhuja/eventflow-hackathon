# `isOnboardingCompleted` in OAuth callback

This boolean is non-secret routing metadata on the web callback. `true` routes
to the personal app and `false` to `/complete-profile`. Authentication comes
from the HttpOnly-cookie session; the field must not be treated as authority.
