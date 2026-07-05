import { Prisma } from '@smartklass/database';

export function mergeJsonMetadata(
  existing: Prisma.JsonValue | null | undefined,
  patch: Record<string, Prisma.InputJsonValue>,
): Prisma.InputJsonValue {
  const base =
    existing &&
    typeof existing === 'object' &&
    existing !== null &&
    !Array.isArray(existing)
      ? { ...(existing as Record<string, Prisma.InputJsonValue>) }
      : {};

  return { ...base, ...patch };
}

export function metadataNumber(
  metadata: Prisma.JsonValue | null | undefined,
  key: string,
): number | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function metadataString(
  metadata: Prisma.JsonValue | null | undefined,
  key: string,
): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
