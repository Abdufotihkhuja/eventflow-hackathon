export declare const workspace: {
    readonly layout: {
        readonly navigationGroups: {
            readonly management: "Workspace catalogs";
            readonly organization: "Organization";
            readonly account: "Account";
            readonly system: "System";
        };
        readonly navigation: {
            readonly dashboard: "Dashboard";
            readonly myEvents: "Events";
            readonly checkIn: "Check-in";
            readonly myBlog: "My blog";
            readonly users: "Staff";
            readonly followers: "Followers";
            readonly contacts: "Contact requests";
            readonly placesCatalog: "Venue catalog";
            readonly myPlaces: "My venues";
            readonly tasks: "Tasks";
            readonly board: "Board";
            readonly profile: "Profile";
            readonly settings: "Settings";
            readonly billing: "Billing";
            readonly security: "Security";
        };
        readonly routes: {
            readonly home: "Home";
            readonly dashboard: {
                readonly title: "Dashboard";
                readonly description: "Key metrics summary";
            };
            readonly myEvents: {
                readonly title: "My events";
                readonly description: "Manage events";
            };
            readonly users: {
                readonly title: "Staff";
                readonly description: "Manage organization employees";
            };
            readonly boards: {
                readonly title: "My boards";
                readonly description: "Manage task boards";
            };
            readonly profile: {
                readonly title: "Profile";
                readonly description: "Manage profile";
            };
            readonly settings: {
                readonly title: "Settings";
                readonly description: "System configuration";
            };
            readonly billing: {
                readonly title: "Billing & subscription";
                readonly description: "Plan, pricing and payment status";
            };
            readonly security: {
                readonly title: "Security";
                readonly description: "Manage account security";
            };
            readonly myBlog: {
                readonly title: "My blog";
                readonly description: "Manage blog posts";
            };
            readonly followers: {
                readonly title: "Followers";
                readonly description: "Users following the organization";
            };
            readonly contacts: {
                readonly title: "Contact requests";
                readonly description: "User requests to contact the organization";
            };
            readonly myPlaces: {
                readonly title: "My venues";
                readonly description: "Catalog of your rental venues";
            };
            readonly places: {
                readonly title: "Venue catalog";
                readonly description: "Venues for events";
            };
            readonly place: {
                readonly title: "Venue";
                readonly description: "Venue details";
            };
            readonly event: {
                readonly title: "Event";
                readonly description: "Event command center";
            };
            readonly blogPost: {
                readonly title: "Article";
                readonly description: "Article management";
            };
            readonly page: {
                readonly title: "Page";
            };
        };
        readonly sidebar: {
            readonly collapse: "Collapse";
            readonly expand: "Expand";
            readonly inviteTitle: "Invite your team";
            readonly inviteBody: "Add editors, door staff, and finance — roles control what they can do.";
            readonly inviteCta: "Invite people";
            readonly logout: "Log out";
            readonly tipTitle: "Tip of the day";
            readonly tipHotkeys: "Use keyboard shortcuts for quick navigation";
        };
        readonly navbar: {
            readonly menu: "Menu";
            readonly organizationInn: "Organization TIN";
            readonly inn: "TIN:";
            readonly notifications: "Notifications";
            readonly viewPublicProfile: "View public profile";
            readonly language: "Language";
            readonly profile: "Profile";
            readonly personalCabinet: "Personal cabinet";
            readonly settings: "Settings";
            readonly logout: "Log out";
            readonly defaultUser: "User";
            readonly adminUser: "Admin user";
        };
        readonly loading: {
            readonly page: "Loading page...";
        };
        readonly home: {
            readonly title: "Welcome to EventFlow!";
            readonly description: "You have signed in successfully.";
        };
        readonly theme: {
            readonly toggle: "Toggle theme";
            readonly light: "Light";
            readonly dark: "Dark";
            readonly system: "System";
        };
        readonly actions: {
            readonly createEvent: "Create event";
        };
    };
    readonly notifications: {
        readonly title: "Notifications";
        readonly unreadCount: "{count} unread";
        readonly allRead: "All caught up";
        readonly markAllRead: "Mark all as read";
        readonly emptyTitle: "No notifications yet";
        readonly emptyDescription: "Team events land here: registrations, moderation, invitation replies";
        readonly types: {
            readonly fallback: "New activity in the organization";
            readonly MEMBER_JOINED: "{personName} accepted the invitation and joined the team";
            readonly MEMBER_INVITE_DECLINED: "{personName} declined the invitation for the {roleName} role";
            readonly REGISTRATION_CREATED: "New event registration request";
            readonly REGISTRATION_FIRST: "First registration for the event";
            readonly REGISTRATION_APPROVED: "Registration approved";
            readonly REGISTRATION_REJECTED: "Registration rejected";
            readonly EVENT_SUBMITTED: "Event submitted for review";
            readonly EVENT_PUBLISHED: "Event published";
            readonly EVENT_REJECTED: "Event rejected by moderation";
            readonly EVENT_CHANGES_REQUESTED: "Moderation requested changes to the event";
            readonly CAPACITY_THRESHOLD: "Event capacity reached {threshold}%";
            readonly TICKET_REFUND: "Ticket refunded";
            readonly REGISTRATION_CLOSED: "Event registration closed";
            readonly EVENT_SUMMARY: "Event summary is ready";
            readonly ORG_VERIFIED: "Organization verified";
            readonly ORG_VERIFICATION_REJECTED: "Organization verification rejected";
        };
    };
    readonly access: {
        readonly checking: "Checking access...";
        readonly deniedTitle: "Insufficient permissions";
        readonly deniedDescription: "Your account does not have access to this section. Contact the organization owner if you need it for work.";
    };
    readonly footer: {
        readonly copyright: "© EventFlow - Event management platform";
    };
    readonly followers: {
        readonly title: "Followers";
        readonly description: "Users who follow your organization";
        readonly statsTotal: "Total followers";
        readonly searchPlaceholder: "Search by name...";
        readonly emptyTitle: "No followers yet";
        readonly emptyDescription: "Users who follow the organization will appear here";
        readonly unnamed: "No name";
        readonly followedAt: "Followed: {date}";
        readonly pageInfo: "Page {page} of {total}";
        readonly colSubscriber: "Subscriber";
        readonly colFollowed: "Followed";
        readonly export: "Export";
        readonly exporting: "Exporting…";
        readonly exportEmpty: "No subscribers to export";
        readonly exportError: "Couldn't export subscribers";
    };
    readonly places: {
        readonly access: {
            readonly ownerOnlyTitle: "Venue management is available only to organizers";
            readonly ownerOnlyDescription: "Employees can work with events and tasks, while venue management remains with the organization owner.";
            readonly editorOwnerOnlyTitle: "Venue editing is available only to organizers";
            readonly featureDisabledBadge: "Venue module is currently disabled";
            readonly featureDisabledTitle: "When super-admin enables access, the rental venue workspace will appear here";
            readonly featureDisabledDescription: "After activation, you can create a catalog of your venues, publish cards, and receive requests from other organizers.";
            readonly openCatalog: "Open public catalog";
            readonly platformSetupTitle: "What has been prepared on the platform side";
            readonly platformSetupDescription: "Swagger confirms a separate organization flag `placesFeatureEnabled`. It controls whether an organizer can create and publish venues.";
            readonly editorFeatureDisabledTitle: "Venue module is disabled for your organization";
            readonly editorFeatureDisabledDescription: "Contact super-admin to enable `placesFeatureEnabled` for the organization profile.";
        };
        readonly list: {
            readonly badge: "Rental places workspace";
            readonly colVenue: "Venue";
            readonly colStatus: "Status";
            readonly colAddress: "Address";
            readonly colCapacity: "Capacity";
            readonly colPrice: "Price";
            readonly showingCount: "Showing {shown} of {total} venues";
            readonly tryChangingFilters: "Try changing the search or status filter";
            readonly title: "My venues";
            readonly description: "Build a venue showcase that helps organizers decide quickly: clear photos, transparent pricing, address, capacity, and a fast request flow.";
            readonly add: "Add venue";
            readonly searchPlaceholder: "Search by title, address, or city";
            readonly statusPlaceholder: "Status";
            readonly loading: "Loading venues...";
            readonly loadError: "Failed to load venues: {message}";
            readonly unknownError: "unknown error";
            readonly emptyTitle: "No venues yet";
            readonly emptyDescription: "Start with one strong card: photos, real capacity, amenities, and clear pricing.";
            readonly createFirst: "Create first venue";
            readonly viewCatalog: "View catalog";
            readonly emptyTipCover: "Add a strong cover";
            readonly emptyTipCapacity: "Specify real capacity";
            readonly emptyTipAmenities: "Describe amenities clearly";
            readonly noImage: "No image";
            readonly fromPrice: "from {price}{suffix}";
            readonly guestsUpTo: "Up to {capacity} guests";
            readonly noPrice: "Price not specified";
            readonly pageInfo: "Page {page} of {total}";
            readonly deleteTitle: "Delete venue?";
            readonly deleteDescription: "Venue «{title}» will be deleted permanently.";
            readonly deleteFallbackDescription: "The venue will be deleted permanently.";
        };
        readonly stats: {
            readonly total: "Total venues";
            readonly published: "Published";
            readonly drafts: "Drafts";
            readonly archived: "Archived";
        };
        readonly statusFilter: {
            readonly all: "All statuses";
            readonly draft: "Drafts";
            readonly published: "Published";
            readonly archived: "Archive";
        };
        readonly catalog: {
            readonly badge: "EventFlow places";
            readonly title: "Event venues that are easy to compare and fast to book";
            readonly description: "The catalog is built around practical decisions: clear photos, transparent pricing, exact address, capacity, and a fast request path.";
            readonly searchPlaceholder: "Search by title or district";
            readonly cityPlaceholder: "City";
            readonly currencyPlaceholder: "Currency";
            readonly allCurrencies: "All currencies";
            readonly sortPlaceholder: "Sort";
            readonly nearby: "Nearby";
            readonly minPrice: "Price from";
            readonly maxPrice: "Price to";
            readonly found: "Venues found: {count}";
            readonly geolocationUnavailable: "Geolocation is unavailable in this browser";
            readonly geolocationError: "Failed to detect your location";
            readonly loading: "Loading catalog...";
            readonly loadError: "Failed to load catalog: {message}";
            readonly emptyTitle: "No venues found yet";
            readonly emptyDescription: "Try broadening the filters or changing sort. The catalog is connected to the live API and will fill with published venues.";
            readonly noPhoto: "No photo";
            readonly defaultCity: "Uzbekistan";
            readonly perHour: "/hour";
            readonly perDay: "/day";
        };
        readonly sort: {
            readonly newest: "Newest first";
            readonly priceAsc: "Cheapest first";
            readonly priceDesc: "Most expensive first";
            readonly nearest: "Nearest to me";
        };
        readonly editor: {
            readonly backToList: "Back to list";
            readonly badgeEdit: "Fine-tune card";
            readonly badgeNew: "New venue";
            readonly titleEditFallback: "Edit venue";
            readonly titleCreate: "Create venue";
            readonly description: "Make the card practical: a strong first photo, transparent pricing, clear capacity, and precise geolocation.";
            readonly publicCard: "Public card";
            readonly publish: "Publish";
            readonly archive: "Archive";
            readonly save: "Save";
            readonly loading: "Loading venue...";
            readonly uploadImagesError: "Failed to upload images";
            readonly saveError: "Failed to save venue";
            readonly fields: {
                readonly title: "Venue title";
                readonly slug: "Slug";
                readonly city: "City";
                readonly shortDescription: "Short description";
                readonly fullDescription: "Full description";
                readonly currency: "Currency";
                readonly capacity: "Capacity";
                readonly address: "Address";
                readonly addressNotes: "Landmark and entrance details";
            };
            readonly placeholders: {
                readonly city: "Tashkent";
                readonly shortDescription: "What an organizer understands about the venue in 10 seconds";
                readonly fullDescription: "Describe the atmosphere, use cases, restrictions, equipment, and additional conditions";
                readonly hourlyConditions: "Minimum 2 hours. Each following hour is billed separately.";
                readonly dailyConditions: "Check-in from 14:00, check-out before 12:00 the next day.";
                readonly address: "Tashkent, Navoi street, 12";
                readonly addressNotes: "For example: 3rd floor, entrance from the parking side";
            };
            readonly validation: {
                readonly titleRequired: "Enter venue title";
                readonly invalidSlug: "Slug may contain only a-z, 0-9, and hyphen";
                readonly priceRequired: "Enter at least one price: hourly or daily";
                readonly addressRequired: "Enter address";
                readonly mapPointRequired: "Select a point on the map";
                readonly imageRequired: "Add at least one image";
            };
            readonly pricing: {
                readonly title: "Rental rates";
                readonly description: "Enter at least one rate. You can set both; the renter will choose when applying.";
                readonly hourly: "Hourly rental";
                readonly pricePerHour: "Price per hour";
                readonly daily: "Daily rental";
                readonly pricePerDay: "Price per day";
                readonly conditions: "Conditions";
                readonly optional: "(optional)";
            };
            readonly photos: {
                readonly title: "Photos";
                readonly description: "The first photo is used as the catalog cover.";
                readonly upload: "Upload";
                readonly dropzone: "Drop images here or choose files";
                readonly alt: "Venue photo {index}";
                readonly cover: "Cover";
                readonly photo: "Photo {index}";
            };
            readonly amenities: {
                readonly title: "Amenities";
                readonly description: "Select what is actually available at the venue.";
            };
            readonly location: {
                readonly title: "Map location";
                readonly description: "This affects both the card and nearby search in the catalog.";
            };
            readonly preview: {
                readonly title: "Card preview";
                readonly coverPlaceholder: "The cover will appear here";
                readonly titlePlaceholder: "Venue title";
                readonly cityPlaceholder: "City";
                readonly guestsUpTo: "up to {capacity} guests";
                readonly perHour: "/hour";
                readonly perDay: "/day";
                readonly noPrice: "Price not specified";
                readonly descriptionPlaceholder: "A short description helps people quickly understand the venue's strengths.";
                readonly addressPlaceholder: "Address will appear after filling";
            };
            readonly delete: "Delete venue";
            readonly deleteTitle: "Delete venue?";
            readonly unnamed: "untitled";
        };
    };
};
//# sourceMappingURL=workspace.d.ts.map