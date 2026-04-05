import { secureStorage } from 'tauri-plugin-secure-storage';

// Check if we're running in Tauri environment
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Securely store a password for a connection
 * @param connectionId The connection ID
 * @param password The password to store
 */
export async function storePassword(connectionId: string, password: string): Promise<void> {
  if (!isTauri) {
    console.warn("Secure storage is only available in Tauri environment");
    return;
  }
  
  try {
    await secureStorage.set(`password_${connectionId}`, password);
  } catch (error) {
    console.error("Failed to store password:", error);
    // Don't throw error, continue with save operation
  }
}

/**
 * Retrieve a password for a connection
 * @param connectionId The connection ID
 * @returns The stored password or null if not found
 */
export async function getPassword(connectionId: string): Promise<string | null> {
  if (!isTauri) {
    console.warn("Secure storage is only available in Tauri environment");
    return null;
  }
  
  try {
    const value = await secureStorage.get(`password_${connectionId}`);
    return value ? String(value) : null;
  } catch (error) {
    console.error("Failed to retrieve password:", error);
    return null;
  }
}

/**
 * Remove a stored password
 * @param connectionId The connection ID
 */
export async function removePassword(connectionId: string): Promise<void> {
  if (!isTauri) {
    console.warn("Secure storage is only available in Tauri environment");
    return;
  }
  
  try {
    await secureStorage.remove(`password_${connectionId}`);
  } catch (error) {
    console.error("Failed to remove password:", error);
  }
}
