-- Active: 1764073077281@@127.0.0.1@3306@stock_database
-- 주식 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS stock_database DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE stock_database;

-- 주식 일봉 데이터
CREATE TABLE IF NOT EXISTS stock_prices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    open DECIMAL(10,2) NOT NULL,
    close DECIMAL(10,2) NOT NULL,
    rsi DECIMAL(5,2),
    avg_gain DECIMAL(10,4),
    avg_loss DECIMAL(10,4),
    UNIQUE KEY (symbol, date),
    INDEX idx_symbol (symbol),
    INDEX idx_date (date)
);

-- 백테스팅 결과
CREATE TABLE IF NOT EXISTS backtest_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    initial_cash DECIMAL(15,2) NOT NULL,
    final_cash DECIMAL(15,2) NOT NULL,
    total_trades INT NOT NULL,
    profit DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 백테스팅 거래 내역
CREATE TABLE IF NOT EXISTS backtest_trades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    backtest_id INT NOT NULL,
    trade_date DATE NOT NULL,
    trade_type ENUM('BUY', 'SELL') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    shares INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (backtest_id) REFERENCES backtest_results(id) ON DELETE CASCADE
);

SELECT 'DB 초기화 완료!' AS status;

