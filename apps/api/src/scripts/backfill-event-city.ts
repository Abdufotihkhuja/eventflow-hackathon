/**
 * Бэкфилл `Event.city` из адреса.
 *
 * Зачем: picker в кабинете организатора записывал полный адрес в `Event.address`,
 * но структурное поле `city` оставлял пустым. Из-за этого фильтр по городу в
 * мобильном приложении не находил события («NEXUS30 Hackathon» в Ташкенте не
 * показывался в ленте Ташкента). Runtime-фильтр умеет искать город в адресе
 * (см. common/geo/event-city-filter), но заполненное поле точнее и дешевле —
 * этот скрипт разбирает исторические строки один раз.
 *
 * Разбор идёт тем же справочником алиасов, что и фильтр: берётся первый
 * распознанный город (геокодер пишет его в начале строки), годонимы
 * («проспект Алишера Навои») исключаются, мусорный хвост в конце игнорируется.
 * В базу пишется каноническое русское название — так город хранится в данных.
 *
 * Запуск (dry-run по умолчанию, ничего не меняет):
 *   npm run backfill:event-city
 *   BACKFILL_CITY_CONFIRM=apply npm run backfill:event-city
 *
 * Идемпотентен: трогает только строки с пустым `city`, повторный прогон
 * находит уже нечего.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { findCityInText, getCanonicalRuCityName } from '../common/geo';

const APPLY = process.env.BACKFILL_CITY_CONFIRM === 'apply';

async function main(): Promise<void> {
  // Prisma 7 требует явных опций и работает через driver adapter — тот же
  // `PrismaPg`, что и PrismaService приложения (см. src/prisma/prisma.service).
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL не задан — запускай внутри контейнера api');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const events = await prisma.event.findMany({
      where: {
        deletedAt: null,
        OR: [{ city: null }, { city: '' }],
      },
      select: { id: true, title: true, address: true, venue: true },
    });

    console.log(
      `Событий без города: ${events.length}${APPLY ? '' : ' (dry-run — правок не будет)'}`,
    );

    let resolved = 0;
    for (const event of events) {
      // Адрес приоритетнее: геокодер кладёт город именно туда, venue — это
      // обычно только улица/площадка.
      const match =
        findCityInText(event.address ?? '') ?? findCityInText(event.venue ?? '');

      if (!match) {
        console.log(`  — ${event.title}: город не распознан`);
        continue;
      }

      const city = getCanonicalRuCityName(match.code);
      resolved += 1;
      console.log(`  ✓ ${event.title}: ${city}`);

      if (APPLY) {
        await prisma.event.update({ where: { id: event.id }, data: { city } });
      }
    }

    console.log(
      APPLY
        ? `Проставлено городов: ${resolved} из ${events.length}`
        : `Распознано: ${resolved} из ${events.length}. Применить: BACKFILL_CITY_CONFIRM=apply npm run backfill:event-city`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
