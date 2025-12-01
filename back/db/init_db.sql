-- Active: 1764073077281@@127.0.0.1@3306@stock_database
-- 주식 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS stock_database DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE stock_database;

-- 삼성전자 일봉 데이터
CREATE TABLE IF NOT EXISTS stock_prices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    open DECIMAL(10,2) NOT NULL,
    high DECIMAL(10,2) NOT NULL,
    low DECIMAL(10,2) NOT NULL,
    close DECIMAL(10,2) NOT NULL,
    UNIQUE KEY (date)
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

SELECT 'DB 초기화 완료!' AS status;

