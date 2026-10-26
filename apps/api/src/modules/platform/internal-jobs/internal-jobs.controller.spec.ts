import 'reflect-metadata';
import { THROTTLER_SKIP } from '@nestjs/throttler/dist/throttler.constants';
import { InternalJobsController } from './internal-jobs.controller';

// Regression: under the hackathon signup wave the worker's mail.send calls were
// throttled together with end users (429 ThrottlerException), so verification
// emails were dropped. Internal job routes must always bypass the throttler.
describe('InternalJobsController', () => {
  it('skips the global ThrottlerGuard for the default throttler', () => {
    const skip = Reflect.getMetadata(
      `${THROTTLER_SKIP}default`,
      InternalJobsController,
    );
    expect(skip).toBe(true);
  });
});
