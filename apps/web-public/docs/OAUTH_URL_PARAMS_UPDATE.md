# OAuth URL parameters

This filename is historical. The current web callback contains routing metadata
only:

```text
/auth/callback?oauth=success&isOnboardingCompleted=false&isNewUser=true
```

Authentication is carried by Secure HttpOnly cookies. Native OAuth receives one
opaque `code` and exchanges it server-side. Access and refresh tokens must not be
placed in query strings or fragments. Legacy token parsing exists only for
backward compatibility with already-deployed clients.
