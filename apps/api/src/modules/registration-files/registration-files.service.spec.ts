import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { QuestionType, RegistrationFileStatus, UserType } from '@prisma/client';
import { ICurrentUser } from '../../common/interfaces';
import { RegistrationFilesService } from './registration-files.service';
import { RegistrationFilesRepository } from './registration-files.repository';
import { RegistrationFilesStorage } from './registration-files.storage';
import {
  DRAFT_SWEEP_BATCH_SIZE,
  DRAFT_TTL_HOURS,
} from './registration-files.constants';

const USER: ICurrentUser = { sub: 'user-1', type: UserType.USER } as ICurrentUser;
const EVENT_ID = 'event-1';
const QUESTION_ID = 'question-1';

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    originalname: 'cv.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('data'),
    ...overrides,
  } as Express.Multer.File;
}

function makeService(repoOverrides: Partial<RegistrationFilesRepository> = {}) {
  const repo = {
    findQuestion: jest.fn().mockResolvedValue({
      id: QUESTION_ID,
      eventId: EVENT_ID,
      type: QuestionType.FILE_UPLOAD,
      isRequired: true,
      fileUploadConfig: null,
      event: { organizationId: 'org-1' },
    }),
    countPendingForUser: jest.fn().mockResolvedValue(0),
    findPendingForUser: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 'file-1',
        questionId: QUESTION_ID,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        status: RegistrationFileStatus.PENDING,
        createdAt: new Date(),
      }),
    ),
    ...repoOverrides,
  } as unknown as RegistrationFilesRepository;

  const storage = {
    save: jest.fn().mockResolvedValue('evt/event-1/q/question-1/uuid.pdf'),
    remove: jest.fn().mockResolvedValue(undefined),
    createReadStream: jest.fn(),
  } as unknown as RegistrationFilesStorage;

  return { service: new RegistrationFilesService(repo, storage), repo, storage };
}

describe('RegistrationFilesService.uploadParticipantFile', () => {
  it('stores a valid file and returns a safe entity', async () => {
    const { service, storage } = makeService();
    const result = await service.uploadParticipantFile(
      EVENT_ID,
      QUESTION_ID,
      makeFile(),
      USER,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock assertion, not an unbound call
    expect(storage.save).toHaveBeenCalled();
    expect(result.id).toBe('file-1');
    expect(result.originalName).toBe('cv.pdf');
    // never leaks internal storage path
    expect(result as unknown as Record<string, unknown>).not.toHaveProperty(
      'storedPath',
    );
  });

  it('rejects a disallowed extension', async () => {
    const { service } = makeService();
    await expect(
      service.uploadParticipantFile(
        EVENT_ID,
        QUESTION_ID,
        makeFile({ originalname: 'malware.exe', mimetype: 'application/octet-stream' }),
        USER,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a file over the configured size limit', async () => {
    const { service } = makeService({
      findQuestion: jest.fn().mockResolvedValue({
        id: QUESTION_ID,
        eventId: EVENT_ID,
        type: QuestionType.FILE_UPLOAD,
        isRequired: false,
        fileUploadConfig: { maxFileSizeMb: 1, allowedFileTypes: ['.pdf'] },
        event: { organizationId: 'org-1' },
      }),
    });
    await expect(
      service.uploadParticipantFile(
        EVENT_ID,
        QUESTION_ID,
        makeFile({ size: 5 * 1024 * 1024 }),
        USER,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the per-question file count is exceeded', async () => {
    const { service } = makeService({
      countPendingForUser: jest.fn().mockResolvedValue(1),
    });
    await expect(
      service.uploadParticipantFile(EVENT_ID, QUESTION_ID, makeFile(), USER),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the question is not a file-upload question', async () => {
    const { service } = makeService({
      findQuestion: jest.fn().mockResolvedValue({
        id: QUESTION_ID,
        eventId: EVENT_ID,
        type: QuestionType.TEXT,
        isRequired: false,
        fileUploadConfig: null,
        event: { organizationId: 'org-1' },
      }),
    });
    await expect(
      service.uploadParticipantFile(EVENT_ID, QUESTION_ID, makeFile(), USER),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('RegistrationFilesService draft (незавершённая регистрация)', () => {
  const draftFiles = [
    { id: 'f1', questionId: QUESTION_ID, storedPath: 'evt/e/q/f1.pdf' },
    { id: 'f2', questionId: QUESTION_ID, storedPath: 'evt/e/q/f2.pdf' },
  ];

  it('lists the participant own pending files', async () => {
    const { service } = makeService({
      findPendingDraftForUser: jest.fn().mockResolvedValue(
        draftFiles.map((f) => ({
          ...f,
          originalName: 'cv.pdf',
          mimeType: 'application/pdf',
          size: 10,
          status: RegistrationFileStatus.PENDING,
          createdAt: new Date(),
        })),
      ),
    });

    const draft = await service.listDraft(EVENT_ID, USER);

    expect(draft).toHaveLength(2);
    expect(draft[0].questionId).toBe(QUESTION_ID);
    // внутренний путь наружу не уходит
    expect(draft[0] as unknown as Record<string, unknown>).not.toHaveProperty(
      'storedPath',
    );
  });

  it('removes pending files from storage and db on reset', async () => {
    const deleteByIds = jest.fn().mockResolvedValue(undefined);
    const { service, storage } = makeService({
      findPendingDraftForUser: jest.fn().mockResolvedValue(draftFiles),
      deleteByIds,
    });

    const result = await service.resetDraft(EVENT_ID, USER);

    expect(result).toEqual({ removed: 2 });
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock assertion, not an unbound call
    expect(storage.remove).toHaveBeenCalledTimes(2);
    expect(deleteByIds).toHaveBeenCalledWith(['f1', 'f2']);
  });

  it('is a no-op when there is no draft', async () => {
    const deleteByIds = jest.fn();
    const { service, storage } = makeService({
      findPendingDraftForUser: jest.fn().mockResolvedValue([]),
      deleteByIds,
    });

    const result = await service.resetDraft(EVENT_ID, USER);

    expect(result).toEqual({ removed: 0 });
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock assertion, not an unbound call
    expect(storage.remove).not.toHaveBeenCalled();
    expect(deleteByIds).not.toHaveBeenCalled();
  });

  it('survives a missing file on disk (best-effort cleanup)', async () => {
    const deleteByIds = jest.fn().mockResolvedValue(undefined);
    const { service } = makeService({
      findPendingDraftForUser: jest.fn().mockResolvedValue(draftFiles),
      deleteByIds,
    });
    const storageMock = (service as any).storage as { remove: jest.Mock };
    storageMock.remove.mockRejectedValue(new Error('ENOENT'));

    await expect(service.resetDraft(EVENT_ID, USER)).resolves.toEqual({
      removed: 2,
    });
    expect(deleteByIds).toHaveBeenCalled();
  });

  it('rejects non-participants', async () => {
    const { service } = makeService();
    await expect(
      service.resetDraft(EVENT_ID, {
        sub: 'org-1',
        type: UserType.ORGANIZATION,
      } as ICurrentUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('RegistrationFilesService.sweepStaleDrafts', () => {
  it('removes abandoned drafts older than the TTL', async () => {
    const findStaleDrafts = jest
      .fn()
      .mockResolvedValue([
        { id: 'f1', storedPath: 'evt/e/q/f1.pdf' },
        { id: 'f2', storedPath: 'evt/e/q/f2.pdf' },
      ]);
    const deleteByIds = jest.fn().mockResolvedValue(undefined);
    const { service, storage } = makeService({ findStaleDrafts, deleteByIds });

    const result = await service.sweepStaleDrafts();

    expect(result).toEqual({ removed: 2 });
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock assertion, not an unbound call
    expect(storage.remove).toHaveBeenCalledTimes(2);
    expect(deleteByIds).toHaveBeenCalledWith(['f1', 'f2']);

    // TTL считается от «сейчас» назад, батч ограничен
    const [cutoff, limit] = findStaleDrafts.mock.calls[0] as [Date, number];
    expect(cutoff.getTime()).toBeLessThan(Date.now());
    expect(cutoff.getTime()).toBeGreaterThan(
      Date.now() - (DRAFT_TTL_HOURS + 1) * 60 * 60 * 1000,
    );
    expect(limit).toBe(DRAFT_SWEEP_BATCH_SIZE);
  });

  it('is a no-op when nothing is stale', async () => {
    const deleteByIds = jest.fn();
    const { service, storage } = makeService({
      findStaleDrafts: jest.fn().mockResolvedValue([]),
      deleteByIds,
    });

    await expect(service.sweepStaleDrafts()).resolves.toEqual({ removed: 0 });
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock assertion, not an unbound call
    expect(storage.remove).not.toHaveBeenCalled();
    expect(deleteByIds).not.toHaveBeenCalled();
  });
});

describe('RegistrationFilesService.prepareForSubmit', () => {
  const fileQuestion = {
    id: QUESTION_ID,
    type: QuestionType.FILE_UPLOAD,
    isRequired: true,
    question: 'Upload CV',
    fileUploadConfig: null,
  } as never;

  it('throws when a required file question has no uploaded files', async () => {
    const { service } = makeService({
      findPendingForUser: jest.fn().mockResolvedValue([]),
    });
    await expect(
      service.prepareForSubmit(EVENT_ID, [fileQuestion], USER),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a comma-joined answer of upload ids when files exist', async () => {
    const { service } = makeService({
      findPendingForUser: jest
        .fn()
        .mockResolvedValue([{ id: 'f1' }, { id: 'f2' }]),
    });
    const multiQuestion = {
      ...fileQuestion,
      fileUploadConfig: { allowMultipleFiles: true, maxFiles: 5 },
    } as never;
    const prepared = await service.prepareForSubmit(
      EVENT_ID,
      [multiQuestion],
      USER,
    );
    expect(prepared).toHaveLength(1);
    expect(prepared[0]).toEqual({
      questionId: QUESTION_ID,
      answer: 'f1,f2',
      uploadIds: ['f1', 'f2'],
    });
  });

  it('skips an optional file question with no files', async () => {
    const { service } = makeService({
      findPendingForUser: jest.fn().mockResolvedValue([]),
    });
    const prepared = await service.prepareForSubmit(
      EVENT_ID,
      [{ ...fileQuestion, isRequired: false } as never],
      USER,
    );
    expect(prepared).toHaveLength(0);
  });
});
