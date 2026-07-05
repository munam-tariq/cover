import { supabaseAdmin } from "../../lib/supabase";
import type {
  ChannelConnection,
  ChannelConnectionStatus,
  ChannelProvider,
  UpsertConnectionData,
} from "../../types/channels";
import { encryptAuthConfig, decryptAuthConfig } from "../encryption";

import { resolveConnectionUpsertTarget } from "./connection-ownership";

interface ConnectionRow {
  id: string;
  project_id: string;
  provider: string;
  external_id: string;
  display_name: string | null;
  credentials: string;
  config: Record<string, unknown>;
  status: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

function toConnection(row: ConnectionRow): ChannelConnection & { encryptedCredentials: string } {
  return {
    id: row.id,
    projectId: row.project_id,
    provider: row.provider as ChannelProvider,
    externalId: row.external_id,
    displayName: row.display_name,
    encryptedCredentials: row.credentials,
    status: row.status as ChannelConnectionStatus,
    lastError: row.last_error,
    config: row.config,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getConnectionByExternalId(
  provider: ChannelProvider,
  externalId: string
): Promise<(ChannelConnection & { encryptedCredentials: string }) | null> {
  const { data, error } = await supabaseAdmin
    .from("channel_connections")
    .select("*")
    .eq("provider", provider)
    .eq("external_id", externalId)
    .eq("status", "active")
    .single();

  if (error || !data) return null;
  return toConnection(data as ConnectionRow);
}

export async function getConnectionsByExternalIds(
  provider: ChannelProvider,
  externalIds: string[]
): Promise<Array<ChannelConnection & { encryptedCredentials: string }>> {
  if (externalIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("channel_connections")
    .select("*")
    .eq("provider", provider)
    .eq("status", "active")
    .in("external_id", externalIds);

  // A query error is not the same as a legitimate zero-match result: the
  // caller (webhook route) must be able to tell "nothing known" (200, no
  // retry needed) apart from "lookup failed" (5xx, Meta should retry).
  if (error) {
    throw new Error(`Failed to look up channel connections: ${error.message}`);
  }
  return ((data ?? []) as ConnectionRow[]).map(toConnection);
}

export async function getActiveConnection(
  projectId: string,
  provider: ChannelProvider
): Promise<(ChannelConnection & { encryptedCredentials: string }) | null> {
  const { data, error } = await supabaseAdmin
    .from("channel_connections")
    .select("*")
    .eq("project_id", projectId)
    .eq("provider", provider)
    .eq("status", "active")
    .single();

  if (error || !data) return null;
  return toConnection(data as ConnectionRow);
}

export async function getProjectConnection(
  projectId: string,
  provider: ChannelProvider
): Promise<ChannelConnection | null> {
  const { data, error } = await supabaseAdmin
    .from("channel_connections")
    .select("*")
    .eq("project_id", projectId)
    .eq("provider", provider)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const full = toConnection(data as ConnectionRow);
  const { encryptedCredentials: _, ...safe } = full;
  return safe;
}

export async function upsertConnection(
  projectId: string,
  provider: ChannelProvider,
  data: UpsertConnectionData
): Promise<ChannelConnection> {
  const encrypted = encryptAuthConfig(data.credentials);

  const row = {
    project_id: projectId,
    provider,
    external_id: data.externalId,
    display_name: data.displayName ?? null,
    credentials: encrypted,
    config: data.config ?? {},
    status: "active" as const,
    last_error: null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabaseAdmin
    .from("channel_connections")
    .select("id, project_id")
    .eq("project_id", projectId)
    .eq("provider", provider)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    const targetId = resolveConnectionUpsertTarget(
      projectId,
      { id: existing.id, projectId: existing.project_id },
      null
    );
    const { data: updated, error } = await supabaseAdmin
      .from("channel_connections")
      .update(row)
      .eq("id", targetId)
      .select("*")
      .single();

    if (error || !updated) throw new Error(`Failed to update connection: ${error?.message}`);
    const full = toConnection(updated as ConnectionRow);
    const { encryptedCredentials: _, ...connection } = full;
    return connection;
  }

  const { data: existingByExternalId } = await supabaseAdmin
    .from("channel_connections")
    .select("id, project_id")
    .eq("provider", provider)
    .eq("external_id", data.externalId)
    .maybeSingle();

  const targetId = resolveConnectionUpsertTarget(
    projectId,
    null,
    existingByExternalId
      ? { id: existingByExternalId.id, projectId: existingByExternalId.project_id }
      : null
  );

  if (targetId) {
    const { data: updated, error } = await supabaseAdmin
      .from("channel_connections")
      .update(row)
      .eq("id", targetId)
      .select("*")
      .single();

    if (error || !updated) throw new Error(`Failed to update connection: ${error?.message}`);
    const full = toConnection(updated as ConnectionRow);
    const { encryptedCredentials: _, ...connection } = full;
    return connection;
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("channel_connections")
    .insert(row)
    .select("*")
    .single();

  if (error || !inserted) throw new Error(`Failed to create connection: ${error?.message}`);
  const full = toConnection(inserted as ConnectionRow);
  const { encryptedCredentials: _, ...connection } = full;
  return connection;
}

export async function setConnectionStatus(
  id: string,
  status: ChannelConnectionStatus,
  lastError?: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("channel_connections")
    .update({
      status,
      last_error: lastError ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to update connection status: ${error.message}`);
}

export async function setProjectConnectionStatus(
  projectId: string,
  provider: ChannelProvider,
  id: string,
  status: ChannelConnectionStatus,
  lastError?: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("channel_connections")
    .update({
      status,
      last_error: lastError ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("project_id", projectId)
    .eq("provider", provider)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update connection status: ${error.message}`);
  }

  return Boolean(data);
}

export function decryptCredentials<T>(encrypted: string): T {
  return decryptAuthConfig(encrypted) as T;
}
