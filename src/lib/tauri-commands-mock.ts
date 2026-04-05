export function isMockMode(): boolean {
  return import.meta.env.VITE_MOCK_MODE === 'true'
}

export async function mockInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const mockData: Record<string, any> = {
    get_connections: async () => [],
    add_connection: async (conn: any) => conn,
    update_connection: async (_id: string, updates: any) => updates,
    delete_connection: async () => {},
    connect_to_database: async () => true,
    disconnect_database: async () => {},
    execute_query: async () => ({ columns: [], rows: [], rowCount: 0, duration: 0 }),
    get_tables: async () => [],
    get_schemas: async () => ['public'],
    test_connection_cmd: async () => ({ success: true }),
    get_table_data: async () => ({ columns: [], rows: [], rowCount: 0, duration: 0 }),
  }

  const cmd = command as keyof typeof mockData
  if (mockData[cmd]) {
    return (mockData[cmd] as any)(args)
  }
  return Promise.resolve({} as T)
}
