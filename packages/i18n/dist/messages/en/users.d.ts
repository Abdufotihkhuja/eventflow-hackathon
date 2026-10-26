export declare const users: {
    readonly title: "Users";
    readonly role: {
        readonly owner: "Owner";
        readonly admin: "Administrator";
        readonly eventManager: "Event manager";
        readonly eventCoordinator: "Event coordinator";
        readonly support: "Support";
        readonly viewer: "Viewer";
    };
    readonly roleDescription: {
        readonly owner: "Full access to all system features";
        readonly admin: "Manage events, users, and settings";
        readonly eventManager: "Create and edit events, manage participants";
        readonly eventCoordinator: "Manage participants and coordinate events";
        readonly support: "View information and support users";
        readonly viewer: "View statistics and event information";
    };
    readonly status: {
        readonly active: "Active";
        readonly inactive: "Inactive";
        readonly invited: "Invited";
        readonly suspended: "Suspended";
    };
    readonly page: {
        readonly kicker: "Organization";
        readonly title: "Team";
        readonly invitePeople: "Invite people";
        readonly you: "You";
        readonly tabAll: "All";
        readonly colName: "Name";
        readonly colEmail: "Email";
        readonly colRole: "Role";
        readonly colAdded: "Added";
        readonly colStatus: "Status";
        readonly pendingTitle: "{count} invites pending";
        readonly pendingNames: "{names} haven't accepted yet";
        readonly resendAll: "Resend all";
        readonly pendingSubtitle: "Awaiting invitation acceptance";
        readonly declinedTitle: "{count} declined";
        readonly declinedSubtitle: "Invitation declined — you can invite later or invite someone else";
        readonly declinedNoReason: "No comment";
        readonly revoke: "Revoke";
        readonly invitesResent: "Resent {count} invitations";
        readonly rolesTitle: "Roles & permissions";
        readonly rolesDescription: "What each role can do in this organization";
        readonly capability: "Capability";
        readonly permFull: "Full";
        readonly permPartial: "Partial";
        readonly noAccessTitle: "No access to the team";
        readonly noAccessDescription: "You don't have permission to view or manage team members.";
        readonly notSpecified: "Not specified";
        readonly configureAccess: "Configure access";
        readonly resendInvite: "Resend invitation";
        readonly unblock: "Unblock";
        readonly block: "Block";
        readonly added: "Added";
        readonly statsTotal: "Total";
        readonly statsActive: "Active";
        readonly statsInvited: "Invited";
        readonly statsSuspended: "Suspended";
        readonly innRequiredTitle: "Organization TIN required";
        readonly innRequiredDescription: "To add employees, specify the organization TIN in the profile. Employees need the TIN to sign in.";
        readonly goToProfile: "Go to profile";
        readonly teamManagement: "Team management";
        readonly teamDescription: "Add employees and configure access permissions";
        readonly addEmployee: "Add employee";
        readonly allRoles: "All roles";
        readonly noEmployees: "No employees found";
        readonly tryChangingFilters: "Try changing filters";
        readonly addFirstEmployee: "Add the first employee";
        readonly filters: "Filters:";
        readonly searchPlaceholder: "Search by name or email...";
        readonly allStatuses: "All statuses";
        readonly editEmployee: "Edit employee";
        readonly addEmployeeTitle: "Add employee";
        readonly editEmployeeDescription: "Update employee details";
        readonly addEmployeeDescription: "Fill in information for the new employee";
        readonly deleteTitle: "Delete employee?";
        readonly deleteDescription: "Are you sure you want to delete {name}?";
        readonly manageAccess: "Manage access";
        readonly manageAccessDescription: "Configure individual permissions for {name}";
        readonly openMenu: "Open menu";
        readonly configureAccessAction: "Configure access";
        readonly sendInviteAgain: "Send invitation again";
    };
    readonly form: {
        readonly email: "Email";
        readonly emailPlaceholder: "user@example.com";
        readonly emailDescription: "Email for sign-in and notifications";
        readonly password: "Password";
        readonly passwordPlaceholder: "Minimum 8 characters";
        readonly passwordDescription: "Password for signing in (minimum 8 characters)";
        readonly firstName: "First name";
        readonly firstNamePlaceholder: "John";
        readonly lastName: "Last name";
        readonly lastNamePlaceholder: "Smith";
        readonly role: "Role";
        readonly selectRole: "Select role";
        readonly phone: "Phone";
        readonly position: "Position";
        readonly positionPlaceholder: "Event Manager";
        readonly department: "Department";
        readonly departmentPlaceholder: "Marketing";
        readonly sendInvitation: "Send invitation by email";
        readonly sendInvitationDescription: "The employee will receive an email with account activation instructions";
        readonly saveChanges: "Save changes";
        readonly createEmployee: "Create employee";
        readonly validation: {
            readonly emailRequired: "Email is required";
            readonly invalidEmail: "Invalid email format";
            readonly firstNameRequired: "First name is required";
            readonly lastNameRequired: "Last name is required";
            readonly invalidPhone: "Invalid phone format";
            readonly roleRequired: "Select a role";
            readonly passwordRequired: "Password is required (minimum 8 characters) when invitation is not sent";
        };
    };
    readonly permissionEditor: {
        readonly baseRole: "Base role: {role}";
        readonly baseRoleDescription: "Permissions from the role are marked with a shield and cannot be disabled. You can add extra permissions (shown in green) below.";
        readonly rolePermission: "Permission from role \"{role}\"";
        readonly savingChanges: "Saving changes...";
        readonly roleRights: "Role permissions";
        readonly individualRights: "Individual permissions";
        readonly resources: {
            readonly dashboard: "Dashboard";
            readonly events: "Events";
            readonly speakers: "Speakers";
            readonly agenda: "Agenda";
            readonly questions: "Registration questions";
            readonly tickets: "Tickets";
            readonly certificates: "Certificates";
            readonly artifact_recipients: "Artifact recipients";
            readonly recipient_roles: "Recipient roles";
            readonly mail: "Mailings";
            readonly registrations: "Registrations";
            readonly attendance: "Attendance";
            readonly boards: "Boards";
            readonly columns: "Columns";
            readonly tasks: "Tasks";
            readonly comments: "Comments";
            readonly checklists: "Checklists";
            readonly tags: "Tags";
            readonly attachments: "Attachments";
            readonly blog: "Blog";
            readonly followers: "Followers";
            readonly contacts: "Contact requests";
            readonly places: "Venues";
            readonly members: "Staff";
            readonly roles: "Roles";
            readonly settings: "Settings";
            readonly organization: "Organization";
            readonly uploads: "Uploads";
            readonly billing: "Billing";
            readonly analytics: "Analytics";
        };
        readonly loadErrorTitle: "Could not load permission catalog";
        readonly loadErrorDescription: "Check the connection or try again. Technical reason:";
        readonly emptyCatalogTitle: "Permission catalog is empty";
        readonly emptyCatalogDescription: "Permissions are not configured in the system. Run migrations and seed before managing access.";
        readonly retry: "Retry";
        readonly actions: {
            readonly create: "Create";
            readonly read: "View";
            readonly update: "Edit";
            readonly delete: "Delete";
            readonly manage: "Manage";
            readonly view: "View";
            readonly edit: "Edit";
            readonly publish: "Publish";
            readonly approve: "Approve";
            readonly reject: "Reject";
            readonly send: "Send";
            readonly export: "Export";
            readonly import: "Import";
            readonly checkin: "Check-in";
            readonly generate: "Generate";
            readonly archive: "Archive";
            readonly assign: "Assign";
            readonly move: "Move";
            readonly invite: "Invite";
        };
        readonly modules: {
            readonly dashboard: "Dashboard";
            readonly events: "Events";
            readonly participants: "Participants";
            readonly checkin: "Check-in";
            readonly board: "Board";
            readonly blog: "Blog";
            readonly followers: "Followers";
            readonly requests: "Requests";
            readonly places: "Venues";
            readonly users: "Users";
            readonly billing: "Plans/Payment";
            readonly members: "Employees";
            readonly roles: "Roles";
            readonly registrations: "Registrations";
            readonly attendance: "Attendance";
            readonly certificates: "Certificates";
            readonly speakers: "Speakers";
            readonly agenda: "Agenda";
            readonly mail: "Mailings";
            readonly boards: "Boards";
            readonly tasks: "Tasks";
            readonly organization: "Organization";
            readonly analytics: "Analytics";
            readonly settings: "Settings";
            readonly questions: "Registration questions";
            readonly tickets: "Tickets";
            readonly columns: "Columns";
            readonly comments: "Comments";
            readonly checklists: "Checklists";
            readonly tags: "Tags";
            readonly attachments: "Attachments";
            readonly uploads: "Uploads";
        };
        readonly moduleDescriptions: {
            readonly dashboard: "Access to the organizer dashboard";
            readonly events: "Create and manage events";
            readonly participants: "Registrations, participants, and list export";
            readonly checkin: "QR check-in and attendance reports";
            readonly board: "Boards, tasks, comments, and attachments";
            readonly blog: "Organization posts and blog publishing";
            readonly followers: "Followers of the organization public profile";
            readonly requests: "User contact requests for the organization";
            readonly places: "Venue catalog and rental requests";
            readonly users: "Employees, roles, and access management";
            readonly billing: "Plans, payments, and paid add-ons";
            readonly members: "Manage organization employees";
            readonly roles: "Configure roles and access rights";
            readonly registrations: "Work with participant registrations";
            readonly attendance: "Track event attendance";
            readonly certificates: "Generate and manage certificates";
            readonly speakers: "Manage event speakers";
            readonly agenda: "Configure event agenda";
            readonly mail: "Send notifications to participants";
            readonly boards: "Task management boards";
            readonly tasks: "Work with board tasks";
            readonly organization: "Organization settings";
            readonly analytics: "View statistics and reports";
            readonly settings: "System settings";
            readonly questions: "Registration form questions";
            readonly tickets: "Manage ticket types";
            readonly columns: "Manage board columns";
            readonly comments: "Task comments";
            readonly checklists: "Task checklists";
            readonly tags: "Task tags";
            readonly attachments: "Task attachments";
            readonly uploads: "Upload files to the system";
        };
    };
    readonly permissions: {
        readonly groups: {
            readonly events: {
                readonly label: "Events";
                readonly description: "Event management";
            };
            readonly participants: {
                readonly label: "Participants";
                readonly description: "Work with event participants";
            };
            readonly analytics: {
                readonly label: "Analytics";
                readonly description: "Access to statistics and reports";
            };
            readonly users: {
                readonly label: "Users";
                readonly description: "Team management";
            };
            readonly settings: {
                readonly label: "Settings";
                readonly description: "System configuration";
            };
        };
        readonly items: {
            readonly eventsView: {
                readonly label: "View events";
                readonly description: "View event lists and details";
            };
            readonly eventsCreate: {
                readonly label: "Create events";
                readonly description: "Create new events";
            };
            readonly eventsEdit: {
                readonly label: "Edit events";
                readonly description: "Change existing events";
            };
            readonly eventsPublish: {
                readonly label: "Publish events";
                readonly description: "Publish event drafts";
            };
            readonly eventsDelete: {
                readonly label: "Delete events";
                readonly description: "Delete events";
            };
            readonly participantsView: {
                readonly label: "View participants";
                readonly description: "View participant lists";
            };
            readonly participantsManage: {
                readonly label: "Manage participants";
                readonly description: "Add, edit, and delete participants";
            };
            readonly participantsExport: {
                readonly label: "Export participants";
                readonly description: "Export participant lists";
            };
            readonly analyticsView: {
                readonly label: "View analytics";
                readonly description: "Access dashboard and statistics";
            };
            readonly analyticsExport: {
                readonly label: "Export reports";
                readonly description: "Export data and reports";
            };
            readonly usersView: {
                readonly label: "View users";
                readonly description: "View team list";
            };
            readonly usersInvite: {
                readonly label: "Invite users";
                readonly description: "Send invitations to new users";
            };
            readonly usersManage: {
                readonly label: "Manage users";
                readonly description: "Full user and permission management";
            };
            readonly settingsView: {
                readonly label: "View settings";
                readonly description: "View system settings";
            };
            readonly settingsManage: {
                readonly label: "Manage settings";
                readonly description: "Change system settings";
            };
        };
    };
};
//# sourceMappingURL=users.d.ts.map