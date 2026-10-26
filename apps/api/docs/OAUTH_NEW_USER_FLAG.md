# OAuth `isNewUser` flag

The backend may append `isNewUser=true` as non-secret web routing metadata. It is
never an identity or authorization input. Web authentication is carried by
HttpOnly cookies; mobile authentication uses the one-use exchange code.
