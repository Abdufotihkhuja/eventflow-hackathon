import {
  EventRecipientStatus,
  EventRecipientRoleAssignmentStatus,
  EventRecipientRoleKind,
  EventRecipientRoleSourceType,
  EventRecipientSourceType,
  ParticipantRole,
  UserType,
} from '@prisma/client';
import {
  ArtifactRecipientsService,
  BUILT_IN_RECIPIENT_ROLES,
} from './artifact-recipients.service';
import {
  ArtifactTemplateStatus,
  ArtifactTemplateSummaryArtifactType,
} from './dto';

type Row = Record<string, any>;

class FakeArtifactRecipientsPrisma {
  events: Row[] = [{ id: 'event-1', title: 'Event One', organizationId: 'org-1' }];
  roles: Row[] = [];
  recipients: Row[] = [];
  sources: Row[] = [];
  assignments: Row[] = [];
  certificateTemplates: Row[] = [];
  badgeTemplates: Row[] = [];
  certificates: Row[] = [];
  registrations: Row[] = [];
  speakers: Row[] = [];

  private seq = 0;

  event = {
    findUnique: jest.fn(async ({ where }: any) =>
      this.events.find((event) => event.id === where.id) ?? null,
    ),
    findMany: jest.fn(async () => this.events),
  };

  eventRecipientRole = {
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const key = where.eventId_code;
      const existing = this.roles.find(
        (role) => role.eventId === key.eventId && role.code === key.code,
      );
      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        return existing;
      }
      const role = {
        id: this.nextId('role'),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...create,
      };
      this.roles.push(role);
      return role;
    }),
    findMany: jest.fn(async ({ where }: any) =>
      this.roles
        .filter((role) => {
          if (where.eventId && role.eventId !== where.eventId) return false;
          if (where.isActive !== undefined && role.isActive !== where.isActive) {
            return false;
          }
          if (where.OR) {
            return where.OR.some((clause: any) => {
              if (clause.id?.in) return clause.id.in.includes(role.id);
              if (clause.code?.in) return clause.code.in.includes(role.code);
              return false;
            });
          }
          return true;
        })
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder ||
            String(a.displayName).localeCompare(String(b.displayName)) ||
            String(a.code).localeCompare(String(b.code)),
        ),
    ),
    findUnique: jest.fn(async ({ where }: any) => {
      const key = where.eventId_code;
      if (key) {
        return (
          this.roles.find(
            (role) => role.eventId === key.eventId && role.code === key.code,
          ) ?? null
        );
      }
      return this.roles.find((role) => role.id === where.id) ?? null;
    }),
    findFirst: jest.fn(async ({ where }: any) =>
      this.roles.find(
        (role) =>
          (!where.id || role.id === where.id) &&
          (!where.eventId || role.eventId === where.eventId),
      ) ?? null,
    ),
    create: jest.fn(async ({ data }: any) => {
      const duplicate = this.roles.find(
        (role) => role.eventId === data.eventId && role.code === data.code,
      );
      if (duplicate) {
        throw new Error('Unique constraint failed on eventId_code');
      }
      const role = {
        id: this.nextId('role'),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      this.roles.push(role);
      return role;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const role = this.roles.find((row) => row.id === where.id);
      if (!role) throw new Error(`Role not found: ${where.id}`);
      Object.assign(role, data, { updatedAt: new Date() });
      return role;
    }),
  };

  eventRecipient = {
    findUnique: jest.fn(async ({ where }: any) => {
      const key = where.eventId_userId;
      if (!key) return this.recipients.find((row) => row.id === where.id) ?? null;
      return (
        this.recipients.find(
          (recipient) =>
            recipient.eventId === key.eventId && recipient.userId === key.userId,
        ) ?? null
      );
    }),
    findFirst: jest.fn(async (args: any) => {
      const rows = this.filterRecipients(args.where ?? {});
      const row = rows[0] ?? null;
      if (!row) return null;
      if (args.include) {
        const [included] = await this.eventRecipient.findMany({
          where: { id: row.id, eventId: row.eventId },
          include: args.include,
        });
        return included ?? null;
      }
      if (args.select) {
        return this.selectFields(row, args.select);
      }
      return row;
    }),
    findMany: jest.fn(async (args: any) => {
      const where = args.where ?? {};
      let rows = this.filterRecipients(where);

      rows = rows.sort((a, b) =>
        args.orderBy?.[0]?.createdAt === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : String(a.displayName ?? '').localeCompare(String(b.displayName ?? '')),
      );

      if (args.take !== undefined) {
        rows = rows.slice(args.skip ?? 0, (args.skip ?? 0) + args.take);
      }

      if (args.include) {
        rows = rows.map((recipient) => ({
          ...recipient,
          sources: this.sources.filter((source) => {
            const sourceInclude = args.include.sources;
            const sourceWhere =
              typeof sourceInclude === 'object' ? sourceInclude.where : undefined;
            return (
              source.recipientId === recipient.id &&
              (!sourceWhere?.eventId || source.eventId === sourceWhere.eventId)
            );
          }),
          roleAssignments: this.assignments
            .filter(
              (assignment) =>
                assignment.recipientId === recipient.id &&
                this.matchesAssignmentWhere(
                  assignment,
                  (typeof args.include.roleAssignments === 'object'
                    ? args.include.roleAssignments.where
                    : undefined) ?? {
                    status: EventRecipientRoleAssignmentStatus.ACTIVE,
                  },
                ),
            )
            .map((assignment) => ({
              ...assignment,
              role: this.roles.find((role) => role.id === assignment.roleId),
            }))
            .sort((a, b) => a.role.sortOrder - b.role.sortOrder),
        }));
      }

      if (args.select) {
        rows = rows.map((row) => this.selectFields(row, args.select));
      }

      return rows;
    }),
    create: jest.fn(async ({ data, select }: any) => {
      const recipient = {
        id: this.nextId('recipient'),
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
        ...data,
      };
      this.recipients.push(recipient);
      return select ? { id: recipient.id } : recipient;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const recipient = this.recipients.find((row) => row.id === where.id);
      if (!recipient) throw new Error(`Recipient not found: ${where.id}`);
      if (data.user?.connect?.id) {
        recipient.userId = data.user.connect.id;
        delete data.user;
      }
      Object.assign(recipient, data, { updatedAt: new Date() });
      return recipient;
    }),
    count: jest.fn(async ({ where }: any) => this.filterRecipients(where).length),
  };

  eventRecipientSource = {
    findMany: jest.fn(async ({ where }: any) =>
      this.sources.filter(
        (source) =>
          (!where.eventId || source.eventId === where.eventId) &&
          (!where.sourceType?.in || where.sourceType.in.includes(source.sourceType)),
      ),
    ),
    findUnique: jest.fn(async ({ where, select }: any) => {
      const key = where.eventId_sourceType_sourceId;
      const source =
        this.sources.find(
          (candidate) =>
            candidate.eventId === key.eventId &&
            candidate.sourceType === key.sourceType &&
            candidate.sourceId === key.sourceId,
        ) ?? null;
      return source && select ? { recipientId: source.recipientId } : source;
    }),
    count: jest.fn(async ({ where }: any) =>
      this.sources.filter(
        (source) =>
          (!where.recipientId || source.recipientId === where.recipientId) &&
          (!where.eventId || source.eventId === where.eventId) &&
          (!where.sourceType || source.sourceType === where.sourceType),
      )
        .length,
    ),
    findFirst: jest.fn(async ({ where, select }: any) => {
      const source =
        this.sources.find(
          (candidate) =>
            (!where.eventId || candidate.eventId === where.eventId) &&
            (!where.recipientId || candidate.recipientId === where.recipientId) &&
            (!where.sourceType || candidate.sourceType === where.sourceType),
        ) ?? null;
      return source && select ? this.selectFields(source, select) : source;
    }),
    create: jest.fn(async ({ data }: any) => {
      const source = {
        id: this.nextId('source'),
        createdAt: new Date(),
        ...data,
      };
      this.sources.push(source);
      return source;
    }),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const key = where.eventId_sourceType_sourceId;
      const existing = this.sources.find(
        (candidate) =>
          candidate.eventId === key.eventId &&
          candidate.sourceType === key.sourceType &&
          candidate.sourceId === key.sourceId,
      );
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      const source = {
        id: this.nextId('source'),
        createdAt: new Date(),
        ...create,
      };
      this.sources.push(source);
      return source;
    }),
  };

  eventRecipientRoleAssignment = {
    findMany: jest.fn(async ({ where }: any) =>
      this.assignments.filter(
        (assignment) => !where.eventId || assignment.eventId === where.eventId,
      ),
    ),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const key = where.recipientId_roleId;
      const existing = this.assignments.find(
        (assignment) =>
          assignment.recipientId === key.recipientId &&
          assignment.roleId === key.roleId,
      );
      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        return {
          ...existing,
          role: this.roles.find((role) => role.id === existing.roleId),
        };
      }
      const assignment = {
        id: this.nextId('assignment'),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...create,
      };
      this.assignments.push(assignment);
      return {
        ...assignment,
        role: this.roles.find((role) => role.id === assignment.roleId),
      };
    }),
    findFirst: jest.fn(async ({ where, include }: any) => {
      const assignment =
        this.assignments.find(
          (candidate) =>
            (!where.eventId || candidate.eventId === where.eventId) &&
            (!where.recipientId || candidate.recipientId === where.recipientId) &&
            (!where.roleId || candidate.roleId === where.roleId),
        ) ?? null;
      if (!assignment || !include?.role) return assignment;
      return {
        ...assignment,
        role: this.roles.find((role) => role.id === assignment.roleId),
      };
    }),
    update: jest.fn(async ({ where, data, include }: any) => {
      const assignment = this.assignments.find((row) => row.id === where.id);
      if (!assignment) throw new Error(`Assignment not found: ${where.id}`);
      Object.assign(assignment, data, { updatedAt: new Date() });
      if (!include?.role) return assignment;
      return {
        ...assignment,
        role: this.roles.find((role) => role.id === assignment.roleId),
      };
    }),
    count: jest.fn(async ({ where }: any) =>
      this.assignments.filter(
        (assignment) =>
          (!where.eventId || assignment.eventId === where.eventId) &&
          (!where.roleId || assignment.roleId === where.roleId) &&
          (!where.status || assignment.status === where.status),
      ).length,
    ),
  };

  certificateTemplate = {
    findMany: jest.fn(async ({ where }: any) =>
      this.certificateTemplates
        .filter((template) => !where.eventId || template.eventId === where.eventId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    ),
    count: jest.fn(async ({ where }: any) =>
      this.certificateTemplates.filter(
        (template) =>
          (!where.eventId || template.eventId === where.eventId) &&
          (!where.recipientRoleId ||
            template.recipientRoleId === where.recipientRoleId),
      ).length,
    ),
  };

  badgeTemplate = {
    findMany: jest.fn(async ({ where }: any) =>
      this.badgeTemplates
        .filter((template) => !where.eventId || template.eventId === where.eventId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    ),
    count: jest.fn(async ({ where }: any) =>
      this.badgeTemplates.filter(
        (template) =>
          (!where.eventId || template.eventId === where.eventId) &&
          (!where.recipientRoleId ||
            template.recipientRoleId === where.recipientRoleId),
      ).length,
    ),
  };

  certificate = {
    count: jest.fn(async ({ where }: any) =>
      this.certificates.filter(
        (certificate) =>
          (!where.eventId || certificate.eventId === where.eventId) &&
          (!where.recipientRoleId ||
            certificate.recipientRoleId === where.recipientRoleId),
      ).length,
    ),
  };

  registration = {
    findMany: jest.fn(async ({ where }: any) =>
      this.registrations.filter(
        (registration) => registration.eventId === where.eventId,
      ),
    ),
  };

  speaker = {
    findMany: jest.fn(async ({ where }: any) =>
      this.speakers.filter((speaker) => speaker.eventId === where.eventId),
    ),
  };

  $transaction = jest.fn(async (operations: Array<Promise<unknown>>) =>
    Promise.all(operations),
  );

  addRegistration(input: {
    id: string;
    userId: string;
    role?: ParticipantRole;
    email?: string;
    firstName?: string;
    lastName?: string;
  }) {
    this.registrations.push({
      id: input.id,
      eventId: 'event-1',
      userId: input.userId,
      role: input.role ?? ParticipantRole.PARTICIPANT,
      createdAt: new Date(),
      user: {
        id: input.userId,
        email: input.email ?? `${input.userId}@example.com`,
        firstName: input.firstName ?? input.userId,
        lastName: input.lastName ?? 'User',
      },
    });
  }

  addSpeaker(input: {
    id: string;
    userId?: string | null;
    invitedEmail?: string | null;
    firstName?: string;
    lastName?: string;
  }) {
    this.speakers.push({
      id: input.id,
      eventId: 'event-1',
      userId: input.userId ?? null,
      invitedEmail: input.invitedEmail ?? null,
      firstName: input.firstName ?? 'Speaker',
      lastName: input.lastName ?? input.id,
      sortOrder: this.speakers.length,
      createdAt: new Date(),
      user: input.userId
        ? {
            id: input.userId,
            email: input.invitedEmail ?? `${input.userId}@example.com`,
            firstName: input.firstName ?? 'Speaker',
            lastName: input.lastName ?? input.id,
          }
        : null,
    });
  }

  addCertificateTemplate(input: {
    id?: string;
    eventId?: string;
    recipientRoleId?: string | null;
    recipientRole?: ParticipantRole;
    name?: string;
    isDefault?: boolean;
    isActive?: boolean;
    sizePreset?: string;
  }) {
    const createdAt = new Date(Date.now() + this.certificateTemplates.length);
    const template = {
      id: input.id ?? this.nextId('certificate-template'),
      eventId: input.eventId ?? 'event-1',
      recipientRoleId: input.recipientRoleId ?? null,
      recipientRole: input.recipientRole ?? ParticipantRole.PARTICIPANT,
      name: input.name ?? 'Certificate Template',
      sizePreset: input.sizePreset ?? 'A4_LANDSCAPE',
      isDefault: input.isDefault ?? false,
      isActive: input.isActive ?? true,
      createdAt,
      updatedAt: createdAt,
    };
    this.certificateTemplates.push(template);
    return template;
  }

  addBadgeTemplate(input: {
    id?: string;
    eventId?: string;
    recipientRoleId?: string | null;
    recipientRole?: ParticipantRole;
    name?: string;
    isDefault?: boolean;
    isActive?: boolean;
    sizePreset?: string;
  }) {
    const createdAt = new Date(Date.now() + this.badgeTemplates.length);
    const template = {
      id: input.id ?? this.nextId('badge-template'),
      eventId: input.eventId ?? 'event-1',
      recipientRoleId: input.recipientRoleId ?? null,
      recipientRole: input.recipientRole ?? ParticipantRole.PARTICIPANT,
      name: input.name ?? 'Badge Template',
      sizePreset: input.sizePreset ?? 'BADGE_85X55',
      isDefault: input.isDefault ?? false,
      isActive: input.isActive ?? true,
      createdAt,
      updatedAt: createdAt,
    };
    this.badgeTemplates.push(template);
    return template;
  }

  private filterRecipients(where: any) {
    return this.recipients.filter((recipient) => {
      if (where.id && typeof where.id === 'string' && recipient.id !== where.id) {
        return false;
      }
      if (where.id?.not && recipient.id === where.id.not) return false;
      if (where.eventId && recipient.eventId !== where.eventId) return false;
      if (where.userId !== undefined && recipient.userId !== where.userId) {
        return false;
      }
      if (where.status && recipient.status !== where.status) return false;
      if (
        where.emailNormalized &&
        recipient.emailNormalized !== where.emailNormalized
      ) {
        return false;
      }
      if (where.OR && !this.matchesOr(recipient, where.OR)) return false;
      if (where.roleAssignments?.some) {
        const roleWhere = where.roleAssignments.some;
        const hasRole = this.assignments.some((assignment) => {
          return (
            assignment.recipientId === recipient.id &&
            this.matchesAssignmentWhere(assignment, roleWhere)
          );
        });
        if (!hasRole) return false;
      }
      return true;
    });
  }

  private matchesAssignmentWhere(assignment: Row, where: any) {
    const role = this.roles.find((candidate) => candidate.id === assignment.roleId);
    return (
      (!where.eventId || assignment.eventId === where.eventId) &&
      (!where.status || assignment.status === where.status) &&
      (!where.roleId || assignment.roleId === where.roleId) &&
      (!where.role?.eventId || role?.eventId === where.role.eventId) &&
      (!where.role?.code || role?.code === where.role.code)
    );
  }

  private selectFields(row: Row, select: Record<string, boolean>) {
    return Object.fromEntries(
      Object.entries(select)
        .filter(([, include]) => include)
        .map(([field]) => [field, row[field]]),
    );
  }

  private matchesOr(recipient: Row, clauses: any[]) {
    return clauses.some((clause) => {
      const [field, condition] = Object.entries(clause)[0] as [string, any];
      if (!condition || typeof condition !== 'object' || !('contains' in condition)) {
        return recipient[field] === condition;
      }
      return String(recipient[field] ?? '')
        .toLowerCase()
        .includes(String(condition.contains).toLowerCase());
    });
  }

  private nextId(prefix: string) {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }
}

describe('ArtifactRecipientsService', () => {
  const user = {
    sub: 'org-1',
    type: UserType.ORGANIZATION,
  } as never;

  function createService() {
    const prisma = new FakeArtifactRecipientsPrisma();
    return {
      prisma,
      service: new ArtifactRecipientsService(prisma as never),
    };
  }

  it('creates built-in recipient roles per event idempotently', async () => {
    const { prisma, service } = createService();

    await service.ensureBuiltInRolesForEvent('event-1');
    await service.ensureBuiltInRolesForEvent('event-1');

    expect(prisma.roles).toHaveLength(BUILT_IN_RECIPIENT_ROLES.length);
    expect(prisma.roles.map((role) => role.code)).toEqual([
      'participant',
      'speaker',
      'mentor',
      'staff',
      'vip',
      'sponsor',
      'volunteer',
      'organizer',
    ]);
    expect(prisma.roles).toEqual(
      expect.arrayContaining(
        BUILT_IN_RECIPIENT_ROLES.map((role) =>
          expect.objectContaining({
            code: role.code,
            displayName: role.displayName,
            kind: EventRecipientRoleKind.BUILT_IN,
            builtInKey: role.builtInKey,
            sortOrder: role.sortOrder,
            isActive: true,
            isArtifactEligible: true,
          }),
        ),
      ),
    );
  });

  it('backfills participant recipients from registrations', async () => {
    const { prisma, service } = createService();
    prisma.addRegistration({ id: 'registration-1', userId: 'user-1' });

    await service.backfillEventRecipients('event-1');

    expect(prisma.recipients).toHaveLength(1);
    expect(prisma.sources).toEqual([
      expect.objectContaining({
        sourceType: EventRecipientSourceType.REGISTRATION,
        sourceId: 'registration-1',
      }),
    ]);
    expect(activeRoleCodes(prisma)).toEqual(['participant']);
  });

  it('backfills speaker recipients from speakers', async () => {
    const { prisma, service } = createService();
    prisma.addSpeaker({ id: 'speaker-1', invitedEmail: 'speaker@example.com' });

    await service.backfillEventRecipients('event-1');

    expect(prisma.recipients).toHaveLength(1);
    expect(prisma.sources[0]).toMatchObject({
      sourceType: EventRecipientSourceType.SPEAKER,
      sourceId: 'speaker-1',
    });
    expect(activeRoleCodes(prisma)).toEqual(['speaker']);
  });

  it('keeps the same user with registration and speaker as one recipient with two roles', async () => {
    const { prisma, service } = createService();
    prisma.addRegistration({ id: 'registration-1', userId: 'user-1' });
    prisma.addSpeaker({
      id: 'speaker-1',
      userId: 'user-1',
      invitedEmail: 'user-1@example.com',
    });

    await service.backfillEventRecipients('event-1');

    expect(prisma.recipients).toHaveLength(1);
    expect(prisma.sources).toHaveLength(2);
    expect(activeRoleCodes(prisma).sort()).toEqual(['participant', 'speaker']);
  });

  it('creates speaker recipients for manual speakers without registrations', async () => {
    const { prisma, service } = createService();
    prisma.addSpeaker({
      id: 'speaker-1',
      firstName: 'Manual',
      lastName: 'Speaker',
    });

    await service.backfillEventRecipients('event-1');

    expect(prisma.recipients).toEqual([
      expect.objectContaining({
        userId: null,
        email: null,
        displayName: 'Manual Speaker',
      }),
    ]);
    expect(activeRoleCodes(prisma)).toEqual(['speaker']);
  });

  it('does not create duplicate source links on repeated backfill', async () => {
    const { prisma, service } = createService();
    prisma.addRegistration({ id: 'registration-1', userId: 'user-1' });
    prisma.addSpeaker({ id: 'speaker-1', invitedEmail: 'speaker@example.com' });

    await service.backfillEventRecipients('event-1');
    await service.backfillEventRecipients('event-1');

    expect(prisma.sources).toHaveLength(2);
  });

  it('writes nothing on repeated backfill when sources did not change', async () => {
    const { prisma, service } = createService();
    prisma.addRegistration({
      id: 'registration-1',
      userId: 'user-1',
      role: ParticipantRole.SPEAKER,
    });
    prisma.addRegistration({ id: 'registration-2', userId: 'user-2' });
    prisma.addSpeaker({ id: 'speaker-1', invitedEmail: 'speaker@example.com' });
    await service.backfillEventRecipients('event-1');
    jest.clearAllMocks();

    await service.backfillEventRecipients('event-1');

    expect(prisma.eventRecipient.create).not.toHaveBeenCalled();
    expect(prisma.eventRecipient.update).not.toHaveBeenCalled();
    expect(prisma.eventRecipientSource.upsert).not.toHaveBeenCalled();
    expect(prisma.eventRecipientRoleAssignment.upsert).not.toHaveBeenCalled();
    // No per-row lookups either: current state is read in bulk.
    expect(prisma.eventRecipient.findUnique).not.toHaveBeenCalled();
    expect(prisma.eventRecipientSource.findUnique).not.toHaveBeenCalled();
  });

  it('still syncs profile changes and reactivates source roles on repeated backfill', async () => {
    const { prisma, service } = createService();
    prisma.addRegistration({ id: 'registration-1', userId: 'user-1', firstName: 'Old' });
    await service.backfillEventRecipients('event-1');
    prisma.registrations[0].user.firstName = 'New';
    prisma.assignments[0].status = EventRecipientRoleAssignmentStatus.INACTIVE;

    await service.backfillEventRecipients('event-1');

    expect(prisma.recipients[0]).toMatchObject({ firstName: 'New' });
    expect(activeRoleCodes(prisma)).toEqual(['participant']);
  });

  it('picks up a registration added after the first backfill', async () => {
    const { prisma, service } = createService();
    prisma.addRegistration({ id: 'registration-1', userId: 'user-1' });
    await service.backfillEventRecipients('event-1');
    prisma.addRegistration({ id: 'registration-2', userId: 'user-2' });

    await service.backfillEventRecipients('event-1');

    expect(prisma.recipients).toHaveLength(2);
    expect(prisma.sources).toHaveLength(2);
    expect(prisma.assignments).toHaveLength(2);
  });

  it('keeps role assignments idempotent on repeated backfill', async () => {
    const { prisma, service } = createService();
    prisma.addRegistration({
      id: 'registration-1',
      userId: 'user-1',
      role: ParticipantRole.SPEAKER,
    });

    await service.backfillEventRecipients('event-1');
    await service.backfillEventRecipients('event-1');

    expect(prisma.assignments).toHaveLength(2);
    expect(activeRoleCodes(prisma).sort()).toEqual(['participant', 'speaker']);
  });

  it('keeps participant and adds mentor for legacy mentor registrations', async () => {
    const { prisma, service } = createService();
    prisma.addRegistration({
      id: 'registration-1',
      userId: 'user-1',
      role: ParticipantRole.MENTOR,
    });

    await service.backfillEventRecipients('event-1');

    expect(activeRoleCodes(prisma).sort()).toEqual(['mentor', 'participant']);
  });

  it('matches speaker to registration by normalized email when no user id is present', async () => {
    const { prisma, service } = createService();
    prisma.addRegistration({
      id: 'registration-1',
      userId: 'user-1',
      email: 'person@example.com',
    });
    prisma.addSpeaker({
      id: 'speaker-1',
      invitedEmail: ' PERSON@example.com ',
    });

    await service.backfillEventRecipients('event-1');

    expect(prisma.recipients).toHaveLength(1);
    expect(prisma.sources).toHaveLength(2);
    expect(activeRoleCodes(prisma).sort()).toEqual(['participant', 'speaker']);
  });

  it('does not merge different users that share an email snapshot', async () => {
    const { prisma, service } = createService();
    prisma.addRegistration({
      id: 'registration-1',
      userId: 'user-1',
      email: 'shared@example.com',
    });
    prisma.addSpeaker({
      id: 'speaker-1',
      userId: 'user-2',
      invitedEmail: 'shared@example.com',
    });

    await service.backfillEventRecipients('event-1');

    expect(prisma.recipients).toHaveLength(2);
    expect(
      prisma.recipients.map((recipient) => recipient.userId).sort(),
    ).toEqual(['user-1', 'user-2']);
  });

  it('keeps same-name speakers without email as separate recipients', async () => {
    const { prisma, service } = createService();
    prisma.addSpeaker({ id: 'speaker-1', firstName: 'Alex', lastName: 'Lee' });
    prisma.addSpeaker({ id: 'speaker-2', firstName: 'Alex', lastName: 'Lee' });

    await service.backfillEventRecipients('event-1');

    expect(prisma.recipients).toHaveLength(2);
    expect(prisma.sources.map((source) => source.sourceId).sort()).toEqual([
      'speaker-1',
      'speaker-2',
    ]);
  });

  it('syncs recipients only when listing the first page', async () => {
    const { service, prisma } = createService();
    prisma.addRegistration({ id: 'registration-1', userId: 'user-1' });

    await service.findArtifactRecipients('event-1', { page: 2, limit: 20 }, user);
    expect(prisma.registration.findMany).not.toHaveBeenCalled();

    await service.findArtifactRecipients('event-1', { page: 1, limit: 20 }, user);
    expect(prisma.registration.findMany).toHaveBeenCalledTimes(1);
  });

  it('filters artifact recipients by role code', async () => {
    const { service, prisma } = createService();
    prisma.addRegistration({ id: 'registration-1', userId: 'user-1' });
    prisma.addSpeaker({ id: 'speaker-1', invitedEmail: 'speaker@example.com' });

    const page = await service.findArtifactRecipients(
      'event-1',
      { roleCode: 'speaker', page: 1, limit: 20 },
      user,
    );

    expect(page.total).toBe(1);
    expect(page.data[0].roles.map((role) => role.code)).toEqual(['speaker']);
    expect(page.data[0].sources.speakerId).toBe('speaker-1');
  });

  it('filters artifact recipients by role id', async () => {
    const { service, prisma } = createService();
    prisma.addRegistration({ id: 'registration-1', userId: 'user-1' });
    prisma.addSpeaker({ id: 'speaker-1', invitedEmail: 'speaker@example.com' });

    await service.backfillEventRecipients('event-1');
    const speakerRole = prisma.roles.find((role) => role.code === 'speaker');

    const page = await service.findArtifactRecipients(
      'event-1',
      { roleId: speakerRole?.id, page: 1, limit: 20 },
      user,
    );

    expect(page.total).toBe(1);
    expect(page.data[0].sources.speakerId).toBe('speaker-1');
  });

  it('filters artifact recipients by status', async () => {
    const { service, prisma } = createService();
    prisma.addRegistration({ id: 'registration-1', userId: 'user-1' });

    await service.backfillEventRecipients('event-1');
    prisma.recipients[0].status = EventRecipientStatus.ARCHIVED;

    const page = await service.findArtifactRecipients(
      'event-1',
      { status: EventRecipientStatus.ACTIVE, page: 1, limit: 20 },
      user,
    );

    expect(page.total).toBe(0);
  });

  it('searches artifact recipients by name and email', async () => {
    const { service, prisma } = createService();
    prisma.addRegistration({
      id: 'registration-1',
      userId: 'user-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    });

    const page = await service.findArtifactRecipients(
      'event-1',
      { search: 'love', page: 1, limit: 20 },
      user,
    );

    expect(page.total).toBe(1);
    expect(page.data[0].displayName).toBe('Ada Lovelace');
  });

  it('does not match role filters through assignments from another event', async () => {
    const { service, prisma } = createService();
    prisma.events.push({
      id: 'event-2',
      title: 'Event Two',
      organizationId: 'org-1',
    });
    prisma.addRegistration({ id: 'registration-1', userId: 'user-1' });

    await service.backfillEventRecipients('event-1');
    await service.ensureBuiltInRolesForEvent('event-2');

    const eventTwoSpeakerRole = prisma.roles.find(
      (role) => role.eventId === 'event-2' && role.code === 'speaker',
    );
    prisma.assignments.push({
      id: 'assignment-cross-event',
      eventId: 'event-2',
      recipientId: prisma.recipients[0].id,
      roleId: eventTwoSpeakerRole?.id,
      status: EventRecipientRoleAssignmentStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const page = await service.findArtifactRecipients(
      'event-1',
      { roleId: eventTwoSpeakerRole?.id, page: 1, limit: 20 },
      user,
    );

    expect(page.total).toBe(0);
  });

  it('paginates artifact recipients', async () => {
    const { service, prisma } = createService();
    prisma.addRegistration({ id: 'registration-1', userId: 'user-1', firstName: 'A' });
    prisma.addRegistration({ id: 'registration-2', userId: 'user-2', firstName: 'B' });
    prisma.addRegistration({ id: 'registration-3', userId: 'user-3', firstName: 'C' });
    await service.findArtifactRecipients('event-1', { page: 1, limit: 2 }, user);

    const page = await service.findArtifactRecipients(
      'event-1',
      { page: 2, limit: 2 },
      user,
    );

    expect(page.total).toBe(3);
    expect(page.page).toBe(2);
    expect(page.data).toHaveLength(1);
  });

  it('returns recipient roles in built-in sort order', async () => {
    const { service } = createService();

    const roles = await service.findRecipientRoles('event-1', user);

    expect(roles.map((role) => role.code)).toEqual([
      'participant',
      'speaker',
      'mentor',
      'staff',
      'vip',
      'sponsor',
      'volunteer',
      'organizer',
    ]);
  });

  it('creates custom recipient roles per event', async () => {
    const { service, prisma } = createService();

    const role = await service.createRecipientRole(
      'event-1',
      {
        code: 'press',
        displayName: 'Press',
        sortOrder: 80,
        isArtifactEligible: true,
      },
      user,
    );

    expect(role).toEqual(
      expect.objectContaining({
        code: 'press',
        displayName: 'Press',
        kind: EventRecipientRoleKind.CUSTOM,
        builtInKey: null,
        sortOrder: 80,
        isActive: true,
        isArtifactEligible: true,
      }),
    );
    expect(prisma.roles.filter((item) => item.code === 'press')).toHaveLength(1);
  });

  it('rejects duplicate custom role code in the same event', async () => {
    const { service } = createService();

    await service.createRecipientRole(
      'event-1',
      { code: 'press', displayName: 'Press' },
      user,
    );

    await expect(
      service.createRecipientRole(
        'event-1',
        { code: 'press', displayName: 'Press team' },
        user,
      ),
    ).rejects.toThrow('already exists');
  });

  it('allows the same custom role code in different events', async () => {
    const { service, prisma } = createService();
    prisma.events.push({
      id: 'event-2',
      title: 'Event Two',
      organizationId: 'org-1',
    });

    await service.createRecipientRole(
      'event-1',
      { code: 'press', displayName: 'Press' },
      user,
    );
    await service.createRecipientRole(
      'event-2',
      { code: 'press', displayName: 'Press' },
      user,
    );

    expect(prisma.roles.filter((role) => role.code === 'press')).toHaveLength(2);
  });

  it('rejects invalid role codes and built-in code collisions', async () => {
    const { service } = createService();

    await expect(
      service.createRecipientRole(
        'event-1',
        { code: 'Press', displayName: 'Press' },
        user,
      ),
    ).rejects.toThrow('lowercase slug');

    await expect(
      service.createRecipientRole(
        'event-1',
        { code: 'VIP Guest', displayName: 'VIP Guest' },
        user,
      ),
    ).rejects.toThrow('lowercase slug');

    await expect(
      service.createRecipientRole(
        'event-1',
        { code: 'vip--guest', displayName: 'VIP Guest' },
        user,
      ),
    ).rejects.toThrow('lowercase slug');

    await expect(
      service.createRecipientRole(
        'event-1',
        { code: 'speaker', displayName: 'Speaker copy' },
        user,
      ),
    ).rejects.toThrow('reserved');
  });

  it('updates custom role display name, sort order, and artifact eligibility', async () => {
    const { service } = createService();
    const role = await service.createRecipientRole(
      'event-1',
      { code: 'press', displayName: 'Press' },
      user,
    );

    const updated = await service.updateRecipientRole(
      'event-1',
      role.id,
      {
        displayName: 'Media',
        sortOrder: 90,
        isArtifactEligible: false,
      },
      user,
    );

    expect(updated).toEqual(
      expect.objectContaining({
        code: 'press',
        displayName: 'Media',
        sortOrder: 90,
        isArtifactEligible: false,
      }),
    );
  });

  it('deactivates and activates custom roles without deleting linked data', async () => {
    const { service, prisma } = createService();
    const role = await service.createRecipientRole(
      'event-1',
      { code: 'press', displayName: 'Press' },
      user,
    );
    prisma.assignments.push({
      id: 'assignment-1',
      eventId: 'event-1',
      recipientId: 'recipient-1',
      roleId: role.id,
      status: EventRecipientRoleAssignmentStatus.ACTIVE,
    });

    const deactivated = await service.deactivateRecipientRole(
      'event-1',
      role.id,
      user,
    );
    expect(deactivated.isActive).toBe(false);

    const activated = await service.activateRecipientRole(
      'event-1',
      role.id,
      user,
    );

    expect(activated.isActive).toBe(true);
    expect(prisma.assignments).toHaveLength(1);
  });

  it('rejects built-in role updates, deactivation, and immutable field changes', async () => {
    const { service, prisma } = createService();
    await service.ensureBuiltInRolesForEvent('event-1');
    const speakerRole = prisma.roles.find((role) => role.code === 'speaker');

    await expect(
      service.updateRecipientRole(
        'event-1',
        speakerRole!.id,
        { displayName: 'Presenters' },
        user,
      ),
    ).rejects.toThrow('Built-in recipient roles cannot be edited');

    await expect(
      service.deactivateRecipientRole('event-1', speakerRole!.id, user),
    ).rejects.toThrow('Built-in recipient roles cannot be deactivated');

    await expect(
      service.updateRecipientRole(
        'event-1',
        speakerRole!.id,
        { code: 'presenter' } as never,
        user,
      ),
    ).rejects.toThrow('cannot be changed');
  });

  it('returns blocked delete preview for built-in roles', async () => {
    const { service, prisma } = createService();
    await service.ensureBuiltInRolesForEvent('event-1');
    const speakerRole = prisma.roles.find((role) => role.code === 'speaker');

    const preview = await service.previewRecipientRoleDelete(
      'event-1',
      speakerRole!.id,
      user,
    );

    expect(preview).toEqual(
      expect.objectContaining({
        isBuiltIn: true,
        recommendedAction: 'BLOCKED',
        blockingReasons: ['Built-in recipient roles cannot be deleted'],
      }),
    );
  });

  it('recommends deactivation for custom roles with linked data', async () => {
    const { service, prisma } = createService();
    const role = await service.createRecipientRole(
      'event-1',
      { code: 'press', displayName: 'Press' },
      user,
    );
    prisma.assignments.push({
      id: 'assignment-1',
      eventId: 'event-1',
      recipientId: 'recipient-1',
      roleId: role.id,
      status: EventRecipientRoleAssignmentStatus.ACTIVE,
    });
    prisma.assignments.push({
      id: 'assignment-2',
      eventId: 'event-1',
      recipientId: 'recipient-2',
      roleId: role.id,
      status: EventRecipientRoleAssignmentStatus.INACTIVE,
    });
    prisma.certificateTemplates.push({
      id: 'certificate-template-1',
      eventId: 'event-1',
      recipientRoleId: role.id,
    });
    prisma.badgeTemplates.push({
      id: 'badge-template-1',
      eventId: 'event-1',
      recipientRoleId: role.id,
    });
    prisma.certificates.push({
      id: 'certificate-1',
      eventId: 'event-1',
      recipientRoleId: role.id,
    });

    const preview = await service.previewRecipientRoleDelete(
      'event-1',
      role.id,
      user,
    );

    expect(preview.counts).toEqual({
      activeAssignments: 1,
      inactiveAssignments: 1,
      certificateTemplates: 1,
      badgeTemplates: 1,
      certificates: 1,
    });
    expect(preview.recommendedAction).toBe('DEACTIVATE');
    expect(preview.blockingReasons).toEqual(
      expect.arrayContaining([
        'Role has active recipient assignments',
        'Role is used by certificate templates',
        'Role is used by generated certificates',
      ]),
    );
  });

  it('marks custom roles with no links as safe to delete in preview', async () => {
    const { service } = createService();
    const role = await service.createRecipientRole(
      'event-1',
      { code: 'press', displayName: 'Press' },
      user,
    );

    const preview = await service.previewRecipientRoleDelete(
      'event-1',
      role.id,
      user,
    );

    expect(preview.recommendedAction).toBe('SAFE_TO_DELETE');
    expect(preview.blockingReasons).toEqual([]);
  });

  it('rejects role mutations across event boundaries', async () => {
    const { service, prisma } = createService();
    prisma.events.push({
      id: 'event-2',
      title: 'Event Two',
      organizationId: 'org-1',
    });
    const role = await service.createRecipientRole(
      'event-1',
      { code: 'press', displayName: 'Press' },
      user,
    );

    await expect(
      service.updateRecipientRole(
        'event-2',
        role.id,
        { displayName: 'Media' },
        user,
      ),
    ).rejects.toThrow('not found for this event');
  });

  it('returns built-in roles in template summary sort order', async () => {
    const { service } = createService();

    const summary = await service.getArtifactTemplateSummary('event-1', {}, user);

    expect(summary.roles.map((role) => role.roleCode)).toEqual([
      'participant',
      'speaker',
      'mentor',
      'staff',
      'vip',
      'sponsor',
      'volunteer',
      'organizer',
    ]);
    expect(summary.roles[0]).toMatchObject({
      roleCode: 'participant',
      assignmentCount: 0,
      activeAssignmentCount: 0,
      certificateTemplateSummary: expect.objectContaining({
        templateStatus: ArtifactTemplateStatus.MISSING,
      }),
      badgeTemplateSummary: expect.objectContaining({
        templateStatus: ArtifactTemplateStatus.MISSING,
      }),
    });
  });

  it('includes custom roles in template summary', async () => {
    const { service } = createService();
    await service.createRecipientRole(
      'event-1',
      { code: 'press', displayName: 'Press', sortOrder: 80 },
      user,
    );

    const summary = await service.getArtifactTemplateSummary('event-1', {}, user);

    expect(summary.roles.map((role) => role.roleCode)).toContain('press');
  });

  it('uses role code as a stable sort tiebreaker', async () => {
    const { service } = createService();
    await service.createRecipientRole(
      'event-1',
      { code: 'zeta', displayName: 'Same Name', sortOrder: 80 },
      user,
    );
    await service.createRecipientRole(
      'event-1',
      { code: 'alpha', displayName: 'Same Name', sortOrder: 80 },
      user,
    );

    const summary = await service.getArtifactTemplateSummary('event-1', {}, user);

    expect(summary.roles.map((role) => role.roleCode).slice(-2)).toEqual([
      'alpha',
      'zeta',
    ]);
  });

  it('summarizes certificate templates by normalized recipient role', async () => {
    const { service, prisma } = createService();
    const roles = await service.ensureBuiltInRolesForEvent('event-1');
    const participantRole = roles.get('participant')!;
    prisma.addCertificateTemplate({
      recipientRoleId: participantRole.id,
      name: 'Participant Certificate',
      isDefault: true,
      isActive: true,
    });

    const summary = await service.getArtifactTemplateSummary(
      'event-1',
      { artifactType: ArtifactTemplateSummaryArtifactType.CERTIFICATE },
      user,
    );
    const participant = templateRole(summary, 'participant');

    expect(participant.certificateTemplateSummary).toMatchObject({
      defaultTemplateName: 'Participant Certificate',
      hasActiveDefault: true,
      activeTemplateCount: 1,
      inactiveTemplateCount: 0,
      missingTemplate: false,
      templateStatus: ArtifactTemplateStatus.READY,
    });
    expect(participant.badgeTemplateSummary).toBeUndefined();
  });

  it('summarizes badge templates by normalized recipient role', async () => {
    const { service, prisma } = createService();
    const roles = await service.ensureBuiltInRolesForEvent('event-1');
    const vipRole = roles.get('vip')!;
    prisma.addBadgeTemplate({
      recipientRoleId: vipRole.id,
      name: 'VIP Badge',
      isDefault: true,
      isActive: true,
    });

    const summary = await service.getArtifactTemplateSummary(
      'event-1',
      { artifactType: ArtifactTemplateSummaryArtifactType.BADGE },
      user,
    );
    const vip = templateRole(summary, 'vip');

    expect(vip.badgeTemplateSummary).toMatchObject({
      defaultTemplateName: 'VIP Badge',
      activeTemplateCount: 1,
      templateStatus: ArtifactTemplateStatus.READY,
    });
    expect(vip.certificateTemplateSummary).toBeUndefined();
  });

  it('uses legacy recipientRole fallback only when recipientRoleId is absent', async () => {
    const { service, prisma } = createService();
    const roles = await service.ensureBuiltInRolesForEvent('event-1');
    const speakerRole = roles.get('speaker')!;
    prisma.addCertificateTemplate({
      recipientRoleId: null,
      recipientRole: ParticipantRole.SPEAKER,
      name: 'Legacy Speaker Certificate',
      isDefault: true,
      isActive: true,
    });
    prisma.addCertificateTemplate({
      recipientRoleId: speakerRole.id,
      recipientRole: ParticipantRole.PARTICIPANT,
      name: 'Normalized Speaker Certificate',
      isDefault: false,
      isActive: true,
    });

    const summary = await service.getArtifactTemplateSummary(
      'event-1',
      { artifactType: ArtifactTemplateSummaryArtifactType.CERTIFICATE },
      user,
    );
    const speaker = templateRole(summary, 'speaker');

    expect(speaker.certificateTemplateSummary).toMatchObject({
      activeTemplateCount: 2,
      defaultTemplateName: 'Legacy Speaker Certificate',
      templateStatus: ArtifactTemplateStatus.READY,
    });
    expect(
      templateRole(summary, 'participant').certificateTemplateSummary,
    ).toMatchObject({
      activeTemplateCount: 0,
      templateStatus: ArtifactTemplateStatus.MISSING,
    });
    expect(speaker.certificateTemplateSummary?.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Normalized Speaker Certificate',
          recipientRole: ParticipantRole.PARTICIPANT,
          roleCode: 'speaker',
        }),
      ]),
    );
  });

  it('counts inactive templates separately and includes them when requested', async () => {
    const { service, prisma } = createService();
    const roles = await service.ensureBuiltInRolesForEvent('event-1');
    const participantRole = roles.get('participant')!;
    prisma.addCertificateTemplate({
      recipientRoleId: participantRole.id,
      name: 'Active Certificate',
      isDefault: true,
      isActive: true,
    });
    prisma.addCertificateTemplate({
      recipientRoleId: participantRole.id,
      name: 'Inactive Certificate',
      isDefault: false,
      isActive: false,
    });

    const defaultSummary = await service.getArtifactTemplateSummary(
      'event-1',
      { artifactType: ArtifactTemplateSummaryArtifactType.CERTIFICATE },
      user,
    );
    const expandedSummary = await service.getArtifactTemplateSummary(
      'event-1',
      {
        artifactType: ArtifactTemplateSummaryArtifactType.CERTIFICATE,
        includeInactiveTemplates: true,
      },
      user,
    );

    expect(
      templateRole(defaultSummary, 'participant').certificateTemplateSummary,
    ).toMatchObject({
      activeTemplateCount: 1,
      inactiveTemplateCount: 1,
      templates: [expect.objectContaining({ name: 'Active Certificate' })],
    });
    expect(
      templateRole(expandedSummary, 'participant').certificateTemplateSummary
        ?.templates,
    ).toHaveLength(2);
  });

  it('returns INACTIVE_ROLE status for inactive roles', async () => {
    const { service } = createService();
    const role = await service.createRecipientRole(
      'event-1',
      { code: 'press', displayName: 'Press' },
      user,
    );
    await service.deactivateRecipientRole('event-1', role.id, user);

    const summary = await service.getArtifactTemplateSummary(
      'event-1',
      { includeInactiveRoles: true },
      user,
    );

    expect(templateRole(summary, 'press').certificateTemplateSummary).toMatchObject({
      missingTemplate: false,
      templateStatus: ArtifactTemplateStatus.INACTIVE_ROLE,
    });
  });

  it('returns NOT_ARTIFACT_ELIGIBLE status for non-eligible roles', async () => {
    const { service } = createService();
    await service.createRecipientRole(
      'event-1',
      {
        code: 'observer',
        displayName: 'Observer',
        isArtifactEligible: false,
      },
      user,
    );

    const summary = await service.getArtifactTemplateSummary('event-1', {}, user);

    expect(templateRole(summary, 'observer').certificateTemplateSummary).toMatchObject({
      missingTemplate: false,
      templateStatus: ArtifactTemplateStatus.NOT_ARTIFACT_ELIGIBLE,
    });
  });

  it('detects duplicate active defaults defensively', async () => {
    const { service, prisma } = createService();
    const roles = await service.ensureBuiltInRolesForEvent('event-1');
    const participantRole = roles.get('participant')!;
    prisma.addCertificateTemplate({
      recipientRoleId: participantRole.id,
      name: 'Default One',
      isDefault: true,
      isActive: true,
    });
    prisma.addCertificateTemplate({
      recipientRoleId: null,
      recipientRole: ParticipantRole.PARTICIPANT,
      name: 'Default Two',
      isDefault: true,
      isActive: true,
    });

    const summary = await service.getArtifactTemplateSummary(
      'event-1',
      { artifactType: ArtifactTemplateSummaryArtifactType.CERTIFICATE },
      user,
    );

    expect(templateRole(summary, 'participant').certificateTemplateSummary).toMatchObject({
      duplicateActiveDefaultCount: 2,
      templateStatus: ArtifactTemplateStatus.DUPLICATE_DEFAULT,
    });
  });

  it('counts active and inactive assignments for roles', async () => {
    const { service, prisma } = createService();
    const roles = await service.ensureBuiltInRolesForEvent('event-1');
    const vipRole = roles.get('vip')!;
    prisma.assignments.push(
      {
        id: 'assignment-active',
        eventId: 'event-1',
        recipientId: 'recipient-1',
        roleId: vipRole.id,
        status: EventRecipientRoleAssignmentStatus.ACTIVE,
      },
      {
        id: 'assignment-inactive',
        eventId: 'event-1',
        recipientId: 'recipient-2',
        roleId: vipRole.id,
        status: EventRecipientRoleAssignmentStatus.INACTIVE,
      },
    );

    const summary = await service.getArtifactTemplateSummary('event-1', {}, user);

    expect(templateRole(summary, 'vip')).toMatchObject({
      assignmentCount: 2,
      activeAssignmentCount: 1,
    });
  });

  it('does not leak templates or roles across event boundaries', async () => {
    const { service, prisma } = createService();
    prisma.events.push({
      id: 'event-2',
      title: 'Event Two',
      organizationId: 'org-1',
    });
    const event2Role = await service.createRecipientRole(
      'event-2',
      { code: 'press', displayName: 'Press' },
      user,
    );
    prisma.addCertificateTemplate({
      eventId: 'event-2',
      recipientRoleId: event2Role.id,
      name: 'Other Event Certificate',
      isDefault: true,
      isActive: true,
    });

    const summary = await service.getArtifactTemplateSummary('event-1', {}, user);

    expect(summary.roles.map((role) => role.roleCode)).not.toContain('press');
    expect(
      summary.roles.flatMap(
        (role) => role.certificateTemplateSummary?.templates ?? [],
      ),
    ).toEqual([]);
  });

  it('rejects template summary across organization boundaries', async () => {
    const { service, prisma } = createService();
    prisma.events.push({
      id: 'event-2',
      title: 'Event Two',
      organizationId: 'org-2',
    });

    await expect(
      service.getArtifactTemplateSummary('event-2', {}, user),
    ).rejects.toThrow('Нет доступа к этому мероприятию');
  });

  it('creates a manual recipient with normalized email', async () => {
    const { service, prisma } = createService();

    const result = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Ada Lovelace', email: ' ADA@Example.COM ' },
      user,
    );

    expect(result.created).toBe(true);
    expect(result.reused).toBe(false);
    expect(result.recipient.email).toBe('ADA@Example.COM');
    expect(prisma.recipients[0]).toMatchObject({
      displayName: 'Ada Lovelace',
      emailNormalized: 'ada@example.com',
      status: EventRecipientStatus.ACTIVE,
    });
    expect(prisma.sources[0]).toMatchObject({
      sourceType: EventRecipientSourceType.EMAIL,
      emailSnapshot: 'ADA@Example.COM',
    });
  });

  it('creates a manual recipient without email', async () => {
    const { service, prisma } = createService();

    const result = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Desk Guest' },
      user,
    );

    expect(result.created).toBe(true);
    expect(result.recipient.email).toBeNull();
    expect(prisma.sources[0]).toMatchObject({
      sourceType: EventRecipientSourceType.MANUAL,
    });
  });

  it('creates a manual recipient with an initial role id', async () => {
    const { service } = createService();
    const role = await service.createRecipientRole(
      'event-1',
      { code: 'press', displayName: 'Press' },
      user,
    );

    const result = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Press Guest', roleIds: [role.id] },
      user,
    );

    expect(result.recipient.roles).toEqual([
      expect.objectContaining({
        code: 'press',
        assignmentStatus: EventRecipientRoleAssignmentStatus.ACTIVE,
        assignmentSourceType: EventRecipientRoleSourceType.MANUAL,
      }),
    ]);
  });

  it('creates a manual recipient with an initial role code', async () => {
    const { service } = createService();

    const result = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'VIP Guest', roleCodes: ['vip'] },
      user,
    );

    expect(result.recipient.roles.map((role) => role.code)).toEqual(['vip']);
  });

  it('deduplicates initial roles supplied by both id and code', async () => {
    const { service, prisma } = createService();
    const role = await service.createRecipientRole(
      'event-1',
      { code: 'press', displayName: 'Press' },
      user,
    );

    const result = await service.createManualArtifactRecipient(
      'event-1',
      {
        displayName: 'Press Guest',
        roleIds: [role.id],
        roleCodes: ['press'],
      },
      user,
    );

    expect(result.recipient.roles.map((item) => item.code)).toEqual(['press']);
    expect(prisma.assignments).toHaveLength(1);
  });

  it('reuses a safe existing recipient by normalized email', async () => {
    const { service, prisma } = createService();

    const first = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Ada', email: 'ada@example.com' },
      user,
    );
    const second = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Ada Duplicate', email: 'ADA@example.com' },
      user,
    );

    expect(second.created).toBe(false);
    expect(second.reused).toBe(true);
    expect(second.recipient.id).toBe(first.recipient.id);
    expect(prisma.recipients).toHaveLength(1);
  });

  it('does not merge the same email with a different non-null user id', async () => {
    const { service, prisma } = createService();

    await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Known User', email: 'same@example.com', userId: 'user-1' },
      user,
    );
    const result = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Manual Guest', email: 'same@example.com' },
      user,
    );

    expect(result.created).toBe(true);
    expect(prisma.recipients).toHaveLength(2);
  });

  it('does not merge a null-user email match when the same email also belongs to a different user', async () => {
    const { service, prisma } = createService();

    await service.createManualArtifactRecipient(
      'event-1',
      {
        displayName: 'Known User',
        email: 'shared@example.com',
        userId: 'user-1',
      },
      user,
    );
    await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Manual Email', email: 'shared@example.com' },
      user,
    );
    const result = await service.createManualArtifactRecipient(
      'event-1',
      {
        displayName: 'Other Known User',
        email: 'shared@example.com',
        userId: 'user-2',
      },
      user,
    );

    expect(result.created).toBe(true);
    expect(prisma.recipients).toHaveLength(3);
    expect(prisma.recipients.map((recipient) => recipient.userId)).toEqual([
      'user-1',
      null,
      'user-2',
    ]);
  });

  it('does not match manual recipients by displayName only', async () => {
    const { service, prisma } = createService();

    await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Shared Name', email: 'one@example.com' },
      user,
    );
    await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Shared Name', email: 'two@example.com' },
      user,
    );

    expect(prisma.recipients).toHaveLength(2);
  });

  it('updates manual recipient displayName and email', async () => {
    const { service, prisma } = createService();
    const created = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Old Name', email: 'old@example.com' },
      user,
    );

    const updated = await service.updateManualArtifactRecipient(
      'event-1',
      created.recipient.id,
      { displayName: 'New Name', email: 'NEW@example.com' },
      user,
    );

    expect(updated).toMatchObject({
      displayName: 'New Name',
      email: 'NEW@example.com',
    });
    expect(prisma.recipients[0].emailNormalized).toBe('new@example.com');
  });

  it('rejects manual recipient email updates that conflict with another identity', async () => {
    const { service } = createService();
    await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'One', email: 'one@example.com' },
      user,
    );
    const second = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Two', email: 'two@example.com' },
      user,
    );

    await expect(
      service.updateManualArtifactRecipient(
        'event-1',
        second.recipient.id,
        { email: 'one@example.com' },
        user,
      ),
    ).rejects.toThrow('conflicts with another recipient');
  });

  it('adds a custom role to an existing registration-backed recipient', async () => {
    const { service, prisma } = createService();
    prisma.addRegistration({ id: 'registration-1', userId: 'user-1' });
    await service.backfillEventRecipients('event-1');
    const role = await service.createRecipientRole(
      'event-1',
      { code: 'press', displayName: 'Press' },
      user,
    );

    const result = await service.assignRoleToArtifactRecipient(
      'event-1',
      prisma.recipients[0].id,
      { roleId: role.id },
      user,
    );

    expect(result.recipient.roles.map((item) => item.code).sort()).toEqual([
      'participant',
      'press',
    ]);
    expect(prisma.sources[0].sourceType).toBe(EventRecipientSourceType.REGISTRATION);
  });

  it('adds built-in manual roles to an existing recipient', async () => {
    const { service, prisma } = createService();
    const created = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Manual Guest' },
      user,
    );

    for (const roleCode of ['vip', 'staff', 'sponsor']) {
      await service.assignRoleToArtifactRecipient(
        'event-1',
        created.recipient.id,
        { roleCode },
        user,
      );
    }

    expect(activeRoleCodes(prisma).sort()).toEqual(['sponsor', 'staff', 'vip']);
  });

  it('re-adding an active role is idempotent', async () => {
    const { service, prisma } = createService();
    const created = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Manual Guest' },
      user,
    );

    await service.assignRoleToArtifactRecipient(
      'event-1',
      created.recipient.id,
      { roleCode: 'vip' },
      user,
    );
    await service.assignRoleToArtifactRecipient(
      'event-1',
      created.recipient.id,
      { roleCode: 'vip' },
      user,
    );

    expect(prisma.assignments).toHaveLength(1);
    expect(activeRoleCodes(prisma)).toEqual(['vip']);
  });

  it('reactivates an inactive manual assignment', async () => {
    const { service, prisma } = createService();
    const created = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Manual Guest' },
      user,
    );
    await service.assignRoleToArtifactRecipient(
      'event-1',
      created.recipient.id,
      { roleCode: 'vip' },
      user,
    );
    prisma.assignments[0].status = EventRecipientRoleAssignmentStatus.INACTIVE;

    const result = await service.assignRoleToArtifactRecipient(
      'event-1',
      created.recipient.id,
      { roleCode: 'vip' },
      user,
    );

    expect(result.assignment.status).toBe(EventRecipientRoleAssignmentStatus.ACTIVE);
    expect(prisma.assignments).toHaveLength(1);
  });

  it('deactivates a manually assigned role', async () => {
    const { service, prisma } = createService();
    const created = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Manual Guest', roleCodes: ['vip'] },
      user,
    );
    const vipRole = prisma.roles.find((role) => role.code === 'vip');

    const result = await service.deactivateRoleForArtifactRecipient(
      'event-1',
      created.recipient.id,
      vipRole.id,
      user,
    );

    expect(result.assignment.status).toBe(EventRecipientRoleAssignmentStatus.INACTIVE);
    expect(prisma.assignments[0].status).toBe(
      EventRecipientRoleAssignmentStatus.INACTIVE,
    );
  });

  it('rejects removing a participant role backed by registration', async () => {
    const { service, prisma } = createService();
    prisma.addRegistration({ id: 'registration-1', userId: 'user-1' });
    await service.backfillEventRecipients('event-1');
    const participantRole = prisma.roles.find((role) => role.code === 'participant');

    await expect(
      service.deactivateRoleForArtifactRecipient(
        'event-1',
        prisma.recipients[0].id,
        participantRole.id,
        user,
      ),
    ).rejects.toThrow('Source-backed participant or speaker');
  });

  it('rejects removing a speaker role backed by speaker source', async () => {
    const { service, prisma } = createService();
    prisma.addSpeaker({ id: 'speaker-1', invitedEmail: 'speaker@example.com' });
    await service.backfillEventRecipients('event-1');
    const speakerRole = prisma.roles.find((role) => role.code === 'speaker');

    await expect(
      service.deactivateRoleForArtifactRecipient(
        'event-1',
        prisma.recipients[0].id,
        speakerRole.id,
        user,
      ),
    ).rejects.toThrow('Source-backed participant or speaker');
  });

  it('rejects recipient and role ids outside the event boundary', async () => {
    const { service, prisma } = createService();
    prisma.events.push({
      id: 'event-2',
      title: 'Event Two',
      organizationId: 'org-1',
    });
    const created = await service.createManualArtifactRecipient(
      'event-1',
      { displayName: 'Manual Guest' },
      user,
    );
    const otherRole = await service.createRecipientRole(
      'event-2',
      { code: 'press', displayName: 'Press' },
      user,
    );

    await expect(
      service.updateManualArtifactRecipient(
        'event-2',
        created.recipient.id,
        { displayName: 'Wrong Event' },
        user,
      ),
    ).rejects.toThrow('not found for this event');
    await expect(
      service.assignRoleToArtifactRecipient(
        'event-1',
        created.recipient.id,
        { roleId: otherRole.id },
        user,
      ),
    ).rejects.toThrow('not found for this event');
  });

  function activeRoleCodes(prisma: FakeArtifactRecipientsPrisma) {
    return prisma.assignments
      .filter(
        (assignment) =>
          assignment.status === EventRecipientRoleAssignmentStatus.ACTIVE,
      )
      .map((assignment) => {
        const role = prisma.roles.find((candidate) => candidate.id === assignment.roleId);
        return role?.code;
      })
      .filter(Boolean);
  }

  function templateRole(
    summary: Awaited<
      ReturnType<ArtifactRecipientsService['getArtifactTemplateSummary']>
    >,
    roleCode: string,
  ) {
    const role = summary.roles.find((item) => item.roleCode === roleCode);
    if (!role) throw new Error(`Role not found in summary: ${roleCode}`);
    return role;
  }
});
