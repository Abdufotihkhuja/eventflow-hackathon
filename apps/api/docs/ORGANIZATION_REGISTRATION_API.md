# Organization registration API

`POST /api/v1/auth/organization/register` registers a distinct organization
owner account. In one Serializable transaction it creates Organization,
system roles, Account, ORGANIZATION Identity and protected OWNER Membership.
It never creates User or personal/participant scope.

An email already used by a User or Organization is rejected without revealing
which actor type owns it. An authenticated personal account has no command to
create an organization; a person joins an existing organization only through
OrganizationInvite acceptance.

Platform operators may also use the audited
`POST /api/v1/super-admin/organizations/provision` command. That administrative
channel remains elevation-protected and does not change the public account-type
boundary.
