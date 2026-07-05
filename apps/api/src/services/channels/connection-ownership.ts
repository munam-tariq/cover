interface ConnectionIdentity {
  id: string;
  projectId: string;
}

/** Thrown when a channel upsert would touch a connection owned by another project. */
export class ChannelOwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelOwnershipError";
  }
}

export function resolveConnectionUpsertTarget(
  projectId: string,
  existingActive: ConnectionIdentity | null,
  existingByExternalId: ConnectionIdentity | null
): string | null {
  if (existingActive) {
    if (existingActive.projectId !== projectId) {
      throw new ChannelOwnershipError("Channel connection belongs to another project");
    }
    return existingActive.id;
  }

  if (!existingByExternalId) return null;

  if (existingByExternalId.projectId !== projectId) {
    throw new ChannelOwnershipError("Channel external ID is already connected to another project");
  }

  return existingByExternalId.id;
}
