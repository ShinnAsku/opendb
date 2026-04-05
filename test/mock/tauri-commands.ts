import type { Connection, QueryResult, TableInfo, SchemaNode, ColumnInfo } from '@/types'

export const mockConnections: Connection[] = [
  {
    id: 'conn-1',
    name: 'PostgreSQL 示例',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    database: 'test',
    connected: false,
  },
  {
    id: 'conn-2',
    name: 'SQLite 本地',
    type: 'sqlite',
    database: ':memory:',
    connected: false,
  },
]

export const mockTables: TableInfo[] = [
  {
    oid: 1,
    name: 'users',
    schema: 'public',
    owner: 'postgres',
    size: '',
    description: '',
    acl: null,
    tablespace: '',
    hasIndexes: true,
    hasRules: false,
    hasTriggers: false,
    rowCount: 100,
    primaryKey: 'id',
    partitionOf: null,
    tableType: 'TABLE',
    created: new Date(),
    modified: new Date(),
    engine: null,
    dataLength: null,
    createTime: null,
    updateTime: null,
    collation: null,
  },
  {
    oid: 2,
    name: 'orders',
    schema: 'public',
    owner: 'postgres',
    size: '',
    description: '',
    acl: null,
    tablespace: '',
    hasIndexes: true,
    hasRules: false,
    hasTriggers: false,
    rowCount: 500,
    primaryKey: 'id',
    partitionOf: null,
    tableType: 'TABLE',
    created: new Date(),
    modified: new Date(),
    engine: null,
    dataLength: null,
    createTime: null,
    updateTime: null,
    collation: null,
  },
]

const mockColumns: ColumnInfo[] = [
  {
    name: 'id',
    type: 'integer',
    length: null,
    precision: null,
    scale: null,
    notNull: true,
    defaultValue: null,
    description: '',
    primaryKey: true,
    unique: true,
  },
  {
    name: 'name',
    type: 'varchar',
    length: 255,
    precision: null,
    scale: null,
    notNull: true,
    defaultValue: null,
    description: '',
    primaryKey: false,
    unique: false,
  },
  {
    name: 'email',
    type: 'varchar',
    length: 255,
    precision: null,
    scale: null,
    notNull: true,
    defaultValue: null,
    description: '',
    primaryKey: false,
    unique: true,
  },
]

export const mockQueryResult: QueryResult = {
  columns: mockColumns,
  rows: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ],
  rowCount: 2,
  duration: 12,
}

export const mockSchemaNodes: SchemaNode[] = [
  {
    id: 'schema-public',
    name: 'public',
    type: 'schema',
    children: [
      {
        id: 'table-users',
        name: 'users',
        type: 'table',
        children: [],
      },
    ],
  },
]

export const mockTauriCommands: Record<string, (...args: any[]) => Promise<any>> = {
  get_connections: async (): Promise<Connection[]> => mockConnections,
  add_connection: async (conn: any): Promise<Connection> => ({
    ...conn,
    id: conn.id || `conn-${Date.now()}`,
  }),
  update_connection: async (id: string, updates: any): Promise<Connection> => ({
    ...mockConnections[0],
    ...updates,
    id,
  }),
  delete_connection: async (): Promise<void> => {},
  connect_to_database: async (): Promise<boolean> => true,
  disconnect_database: async (): Promise<void> => {},
  execute_query: async (): Promise<QueryResult> => mockQueryResult,
  get_tables: async (): Promise<TableInfo[]> => mockTables,
  get_schemas: async (): Promise<string[]> => ['public'],
  test_connection_cmd: async (): Promise<{ success: boolean; message?: string }> => ({ success: true }),
  get_table_data: async (): Promise<QueryResult> => mockQueryResult,
}


