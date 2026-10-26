import {
  DEFAULT_ALLOWED_FILE_TYPES,
  DEFAULT_MAX_FILE_SIZE_MB,
  HARD_MAX_FILE_SIZE_MB,
  HARD_MAX_FILES,
  resolveFileUploadConfig,
} from './registration-files.constants';

describe('resolveFileUploadConfig', () => {
  it('applies defaults for empty/nullish input', () => {
    const config = resolveFileUploadConfig(null);
    expect(config.maxFileSizeMb).toBe(DEFAULT_MAX_FILE_SIZE_MB);
    expect(config.allowMultipleFiles).toBe(false);
    expect(config.maxFiles).toBe(1);
    expect(config.allowedFileTypes).toEqual(DEFAULT_ALLOWED_FILE_TYPES);
    expect(config.description).toBeNull();
    expect(config.template).toBeNull();
  });

  it('clamps file size to the hard ceiling', () => {
    expect(resolveFileUploadConfig({ maxFileSizeMb: 9999 }).maxFileSizeMb).toBe(
      HARD_MAX_FILE_SIZE_MB,
    );
    expect(resolveFileUploadConfig({ maxFileSizeMb: 0 }).maxFileSizeMb).toBe(1);
  });

  it('drops unknown extensions from the whitelist', () => {
    const config = resolveFileUploadConfig({
      allowedFileTypes: ['.pdf', '.exe', '.sh', '.PNG'],
    });
    expect(config.allowedFileTypes).toEqual(['.pdf', '.png']);
  });

  it('falls back to all default types when none are valid', () => {
    const config = resolveFileUploadConfig({ allowedFileTypes: ['.exe'] });
    expect(config.allowedFileTypes).toEqual(DEFAULT_ALLOWED_FILE_TYPES);
  });

  it('forces maxFiles to 1 when multiple files are disabled', () => {
    const config = resolveFileUploadConfig({
      allowMultipleFiles: false,
      maxFiles: 5,
    });
    expect(config.maxFiles).toBe(1);
  });

  it('clamps maxFiles to the hard ceiling when multiple is enabled', () => {
    const config = resolveFileUploadConfig({
      allowMultipleFiles: true,
      maxFiles: 999,
    });
    expect(config.maxFiles).toBe(HARD_MAX_FILES);
  });

  it('keeps a valid template descriptor', () => {
    const config = resolveFileUploadConfig({
      template: { url: '/uploads/registration-templates/x.pdf', name: 'x.pdf', size: 10, mimeType: 'application/pdf' },
    });
    expect(config.template).toEqual({
      url: '/uploads/registration-templates/x.pdf',
      name: 'x.pdf',
      size: 10,
      mimeType: 'application/pdf',
    });
  });

  it('rejects a template without a url', () => {
    const config = resolveFileUploadConfig({
      template: { name: 'x.pdf' },
    });
    expect(config.template).toBeNull();
  });
});
