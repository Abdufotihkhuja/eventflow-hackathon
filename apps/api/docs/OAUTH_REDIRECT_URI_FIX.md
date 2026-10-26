# OAuth redirect URI rule

Provider consoles must use the API callback URLs:

```text
https://api.eventflow.uz/api/v1/auth/google/callback
https://api.eventflow.uz/api/v1/auth/linkedin/callback
```

The API then establishes a cookie session for web or issues a one-use exchange
code for mobile. Public-site provider callback URLs and redirect bearer tokens
are invalid configurations.
