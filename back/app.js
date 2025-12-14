/**
 * Plain Backtest 백엔드
 * - 데이터 수집: /api/fetch-data (Python fetch_rsi.py 실행 후 DB 저장)
 * - 시세 조회:   /api/stock-data?symbol=005930&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * - 백테스트:    /api/backtest (가격 기반 / RSI 전략 모두 처리)
 * DB: MySQL (db/index.js 설정)
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../front')));

// DB 연결 확인
db.testConnection().then((ok) => {
  if (ok) console.log('[DB] 연결 성공');
  else console.warn('[DB] 연결 실패');
});

// 기간별 시세 조회
app.get('/api/stock-data', async (req, res) => {
  try {
    const symbol = req.query.symbol || '005930';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    let query = 'SELECT date, open, close, rsi FROM stock_prices WHERE symbol = ?';
    const params = [symbol];
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    query += ' ORDER BY date';

    const [rows] = await db.pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 데이터 수집 (Python 스크립트 실행)
app.post('/api/fetch-data', async (req, res) => {
  try {
    const { symbol = '005930', startDate, endDate } = req.body || {};
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate와 endDate를 입력하세요. (YYYY-MM-DD)' });
    }
    const result = await fetchAndSaveData(symbol, startDate, endDate);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 백테스트 (가격 기반 / RSI 모두 처리)
app.post('/api/backtest', async (req, res) => {
  try {
    const params = req.body || {};
    const symbol = params.symbol || '005930';
    const startDate = params.periodStart || null;
    const endDate = params.periodEnd || null;

    let result;
    if (params.strategy === 'RSI 전략') {
      result = await runBacktestRSI({
        symbol,
        startDate,
        endDate,
        initialCash: Number(params.initialCash || 1000000),
        buyRSI: Number(params.buyRSI || 30),
        sellRSI: Number(params.sellRSI || 70),
      });
    } else {
      result = await runBacktestPrice({
        symbol,
        startDate,
        endDate,
        initialCash: Number(params.initialCash || 1000000),
        buyPrice: Number(params.buyPrice || 60000),
        sellPrice: Number(params.sellPrice || 66000),
      });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 백테스트 결과 목록 조회
app.get('/api/backtest-results', async (req, res) => {
  try {
    const [results] = await db.pool.query(
      'SELECT * FROM backtest_results ORDER BY created_at DESC LIMIT 20'
    );
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 특정 백테스트의 거래 내역 조회
app.get('/api/backtest-trades/:backtestId', async (req, res) => {
  try {
    const [trades] = await db.pool.query(
      'SELECT * FROM backtest_trades WHERE backtest_id = ? ORDER BY trade_date',
      [req.params.backtestId]
    );
    res.json(trades);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DB 관리 API
app.post('/api/maintenance/reset-ids', async (req, res) => {
  try {
    await db.pool.query('ALTER TABLE stock_prices AUTO_INCREMENT = 1');
    await db.pool.query('ALTER TABLE backtest_results AUTO_INCREMENT = 1');
    await db.pool.query('ALTER TABLE backtest_trades AUTO_INCREMENT = 1');
    res.json({ success: true, message: 'ID 카운터가 리셋되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/maintenance/old-data', async (req, res) => {
  try {
    const daysToKeep = req.query.days || 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const dateStr = cutoffDate.toISOString().slice(0, 10);
    
    const [result] = await db.pool.query(
      'DELETE FROM stock_prices WHERE date < ?',
      [dateStr]
    );
    res.json({ success: true, deleted: result.affectedRows, cutoffDate: dateStr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/database', async (req, res) => {
  try {
    const [prices] = await db.pool.query(
      'SELECT COUNT(*) as count, MIN(date) as oldest, MAX(date) as newest, MAX(id) as max_id FROM stock_prices'
    );
    const [results] = await db.pool.query(
      'SELECT COUNT(*) as count, MAX(id) as max_id FROM backtest_results'
    );
    const [trades] = await db.pool.query(
      'SELECT COUNT(*) as count, MAX(id) as max_id FROM backtest_trades'
    );
    res.json({
      stock_prices: prices[0],
      backtest_results: results[0],
      backtest_trades: trades[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 정적 파일 (프런트)
app.get('/', (_req, res) => {
  const htmlPath = path.join(__dirname, '../front/index.html');
  if (fs.existsSync(htmlPath)) return res.sendFile(htmlPath);
  return res.status(404).send('index.html not found');
});
app.get('/style.css', (_req, res) => res.sendFile(path.join(__dirname, '../front/style.css')));
app.get('/script.js', (_req, res) => res.sendFile(path.join(__dirname, '../front/script.js')));
app.get('/chart.min.js', (_req, res) => res.sendFile(path.join(__dirname, '../front/chart.min.js')));

// 서버 실행
app.listen(PORT, () => {
  console.log(`[SERVER] http://localhost:${PORT}`);
});

// -----------------------------
// 비즈니스 로직
// -----------------------------

async function fetchAndSaveData(symbol, startDate, endDate) {
  console.log('[fetch-data] 요청', { symbol, startDate, endDate });
  const pythonCmd = process.env.PYTHON_CMD || 'python';
  const script = path.join(__dirname, '../API_pull/fetch_rsi.py');
  const args = [
    script,
    symbol,
    '--rows',
    '1200',
    '--start-date',
    startDate.replace(/-/g, ''),
    '--end-date',
    endDate.replace(/-/g, ''),
    '--base-date',
    endDate.replace(/-/g, ''),
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonCmd, args);
    let buffer = '';
    let csvFile = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      buffer += text;
      const match = text.match(/rsi_\w+_\d+\.csv/);
      if (match) csvFile = match[0];
    });

    proc.stderr.on('data', (data) => console.error(data.toString()));

    proc.on('close', async (code) => {
      if (code !== 0) console.warn(`[fetch-data] python 종료 코드 ${code}, 폴백 시도`);

      if (!csvFile) {
        const match = buffer.match(/rsi_\w+_\d+\.csv/);
        if (match) csvFile = match[0];
      }
      if (!csvFile) {
        // 최신 CSV 파일을 폴백으로 사용
        const folder = path.join(__dirname, '../API_pull/data');
        const files = fs.readdirSync(folder).filter(f => f.startsWith(`rsi_${symbol}`) && f.endsWith('.csv'));
        files.sort((a, b) => fs.statSync(path.join(folder, b)).mtimeMs - fs.statSync(path.join(folder, a)).mtimeMs);
        if (files.length) {
          csvFile = files[0];
          console.log('[fetch-data] fallback csv 사용:', csvFile);
        }
      }
      if (!csvFile) return reject(new Error('CSV 파일명을 찾지 못했습니다.'));

      const csvPath = path.join(__dirname, '../API_pull/data', csvFile);
      if (!fs.existsSync(csvPath)) return reject(new Error(`CSV 파일 없음: ${csvPath}`));

      // UNIQUE KEY를 이용한 중복 방지 (ID 증가 방지)
      const content = fs.readFileSync(csvPath, 'utf8').trim();
      const lines = content.split(/\r?\n/);
      const headers = lines[0].split(',');

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const row = {};
        headers.forEach((h, idx) => (row[h.trim()] = cols[idx]));
        if (!row.date) continue;
        const d = `${row.date.slice(0, 4)}-${row.date.slice(4, 6)}-${row.date.slice(6, 8)}`;
        await db.pool.query(
      `INSERT INTO stock_prices (symbol, date, open, close, rsi, avg_gain, avg_loss)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE open=VALUES(open), close=VALUES(close), rsi=VALUES(rsi), avg_gain=VALUES(avg_gain), avg_loss=VALUES(avg_loss)`,
          [symbol, d, row.open, row.close, row.rsi || null, row.avg_gain || null, row.avg_loss || null],
        );
      }

      resolve({ success: true, message: `${symbol} 데이터 저장 완료`, csvFile });
    });
  });
}

async function loadPriceRows({ symbol, startDate, endDate }) {
  let query = 'SELECT date, open, close, rsi FROM stock_prices WHERE symbol = ?';
  const params = [symbol];
  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }
  query += ' ORDER BY date';
  const [rows] = await db.pool.query(query, params);
  return rows;
}

function calcMDD(values) {
  let peak = values[0] || 0;
  let mdd = 0;
  values.forEach((v) => {
    if (v > peak) peak = v;
    const draw = (peak - v) / peak;
    if (draw > mdd) mdd = draw;
  });
  return (mdd * 100).toFixed(2) + '%';
}

async function runBacktestPrice({ symbol, startDate, endDate, initialCash, buyPrice, sellPrice }) {
  const rows = await loadPriceRows({ symbol, startDate, endDate });
  if (!rows.length) throw new Error('시세 데이터가 없습니다. 먼저 데이터를 수집하세요.');

  let cash = initialCash;
  let shares = 0;
  const trades = [];
  const equity = [];
  const labels = [];

  rows.forEach((day) => {
    const dateStr = day.date instanceof Date ? day.date.toISOString().slice(0, 10) : String(day.date).slice(0, 10);

    // 매도 먼저 체크
    if (shares > 0 && day.close >= sellPrice) {
      const amount = shares * day.close;
      cash += amount;
      trades.push({ date: dateStr, type: 'SELL', price: Number(day.close), shares, amount: Number(amount) });
      shares = 0;
    }

    // 매수
    if (shares === 0 && day.open <= buyPrice && cash >= day.open) {
      shares = Math.floor(cash / day.open);
      const amount = shares * day.open;
      cash -= amount;
      trades.push({ date: dateStr, type: 'BUY', price: Number(day.open), shares, amount: Number(amount) });
    }

    const portfolio = cash + shares * day.close;
    equity.push(Number(portfolio));
    labels.push(dateStr);
  });

  if (shares > 0) {
    const last = rows[rows.length - 1];
    const dateStr = last.date instanceof Date ? last.date.toISOString().slice(0, 10) : String(last.date).slice(0, 10);
    const amount = shares * last.close;
    cash += amount;
    trades.push({ date: dateStr, type: 'SELL', price: Number(last.close), shares, amount: Number(amount) });
    shares = 0;
  }

  const finalValue = cash;
  const profit = finalValue - initialCash;
  const profitRate = ((profit / initialCash) * 100).toFixed(2) + '%';
  const mdd = calcMDD(equity);
  const completed = trades.filter((t) => t.type === 'SELL');
  const winTrades = completed.filter((t, idx) => {
    const buy = trades.slice(0, trades.indexOf(t)).reverse().find((x) => x.type === 'BUY');
    return buy ? t.price > buy.price : false;
  });
  const winRate = completed.length ? ((winTrades.length / completed.length) * 100).toFixed(1) + '%' : '-';

  const daily = equity.map((value, idx) => {
    const prev = idx === 0 ? initialCash : equity[idx - 1];
    const dailyReturn = ((value - prev) / prev) * 100;
    return {
      date: labels[idx],
      dailyReturn: dailyReturn.toFixed(2),
      cumulative: ((value - initialCash) / initialCash * 100).toFixed(2),
      portfolio: Math.round(value),
    };
  });

  // DB에 백테스트 결과 저장
  const [resultInsert] = await db.pool.query(
    'INSERT INTO backtest_results (initial_cash, final_cash, total_trades, profit) VALUES (?, ?, ?, ?)',
    [initialCash, finalValue, trades.length, profit]
  );
  const backtestId = resultInsert.insertId;

  // 거래 내역 저장
  for (const trade of trades) {
    await db.pool.query(
      'INSERT INTO backtest_trades (backtest_id, trade_date, trade_type, price, shares, amount) VALUES (?, ?, ?, ?, ?, ?)',
      [backtestId, trade.date, trade.type, trade.price, trade.shares, trade.amount]
    );
  }

  return {
    backtestId,
    params: { strategy: '가격 기반', buyPrice, sellPrice, initialCash, periodStart: startDate, periodEnd: endDate },
    equityLabels: labels,
    equityData: equity,
    trades,
    daily,
    summary: {
      profit: Math.round(profit),
      profitRate,
      mdd,
      tradeCount: trades.length,
      winRate,
    },
  };
}

async function runBacktestRSI({ symbol, startDate, endDate, initialCash, buyRSI, sellRSI }) {
  const rows = await loadPriceRows({ symbol, startDate, endDate });
  if (!rows.length) throw new Error('시세 데이터가 없습니다. 먼저 데이터를 수집하세요.');

  let cash = initialCash;
  let shares = 0;
  const trades = [];
  const equity = [];
  const labels = [];

  rows.forEach((day) => {
    const rsi = day.rsi !== null ? Number(day.rsi) : null;
    if (rsi === null || Number.isNaN(rsi)) return;
    const dateStr = day.date instanceof Date ? day.date.toISOString().slice(0, 10) : String(day.date).slice(0, 10);

    if (shares === 0 && rsi <= buyRSI && cash >= day.open) {
      shares = Math.floor(cash / day.open);
      const amount = shares * day.open;
      cash -= amount;
      trades.push({ date: dateStr, type: 'BUY', price: Number(day.open), shares, amount: Number(amount), rsi });
    } else if (shares > 0 && rsi >= sellRSI) {
      const amount = shares * day.close;
      cash += amount;
      trades.push({ date: dateStr, type: 'SELL', price: Number(day.close), shares, amount: Number(amount), rsi });
      shares = 0;
    }

    const portfolio = cash + shares * day.close;
    equity.push(Number(portfolio));
    labels.push(dateStr);
  });

  if (shares > 0) {
    const last = rows[rows.length - 1];
    const dateStr = last.date instanceof Date ? last.date.toISOString().slice(0, 10) : String(last.date).slice(0, 10);
    const amount = shares * last.close;
    cash += amount;
    trades.push({ date: dateStr, type: 'SELL', price: Number(last.close), shares, amount: Number(amount), rsi: Number(last.rsi) });
    shares = 0;
  }

  const finalValue = cash;
  const profit = finalValue - initialCash;
  const profitRate = ((profit / initialCash) * 100).toFixed(2) + '%';
  const mdd = calcMDD(equity);
  const completed = trades.filter((t) => t.type === 'SELL');
  const winTrades = completed.filter((t) => {
    const buy = trades.slice(0, trades.indexOf(t)).reverse().find((x) => x.type === 'BUY');
    return buy ? t.price > buy.price : false;
  });
  const winRate = completed.length ? ((winTrades.length / completed.length) * 100).toFixed(1) + '%' : '-';

  const daily = equity.map((value, idx) => {
    const prev = idx === 0 ? initialCash : equity[idx - 1];
    const dailyReturn = ((value - prev) / prev) * 100;
    return {
      date: labels[idx],
      dailyReturn: dailyReturn.toFixed(2),
      cumulative: ((value - initialCash) / initialCash * 100).toFixed(2),
      portfolio: Math.round(value),
    };
  });

  // DB에 백테스트 결과 저장
  const [resultInsert] = await db.pool.query(
    'INSERT INTO backtest_results (initial_cash, final_cash, total_trades, profit) VALUES (?, ?, ?, ?)',
    [initialCash, finalValue, trades.length, profit]
  );
  const backtestId = resultInsert.insertId;

  // 거래 내역 저장
  for (const trade of trades) {
    await db.pool.query(
      'INSERT INTO backtest_trades (backtest_id, trade_date, trade_type, price, shares, amount) VALUES (?, ?, ?, ?, ?, ?)',
      [backtestId, trade.date, trade.type, trade.price, trade.shares, trade.amount]
    );
  }

  return {
    backtestId,
    params: { strategy: 'RSI 전략', buyRSI, sellRSI, initialCash, periodStart: startDate, periodEnd: endDate },
    equityLabels: labels,
    equityData: equity,
    trades,
    daily,
    summary: {
      profit: Math.round(profit),
      profitRate,
      mdd,
      tradeCount: trades.length,
      winRate,
    },
  };
}
