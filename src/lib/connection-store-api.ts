import { invoke } from '@tauri-apps/api/core';
import type { Connection, ConnectionGroup } from '@/types';

/**
 * Connection Store API
 * Provides persistent storage for database connections using SQLite
 */

/**
 * Initialize the connection store
 */
export async function initConnectionStore(): Promise<void> {
  await invoke('plugin:connection-store|init');
}

/**
 * Create a new connection
 */
export async function createConnection(connection: Connection): Promise<void> {
  await invoke('plugin:connection-store|create_connection', { connection });
}

/**
 * Get all connections
 */
export async function getAllConnections(): Promise<Connection[]> {
  return await invoke('plugin:connection-store|get_all_connections');
}

/**
 * Get connection by ID
 */
export async function getConnection(id: string): Promise<Connection | null> {
  return await invoke('plugin:connection-store|get_connection', { id });
}

/**
 * Update connection
 */
export async function updateConnection(connection: Connection): Promise<void> {
  await invoke('plugin:connection-store|update_connection', { connection });
}

/**
 * Delete connection
 */
export async function deleteConnection(id: string): Promise<void> {
  await invoke('plugin:connection-store|delete_connection', { id });
}

/**
 * Update connection statistics (last connected time, count)
 */
export async function updateConnectionStats(id: string): Promise<void> {
  await invoke('plugin:connection-store|update_connection_stats', { id });
}

// ===== Group Operations =====

/**
 * Create connection group
 */
export async function createGroup(group: ConnectionGroup): Promise<void> {
  await invoke('plugin:connection-store|create_group', { group });
}

/**
 * Get all groups
 */
export async function getAllGroups(): Promise<ConnectionGroup[]> {
  return await invoke('plugin:connection-store|get_all_groups');
}

/**
 * Add connection to group
 */
export async function addConnectionToGroup(
  connectionId: string,
  groupId: string
): Promise<void> {
  await invoke('plugin:connection-store|add_connection_to_group', {
    connectionId,
    groupId,
  });
}

/**
 * Get connections in group
 */
export async function getConnectionsInGroup(
  groupId: string
): Promise<Connection[]> {
  return await invoke('plugin:connection-store|get_connections_in_group', {
    groupId,
  });
}

// ===== Metadata Operations =====

/**
 * Set metadata
 */
export async function setMetadata(key: string, value: string): Promise<void> {
  await invoke('plugin:connection-store|set_metadata', { key, value });
}

/**
 * Get metadata
 */
export async function getMetadata(key: string): Promise<string | null> {
  return await invoke('plugin:connection-store|get_metadata', { key });
}
