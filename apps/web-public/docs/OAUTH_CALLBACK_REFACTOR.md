# OAuth callback refactoring

The active callback is cookie-based. It accepts `oauth=success` and onboarding
metadata, bootstraps CSRF, resolves the live session, sanitizes the URL, and
routes the user. Historical bearer query/fragment payloads are compatibility
inputs only and must not be emitted by current backend code.
