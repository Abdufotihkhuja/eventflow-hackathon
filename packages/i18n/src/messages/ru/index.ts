import { admin } from "./admin.js";
import { actions } from "./actions.js";
import { billing } from "./billing.js";
import { blog } from "./blog.js";
import { checkout } from "./checkout.js";
import { cities } from "./cities.js";
import { common } from "./common.js";
import { confirmations } from "./confirmations.js";
import { contacts } from "./contacts.js";
import { dashboard } from "./dashboard.js";
import { events } from "./events.js";
import { filters } from "./filters.js";
import { navigation } from "./navigation.js";
import { permissions } from "./permissions.js";
import { places } from "./places.js";
import { pricing } from "./pricing.js";
import { profile } from "./profile.js";
import { publicMessages } from "./public.js";
import { registrations } from "./registrations.js";
import { roles } from "./roles.js";
import { security } from "./security.js";
import { settings } from "./settings.js";
import { statuses } from "./statuses.js";
import { tables } from "./tables.js";
import { tasks } from "./tasks.js";
import { ticket } from "./ticket.js";
import { toasts } from "./toasts.js";
import { users } from "./users.js";
import { validation } from "./validation.js";
import { workspace } from "./workspace.js";

export const messages = {
  admin,
  billing,
  checkout,
  cities,
  common,
  contacts,
  actions,
  navigation,
  validation,
  statuses,
  roles,
  permissions,
  workspace,
  dashboard,
  events,
  registrations,
  users,
  profile,
  public: publicMessages,
  security,
  settings,
  places,
  pricing,
  tasks,
  blog,
  filters,
  tables,
  ticket,
  toasts,
  confirmations,
} as const;
