-- ============================================================
-- 测试表1: 数值类型 (Numeric Types)
-- ============================================================
DROP TABLE IF EXISTS pg_type_numeric;
CREATE TABLE pg_type_numeric (
    id SERIAL PRIMARY KEY,
    col_smallint SMALLINT,
    col_integer INTEGER,
    col_bigint BIGINT,
    col_decimal DECIMAL(10,2),
    col_numeric NUMERIC(12,4),
    col_real REAL,
    col_double DOUBLE PRECISION,
    col_money MONEY
);

INSERT INTO pg_type_numeric (col_smallint, col_integer, col_bigint, col_decimal, col_numeric, col_real, col_double, col_money)
VALUES
(32767, 2147483647, 9223372036854775807, 12345.67, 9876.5432, 3.14, 2.718281828459045, '$1234.56'),
(-32768, -2147483648, -9223372036854775808, -99999.99, -1234.5678, -0.001, -999999.999999, '$-99.99'),
(0, 0, 0, 0.00, 0.0000, 0.0, 0.0, '$0.00'),
(NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- ============================================================
-- 测试表2: 字符和二进制类型 (Character & Binary Types)
-- ============================================================
DROP TABLE IF EXISTS pg_type_text;
CREATE TABLE pg_type_text (
    id SERIAL PRIMARY KEY,
    col_char CHAR(10),
    col_varchar VARCHAR(255),
    col_text TEXT,
    col_bytea BYTEA,
    col_name NAME
);

INSERT INTO pg_type_text (col_char, col_varchar, col_text, col_bytea, col_name)
VALUES
('hello     ', 'Hello World', '这是一段长文本，包含中文字符和emoji', E'\\xDEADBEEF', 'test_name'),
('abc       ', '', 'line1\nline2\ttab', E'\\x00FF0102', 'another_name'),
(NULL, NULL, NULL, NULL, NULL);

-- ============================================================
-- 测试表3: 日期和时间类型 (Date & Time Types)
-- ============================================================
DROP TABLE IF EXISTS pg_type_datetime;
CREATE TABLE pg_type_datetime (
    id SERIAL PRIMARY KEY,
    col_date DATE,
    col_time TIME,
    col_timetz TIMETZ,
    col_timestamp TIMESTAMP,
    col_timestamptz TIMESTAMPTZ,
    col_interval INTERVAL
);

INSERT INTO pg_type_datetime (col_date, col_time, col_timetz, col_timestamp, col_timestamptz, col_interval)
VALUES
('2024-12-25', '14:30:00', '14:30:00+08', '2024-12-25 14:30:00', '2024-12-25 14:30:00+08', '1 year 2 months 3 days 04:05:06'),
('1970-01-01', '00:00:00', '00:00:00+00', '1970-01-01 00:00:00', '1970-01-01 00:00:00+00', '0 seconds'),
('2099-12-31', '23:59:59.999999', '23:59:59.999999+12', '2099-12-31 23:59:59.999999', '2099-12-31 23:59:59.999999+12', '-1 year -2 months -3 days'),
(NULL, NULL, NULL, NULL, NULL, NULL);

-- ============================================================
-- 测试表4: 布尔、UUID、JSON、XML 类型
-- ============================================================
DROP TABLE IF EXISTS pg_type_special;
CREATE TABLE pg_type_special (
    id SERIAL PRIMARY KEY,
    col_boolean BOOLEAN,
    col_uuid UUID,
    col_json JSON,
    col_jsonb JSONB,
    col_xml XML
);

INSERT INTO pg_type_special (col_boolean, col_uuid, col_json, col_jsonb, col_xml)
VALUES
(true, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '{"key": "value", "number": 42}', '{"nested": {"array": [1, 2, 3]}}', '<root><item>hello</item></root>'),
(false, '00000000-0000-0000-0000-000000000000', '[]', '{"bool": true, "null_val": null}', '<empty/>'),
(NULL, NULL, NULL, NULL, NULL);

-- ============================================================
-- 测试表5: 网络和几何类型 (Network & Geometric Types)
-- ============================================================
DROP TABLE IF EXISTS pg_type_network;
CREATE TABLE pg_type_network (
    id SERIAL PRIMARY KEY,
    col_inet INET,
    col_cidr CIDR,
    col_macaddr MACADDR,
    col_point POINT,
    col_line LINE,
    col_lseg LSEG,
    col_box BOX,
    col_circle CIRCLE
);

INSERT INTO pg_type_network (col_inet, col_cidr, col_macaddr, col_point, col_line, col_lseg, col_box, col_circle)
VALUES
('192.168.1.1/24', '10.0.0.0/8', '08:00:2b:01:02:03', '(1.5, 2.5)', '{1, -1, 0}', '[(0,0),(1,1)]', '((1,1),(0,0))', '<(0,0),5>'),
('::1/128', '2001:db8::/32', 'FF:FF:FF:FF:FF:FF', '(0, 0)', '{0, 1, 0}', '[(0,0),(100,100)]', '((10,10),(-10,-10))', '<(1,2),3.5>'),
(NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- ============================================================
-- 测试表6: 数组类型 (Array Types)
-- ============================================================
DROP TABLE IF EXISTS pg_type_array;
CREATE TABLE pg_type_array (
    id SERIAL PRIMARY KEY,
    col_int_array INTEGER[],
    col_text_array TEXT[],
    col_float_array DOUBLE PRECISION[],
    col_bool_array BOOLEAN[],
    col_uuid_array UUID[]
);

INSERT INTO pg_type_array (col_int_array, col_text_array, col_float_array, col_bool_array, col_uuid_array)
VALUES
('{1, 2, 3, 4, 5}', '{"hello", "world", "你好"}', '{1.1, 2.2, 3.3}', '{true, false, true}', '{a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11}'),
('{}', '{}', '{}', '{}', '{}'),
(NULL, NULL, NULL, NULL, NULL);

-- ============================================================
-- 测试表7: 范围和全文搜索类型 (Range & Full Text Types)
-- ============================================================
DROP TABLE IF EXISTS pg_type_range;
CREATE TABLE pg_type_range (
    id SERIAL PRIMARY KEY,
    col_int4range INT4RANGE,
    col_int8range INT8RANGE,
    col_numrange NUMRANGE,
    col_tsrange TSRANGE,
    col_tstzrange TSTZRANGE,
    col_daterange DATERANGE,
    col_tsvector TSVECTOR,
    col_tsquery TSQUERY
);

INSERT INTO pg_type_range (col_int4range, col_int8range, col_numrange, col_tsrange, col_tstzrange, col_daterange, col_tsvector, col_tsquery)
VALUES
('[1, 10)', '[100, 1000)', '[1.5, 9.9)', '[2024-01-01, 2024-12-31)', '[2024-01-01 00:00:00+00, 2024-12-31 23:59:59+00)', '[2024-01-01, 2024-12-31)', 'the quick brown fox', 'quick & fox'),
('empty', 'empty', 'empty', 'empty', 'empty', 'empty', '', 'a | b'),
(NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- ============================================================
-- 测试表8: 位串类型 (Bit String Types)
-- ============================================================
DROP TABLE IF EXISTS pg_type_bit;
CREATE TABLE pg_type_bit (
    id SERIAL PRIMARY KEY,
    col_bit BIT(8),
    col_varbit BIT VARYING(16)
);

INSERT INTO pg_type_bit (col_bit, col_varbit)
VALUES
(B'10101010', B'110011'),
(B'00000000', B'0'),
(B'11111111', B'1111111111111111'),
(NULL, NULL);
