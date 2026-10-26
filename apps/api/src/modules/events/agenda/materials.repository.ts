import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MaterialsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAgendaItemInEvent(
    eventId: string,
    agendaItemId: string,
  ): Promise<{
    id: string;
    materials: string[];
    materialLabels: Prisma.JsonValue;
  } | null> {
    return this.prisma.agendaItem.findFirst({
      where: { id: agendaItemId, eventId },
      select: { id: true, materials: true, materialLabels: true },
    });
  }

  async appendMaterial(agendaItemId: string, materialUrl: string): Promise<void> {
    await this.prisma.agendaItem.update({
      where: { id: agendaItemId },
      data: {
        materials: {
          push: materialUrl,
        },
      },
    });
  }

  async appendMaterialWithLabels(
    agendaItemId: string,
    materialUrl: string,
    titleTranslations: Record<string, string>,
    currentLabels: Prisma.JsonValue,
  ): Promise<void> {
    const labels: Record<string, Record<string, string>> = isJsonObject(currentLabels)
      ? jsonObjectToStringMap(currentLabels)
      : {};
    if (Object.keys(titleTranslations).length > 0) {
      labels[materialUrl] = titleTranslations;
    }
    await this.prisma.agendaItem.update({
      where: { id: agendaItemId },
      data: {
        materials: { push: materialUrl },
        materialLabels: labels as Prisma.InputJsonValue,
      },
    });
  }

  async replaceMaterials(
    agendaItemId: string,
    materials: string[],
  ): Promise<void> {
    await this.prisma.agendaItem.update({
      where: { id: agendaItemId },
      data: { materials },
    });
  }

  async replaceMaterialsAndLabels(
    agendaItemId: string,
    materials: string[],
    materialLabels: Prisma.JsonValue,
  ): Promise<void> {
    await this.prisma.agendaItem.update({
      where: { id: agendaItemId },
      data: {
        materials,
        materialLabels: (isJsonObject(materialLabels)
          ? materialLabels
          : {}) as Prisma.InputJsonValue,
      },
    });
  }

  async findEventAccess(
    eventId: string,
  ): Promise<{ organizationId: string } | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
  }

  async findEventStatus(
    eventId: string,
  ): Promise<{ status: string } | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: { status: true },
    });
  }
}

function isJsonObject(
  value: Prisma.JsonValue,
): value is Prisma.JsonObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function jsonObjectToStringMap(
  value: Prisma.JsonObject,
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  for (const [url, raw] of Object.entries(value)) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const inner: Record<string, string> = {};
      for (const [locale, val] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof val === 'string') inner[locale] = val;
      }
      result[url] = inner;
    }
  }
  return result;
}
