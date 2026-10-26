# Organization registration endpoint history

Status: active after the 2026-08-16 business-rule revision.

`POST /api/v1/auth/organization/register` again accepts the historical request
shape, but its persistence semantics are stronger: Organization, roles,
Account, ORGANIZATION Identity and OWNER Membership commit atomically. No User
identity or participant scope is created. Existing personal emails are denied;
personal users join organizations only through invitations.
