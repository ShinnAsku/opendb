export interface DataType {
  name: string;
  category: 'numeric' | 'string' | 'binary' | 'date' | 'boolean' | 'spatial' | 'json' | 'other';
  hasLength: boolean;
  hasPrecision: boolean;
  hasScale: boolean;
  defaultValue?: string;
}

export type DbType = 'postgresql' | 'mysql' | 'sqlite' | 'gaussdb' | 'clickhouse' | 'mssql';

const pgTypes: DataType[] = [
  { name: 'serial', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'bigserial', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'integer', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'bigint', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'smallint', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'decimal', category: 'numeric', hasLength: false, hasPrecision: true, hasScale: true },
  { name: 'numeric', category: 'numeric', hasLength: false, hasPrecision: true, hasScale: true },
  { name: 'real', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'double precision', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'varchar', category: 'string', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'char', category: 'string', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'text', category: 'string', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'boolean', category: 'boolean', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'date', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'timestamp', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'timestamptz', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'time', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'json', category: 'json', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'jsonb', category: 'json', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'uuid', category: 'other', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'bytea', category: 'binary', hasLength: false, hasPrecision: false, hasScale: false },
];

const mysqlTypes: DataType[] = [
  { name: 'INT', category: 'numeric', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'BIGINT', category: 'numeric', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'TINYINT', category: 'numeric', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'SMALLINT', category: 'numeric', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'MEDIUMINT', category: 'numeric', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'DECIMAL', category: 'numeric', hasLength: false, hasPrecision: true, hasScale: true },
  { name: 'FLOAT', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'DOUBLE', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'VARCHAR', category: 'string', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'CHAR', category: 'string', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'TEXT', category: 'string', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'MEDIUMTEXT', category: 'string', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'LONGTEXT', category: 'string', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'BOOLEAN', category: 'boolean', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'DATE', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'DATETIME', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'TIMESTAMP', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'TIME', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'YEAR', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'JSON', category: 'json', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'BLOB', category: 'binary', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'MEDIUMBLOB', category: 'binary', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'LONGBLOB', category: 'binary', hasLength: false, hasPrecision: false, hasScale: false },
];

const sqliteTypes: DataType[] = [
  { name: 'INTEGER', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'REAL', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'TEXT', category: 'string', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'BLOB', category: 'binary', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'NUMERIC', category: 'numeric', hasLength: false, hasPrecision: true, hasScale: true },
  { name: 'BOOLEAN', category: 'boolean', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'VARCHAR', category: 'string', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'DATE', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'DATETIME', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
];

const clickhouseTypes: DataType[] = [
  { name: 'UInt8', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'UInt16', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'UInt32', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'UInt64', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'Int8', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'Int16', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'Int32', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'Int64', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'Float32', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'Float64', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'Decimal', category: 'numeric', hasLength: false, hasPrecision: true, hasScale: true },
  { name: 'String', category: 'string', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'FixedString', category: 'string', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'Date', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'DateTime', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'DateTime64', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'Array', category: 'other', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'Nullable', category: 'other', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'JSON', category: 'json', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'UUID', category: 'other', hasLength: false, hasPrecision: false, hasScale: false },
];

const mssqlTypes: DataType[] = [
  { name: 'INT', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'BIGINT', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'SMALLINT', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'TINYINT', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'DECIMAL', category: 'numeric', hasLength: false, hasPrecision: true, hasScale: true },
  { name: 'NUMERIC', category: 'numeric', hasLength: false, hasPrecision: true, hasScale: true },
  { name: 'FLOAT', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'REAL', category: 'numeric', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'VARCHAR', category: 'string', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'NVARCHAR', category: 'string', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'CHAR', category: 'string', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'NCHAR', category: 'string', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'TEXT', category: 'string', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'NTEXT', category: 'string', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'BIT', category: 'boolean', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'DATE', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'DATETIME', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'DATETIME2', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'SMALLDATETIME', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'DATETIMEOFFSET', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'TIME', category: 'date', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'UNIQUEIDENTIFIER', category: 'other', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'VARBINARY', category: 'binary', hasLength: true, hasPrecision: false, hasScale: false },
  { name: 'IMAGE', category: 'binary', hasLength: false, hasPrecision: false, hasScale: false },
  { name: 'XML', category: 'other', hasLength: false, hasPrecision: false, hasScale: false },
];

export const DATA_TYPES: Record<string, DataType[]> = {
  postgresql: pgTypes,
  gaussdb: pgTypes,
  mysql: mysqlTypes,
  sqlite: sqliteTypes,
  clickhouse: clickhouseTypes,
  mssql: mssqlTypes,
};

export const DATA_TYPE_CATEGORIES: { key: DataType['category']; labelZh: string; labelEn: string }[] = [
  { key: 'numeric', labelZh: '数值', labelEn: 'Numeric' },
  { key: 'string', labelZh: '字符串', labelEn: 'String' },
  { key: 'binary', labelZh: '二进制', labelEn: 'Binary' },
  { key: 'date', labelZh: '日期时间', labelEn: 'Date/Time' },
  { key: 'boolean', labelZh: '布尔', labelEn: 'Boolean' },
  { key: 'json', labelZh: 'JSON', labelEn: 'JSON' },
  { key: 'spatial', labelZh: '空间', labelEn: 'Spatial' },
  { key: 'other', labelZh: '其他', labelEn: 'Other' },
];

export function getDataTypeInfo(dbType: string, typeName: string): DataType | undefined {
  const types = DATA_TYPES[dbType];
  if (!types) return undefined;
  return types.find((t) => t.name.toLowerCase() === typeName.toLowerCase());
}

export function getTypesByCategory(dbType: string, category: DataType['category']): DataType[] {
  return DATA_TYPES[dbType]?.filter((t) => t.category === category) ?? [];
}
