-- 创建测试表
CREATE TABLE IF NOT EXISTS test_datetime (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 插入测试数据
INSERT INTO test_datetime (name, price) VALUES
('iPhone', 8999.00),
('MacBook', 14999.00),
('iPad', 5999.00),
('AirPods', 1299.00),
('Apple Watch', 2999.00);

-- 查看数据
SELECT * FROM test_datetime;