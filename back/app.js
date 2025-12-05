const http = require("http");
const db = require("./db");

// 서버 시작 시 DB 연결 테스트
db.testConnection().then(success => {
  if (success) {
    console.log("✅ 데이터베이스 연결 성공!");
  }
});

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  // 데이터 수집 API
  if (req.url === "/api/fetch-data" && req.method === "POST") {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { symbol, startDate, endDate } = JSON.parse(body);
        const result = await fetchAndSaveData(symbol, startDate, endDate);
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // 주식 데이터 조회 API (기간 필터링 지원)
  if (req.url.startsWith("/api/stock-data") && req.method === "GET") {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      
      let query = 'SELECT date, open, close, rsi FROM stock_prices WHERE symbol = ?';
      let params = ['005930'];
      
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
      res.writeHead(200);
      res.end(JSON.stringify(rows));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // 데이터베이스 초기화 API
  if (req.url === "/api/reset-database" && req.method === "POST") {
    try {
      await db.pool.query('DELETE FROM backtest_trades');
      await db.pool.query('DELETE FROM backtest_results');
      await db.pool.query('DELETE FROM stock_prices');
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: '데이터베이스가 초기화되었습니다.' }));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // 백테스팅 실행 API (가격 기반)
  if (req.url === "/backtest" && req.method === "POST") {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { initialCash, buyPrice, sellPrice } = JSON.parse(body);
        const result = await runBacktestPrice(initialCash, buyPrice, sellPrice);
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // 백테스팅 실행 API (RSI 기반)
  if (req.url === "/backtest-rsi" && req.method === "POST") {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { initialCash, buyRSI, sellRSI } = JSON.parse(body);
        const result = await runBacktestRSI(initialCash, buyRSI, sellRSI);
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  
  // 정적 파일 서빙 (CSS, JS)
  if (req.url === "/style.css") {
    const fs = require('fs');
    const path = require('path');
    const cssPath = path.join(__dirname, '../front/style.css');
    try {
      const css = fs.readFileSync(cssPath, 'utf8');
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.writeHead(200);
      res.end(css);
    } catch (error) {
      res.writeHead(404);
      res.end('CSS not found');
    }
    return;
  }

  if (req.url === "/script.js") {
    const fs = require('fs');
    const path = require('path');
    const jsPath = path.join(__dirname, '../front/script.js');
    try {
      const js = fs.readFileSync(jsPath, 'utf8');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.writeHead(200);
      res.end(js);
    } catch (error) {
      res.writeHead(404);
      res.end('JS not found');
    }
    return;
  }
  
  // 기본 페이지 - front/index.html 서빙
  if (req.url === "/") {
    const fs = require('fs');
    const path = require('path');
    const htmlPath = path.join(__dirname, '../front/index.html');
    try {
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      res.end(html);
    } catch (error) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>삼성전자 주가 데이터</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body { font-family: Arial; padding: 20px; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
          h1 { color: #333; }
          .chart-container { position: relative; height: 400px; margin: 20px 0; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
          .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #0066cc; }
          .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
          .backtest { background: #e8f4f8; padding: 20px; border-radius: 8px; margin-top: 20px; }
          input { padding: 8px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; width: 150px; }
          button { padding: 10px 20px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0052a3; }
          #result, #fetchResult { background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 15px; white-space: pre-wrap; }
          .loading { color: #0066cc; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📈 삼성전자 (005930) 주가 데이터</h1>
          
          <div class="backtest" style="background: #fff3cd; margin-bottom: 20px;">
            <h2>🔄 데이터 수집</h2>
            <form id="fetchForm">
              종목코드: <input type="text" id="symbol" value="005930" placeholder="005930">
              시작일: <input type="text" id="fetchStartDate" placeholder="2024-01-01 또는 20240101" required>
              종료일: <input type="text" id="fetchEndDate" placeholder="2024-12-31 또는 20241231" required>
              <button type="submit">데이터 수집 & DB 저장</button>
            </form>
            <div id="fetchResult"></div>
          </div>
          
          <div class="stats" id="stats"></div>
          
          <div class="chart-container">
            <canvas id="priceChart"></canvas>
          </div>
          
          <div class="chart-container">
            <canvas id="rsiChart"></canvas>
          </div>
          
          <div class="backtest">
            <h2>백테스팅</h2>
            <form id="form">
              초기 자산: <input type="number" id="cash" value="10000000">
              매수 가격: <input type="number" id="buy" value="70000">
              매도 가격: <input type="number" id="sell" value="75000">
              <button type="submit">실행</button>
            </form>
            <div id="result"></div>
          </div>
        </div>
        
        <script>
          let priceChart, rsiChart;
          
          async function loadData(startDate = null, endDate = null) {
            let url = '/api/stock-data';
            if (startDate || endDate) {
              const params = new URLSearchParams();
              if (startDate) params.append('startDate', startDate);
              if (endDate) params.append('endDate', endDate);
              url += '?' + params.toString();
            }
            
            const res = await fetch(url);
            const data = await res.json();
            
            // 통계 표시
            const latest = data[data.length - 1];
            const oldest = data[0];
            
            // RSI 값이 있는 데이터만 필터링하여 평균 계산
            const validRsi = data.filter(d => d.rsi !== null && d.rsi !== undefined);
            const avgRsi = validRsi.length > 0 
              ? (validRsi.reduce((sum, d) => sum + parseFloat(d.rsi), 0) / validRsi.length).toFixed(2)
              : 'N/A';
            
            document.getElementById('stats').innerHTML = \`
              <div class="stat-card">
                <div class="stat-value">\${data.length}</div>
                <div class="stat-label">총 데이터</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">\${latest.close.toLocaleString()}원</div>
                <div class="stat-label">최근 종가</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">\${latest.rsi}</div>
                <div class="stat-label">최근 RSI</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">\${avgRsi}</div>
                <div class="stat-label">평균 RSI</div>
              </div>
            \`;
            
            // 가격 차트
            const priceCtx = document.getElementById('priceChart').getContext('2d');
            priceChart = new Chart(priceCtx, {
              type: 'line',
              data: {
                labels: data.map(d => d.date.split('T')[0]),
                datasets: [{
                  label: '시가',
                  data: data.map(d => d.open),
                  borderColor: 'rgba(75, 192, 192, 1)',
                  backgroundColor: 'rgba(75, 192, 192, 0.1)',
                  tension: 0.1
                }, {
                  label: '종가',
                  data: data.map(d => d.close),
                  borderColor: 'rgba(255, 99, 132, 1)',
                  backgroundColor: 'rgba(255, 99, 132, 0.1)',
                  tension: 0.1
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  title: { display: true, text: '주가 추이' }
                }
              }
            });
            
            // RSI 차트
            const rsiCtx = document.getElementById('rsiChart').getContext('2d');
            rsiChart = new Chart(rsiCtx, {
              type: 'line',
              data: {
                labels: data.map(d => d.date.split('T')[0]),
                datasets: [{
                  label: 'RSI',
                  data: data.map(d => d.rsi),
                  borderColor: 'rgba(153, 102, 255, 1)',
                  backgroundColor: 'rgba(153, 102, 255, 0.1)',
                  tension: 0.1
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  title: { display: true, text: 'RSI 지표' },
                  annotation: {
                    annotations: {
                      line1: { type: 'line', yMin: 70, yMax: 70, borderColor: 'red', borderWidth: 1, borderDash: [5, 5] },
                      line2: { type: 'line', yMin: 30, yMax: 30, borderColor: 'blue', borderWidth: 1, borderDash: [5, 5] }
                    }
                  }
                },
                scales: {
                  y: { min: 0, max: 100 }
                }
              }
            });
          }
          
          document.getElementById('fetchForm').onsubmit = async (e) => {
            e.preventDefault();
            const resultDiv = document.getElementById('fetchResult');
            
            let startDate = document.getElementById('fetchStartDate').value.trim();
            let endDate = document.getElementById('fetchEndDate').value.trim();
            
            // 날짜 형식 정규화: YYYYMMDD -> YYYY-MM-DD
            const formatDate = (date) => {
              // 이미 YYYY-MM-DD 형식인 경우
              if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
              // YYYYMMDD 형식인 경우
              if (/^\d{8}$/.test(date)) {
                return date.substring(0, 4) + '-' + date.substring(4, 6) + '-' + date.substring(6, 8);
              }
              return date;
            };
            
            startDate = formatDate(startDate);
            endDate = formatDate(endDate);
            
            if (!startDate || !endDate) {
              resultDiv.innerHTML = '<div style="color: red;">❌ 시작일과 종료일을 모두 입력해주세요</div>';
              return;
            }
            
            if (new Date(startDate) > new Date(endDate)) {
              resultDiv.innerHTML = '<div style="color: red;">❌ 시작일이 종료일보다 늦습니다</div>';
              return;
            }
            
            resultDiv.innerHTML = '<div class="loading">⏳ 데이터 수집 중...</div>';
            
            const data = {
              symbol: document.getElementById('symbol').value,
              startDate: startDate,
              endDate: endDate
            };
            
            try {
              const res = await fetch('/api/fetch-data', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
              });
              const result = await res.json();
              
              if (result.success) {
                resultDiv.innerHTML = \`<div style="color: green;">✅ \${result.message}</div>\`;
                setTimeout(() => location.reload(), 2000);
              } else {
                resultDiv.innerHTML = \`<div style="color: red;">❌ \${result.error}</div>\`;
              }
            } catch (error) {
              resultDiv.innerHTML = \`<div style="color: red;">❌ 오류: \${error.message}</div>\`;
            }
          };
          
          document.getElementById('form').onsubmit = async (e) => {
            e.preventDefault();
            const data = {
              initialCash: Number(document.getElementById('cash').value),
              buyPrice: Number(document.getElementById('buy').value),
              sellPrice: Number(document.getElementById('sell').value)
            };
            const res = await fetch('/backtest', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(data)
            });
            const result = await res.json();
            document.getElementById('result').textContent = JSON.stringify(result, null, 2);
          };
          
          loadData();
        </script>
      </body>
      </html>
    `);
    }
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not Found" }));
});

// 백테스팅 로직 (가격 기반)
async function runBacktestPrice(initialCash, buyPrice, sellPrice, symbol = '005930') {
  // DB에서 해당 종목 데이터 조회
  const [rows] = await db.pool.query(
    'SELECT date, open, close, rsi FROM stock_prices WHERE symbol = ? ORDER BY date',
    [symbol]
  );
  
  let cash = initialCash;
  let shares = 0;
  let trades = 0;
  const tradeHistory = [];
  
  for (const day of rows) {
    // 매도 조건: 종가가 매도가격 이상이고 보유주식이 있을 때 (먼저 체크)
    if (day.close >= sellPrice && shares > 0) {
      const amount = shares * day.close;
      cash += amount;
      tradeHistory.push({
        date: day.date,
        type: 'SELL',
        price: day.close,
        shares: shares,
        amount: amount
      });
      shares = 0;
      trades++;
    }
    
    // 매수 조건: 시가가 매수가격 이하이고 주식을 보유하지 않았을 때
    if (day.open <= buyPrice && shares === 0 && cash >= day.open) {
      shares = Math.floor(cash / day.open);
      const amount = shares * day.open;
      cash -= amount;
      trades++;
      tradeHistory.push({
        date: day.date,
        type: 'BUY',
        price: day.open,
        shares: shares,
        amount: amount
      });
    }
  }
  
  // 남은 주식 정리
  if (shares > 0 && rows.length > 0) {
    const lastPrice = rows[rows.length - 1].close;
    const amount = shares * lastPrice;
    cash += amount;
    tradeHistory.push({
      date: rows[rows.length - 1].date,
      type: 'SELL',
      price: lastPrice,
      shares: shares,
      amount: amount
    });
  }
  
  const profit = cash - initialCash;
  
  // 결과 DB 저장
  const [result] = await db.pool.query(
    'INSERT INTO backtest_results (initial_cash, final_cash, total_trades, profit) VALUES (?, ?, ?, ?)',
    [initialCash, cash, trades, profit]
  );
  
  const backtestId = result.insertId;
  
  // 거래 내역 저장
  for (const trade of tradeHistory) {
    await db.pool.query(
      'INSERT INTO backtest_trades (backtest_id, trade_date, trade_type, price, shares, amount) VALUES (?, ?, ?, ?, ?, ?)',
      [backtestId, trade.date, trade.type, trade.price, trade.shares, trade.amount]
    );
  }
  
  return {
    initialCash,
    finalCash: cash,
    profit,
    profitRate: ((profit / initialCash) * 100).toFixed(2) + '%',
    totalTrades: trades,
    trades: tradeHistory
  };
}

// 백테스팅 로직 (RSI 기반)
async function runBacktestRSI(initialCash, buyRSI, sellRSI, symbol = '005930') {
  // DB에서 해당 종목 데이터 조회
  const [rows] = await db.pool.query(
    'SELECT date, open, close, rsi FROM stock_prices WHERE symbol = ? AND rsi IS NOT NULL ORDER BY date',
    [symbol]
  );
  
  let cash = initialCash;
  let shares = 0;
  let trades = 0;
  const tradeHistory = [];
  
  for (const day of rows) {
    const rsi = parseFloat(day.rsi);
    
    // RSI 값이 유효하지 않으면 스킵
    if (isNaN(rsi)) continue;
    
    // 매수 조건: RSI가 매수 기준 이하이고 현금이 있을 때
    if (rsi <= buyRSI && shares === 0 && cash >= day.open) {
      shares = Math.floor(cash / day.open);
      const amount = shares * day.open;
      cash -= amount;
      trades++;
      tradeHistory.push({
        date: day.date,
        type: 'BUY',
        price: day.open,
        shares: shares,
        amount: amount,
        rsi: rsi
      });
    }
    // 매도 조건: RSI가 매도 기준 이상이고 보유주식이 있을 때
    else if (rsi >= sellRSI && shares > 0) {
      const amount = shares * day.close;
      cash += amount;
      tradeHistory.push({
        date: day.date,
        type: 'SELL',
        price: day.close,
        shares: shares,
        amount: amount,
        rsi: rsi
      });
      shares = 0;
      trades++;
    }
  }
  
  // 남은 주식 정리
  if (shares > 0 && rows.length > 0) {
    const lastPrice = rows[rows.length - 1].close;
    const lastRSI = parseFloat(rows[rows.length - 1].rsi);
    const amount = shares * lastPrice;
    cash += amount;
    tradeHistory.push({
      date: rows[rows.length - 1].date,
      type: 'SELL',
      price: lastPrice,
      shares: shares,
      amount: amount,
      rsi: lastRSI
    });
  }
  
  const profit = cash - initialCash;
  
  // 결과 DB 저장
  const [result] = await db.pool.query(
    'INSERT INTO backtest_results (initial_cash, final_cash, total_trades, profit) VALUES (?, ?, ?, ?)',
    [initialCash, cash, trades, profit]
  );
  
  const backtestId = result.insertId;
  
  // 거래 내역 저장
  for (const trade of tradeHistory) {
    await db.pool.query(
      'INSERT INTO backtest_trades (backtest_id, trade_date, trade_type, price, shares, amount) VALUES (?, ?, ?, ?, ?, ?)',
      [backtestId, trade.date, trade.type, trade.price, trade.shares, trade.amount]
    );
  }
  
  return {
    initialCash,
    finalCash: cash,
    profit,
    profitRate: ((profit / initialCash) * 100).toFixed(2) + '%',
    totalTrades: trades,
    trades: tradeHistory
  };
}

// 데이터 수집 및 저장 함수
async function fetchAndSaveData(symbol, startDate, endDate) {
  const { spawn } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  
  console.log('받은 날짜:', { startDate, endDate });
  
  // 기간 계산: 시작일부터 종료일까지 일수 + 여유분
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // 날짜 유효성 검사
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error(`잘못된 날짜 형식: startDate=${startDate}, endDate=${endDate}`);
  }
  
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const rows = Math.max(daysDiff * 2, 300); // 주말/공휴일 고려하여 2배 + RSI 계산용 14일 여유분
  
  console.log('계산된 값:', { daysDiff, rows });
  
  // 1. Python 스크립트 실행
  const pythonScript = path.join(__dirname, '../API_pull/fetch_rsi.py');
  const args = [pythonScript, symbol, '--rows', rows.toString()];
  
  // 날짜 범위 전달 (YYYY-MM-DD -> YYYYMMDD)
  const startDateFormatted = startDate.replace(/-/g, '');
  const endDateFormatted = endDate.replace(/-/g, '');
  args.push('--start-date', startDateFormatted);
  args.push('--end-date', endDateFormatted);
  args.push('--base-date', endDateFormatted);
  
  console.log('Python 실행:', args.join(' '));
  
  const python = spawn('python', args);
  
  let csvFileName = '';
  let outputBuffer = '';
  
  return new Promise((resolve, reject) => {
    python.stdout.on('data', (data) => {
      const output = data.toString();
      outputBuffer += output;
      console.log(output);
      
      // CSV 파일명 추출
      const match = output.match(/rsi_\w+_\d+\.csv/);
      if (match) {
        csvFileName = match[0];
        console.log('CSV 파일명 발견:', csvFileName);
      }
    });
    
    python.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    
    python.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}`));
        return;
      }
      
      // 파일명을 못 찾았으면 출력 전체에서 다시 검색
      if (!csvFileName) {
        const match = outputBuffer.match(/rsi_\w+_\d+\.csv/);
        if (match) {
          csvFileName = match[0];
          console.log('출력 버퍼에서 CSV 파일명 발견:', csvFileName);
        }
      }
      
      if (!csvFileName) {
        console.error('전체 출력:', outputBuffer);
        reject(new Error('CSV file name not found in output'));
        return;
      }
      
      try {
        // 2. stock_prices 테이블 초기화
        await db.pool.query('DELETE FROM stock_prices WHERE symbol = ?', [symbol]);
        
        // 3. CSV 파일을 DB에 저장
        const csvPath = path.join(__dirname, '../API_pull/data', csvFileName);
        console.log('CSV 파일 경로:', csvPath);
        
        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.trim().split(/\r?\n/);  // Windows/Unix 줄바꿈 모두 처리
        console.log('총 라인 수:', lines.length);
        
        const headers = lines[0].split(',');
        console.log('헤더:', headers);
        
        let imported = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const row = {};
          
          headers.forEach((header, idx) => {
            row[header.trim()] = values[idx];
          });
          
          if (!row.date) continue;  // date가 없으면 스킵
          
          const dateStr = row.date;
          const formattedDate = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
          
          await db.pool.query(
            `INSERT INTO stock_prices (symbol, date, open, close, rsi, avg_gain, avg_loss) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [symbol, formattedDate, row.open, row.close, row.rsi || null, row.avg_gain || null, row.avg_loss || null]
          );
          imported++;
        }
        
        console.log('저장 완료:', imported, '개');
        
        resolve({
          success: true,
          message: `${symbol} 데이터 ${imported}개 저장 완료`,
          imported,
          csvFile: csvFileName
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

server.listen(3000, () => {
  console.log("🚀 서버 실행: http://localhost:3000");
});
