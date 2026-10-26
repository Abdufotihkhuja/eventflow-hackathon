import { PrismaClient } from '@prisma/client';
import { ArtifactRecipientsService } from '../src/modules/events/artifact-recipients/artifact-recipients.service';

const prisma = new PrismaClient();
const service = new ArtifactRecipientsService(prisma as never);

async function main() {
  const events = await prisma.event.findMany({
    select: { id: true, title: true },
    orderBy: { createdAt: 'asc' },
  });

  let processed = 0;
  for (const event of events) {
    const summary = await service.backfillEventRecipients(event.id);
    processed += 1;
    console.log(
      [
        `event=${event.id}`,
        `title="${event.title}"`,
        `registrationRecipients=${summary.registrationRecipients}`,
        `speakerRecipients=${summary.speakerRecipients}`,
        `duplicateEmailMatchesSkipped=${summary.duplicateEmailMatchesSkipped}`,
      ].join(' '),
    );
  }

  console.log(`Backfilled artifact recipients for ${processed} events.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
