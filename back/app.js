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
  
  // 주식 데이터 조회 API
  if (req.url === "/api/stock-data" && req.method === "GET") {
    try {
      const [rows] = await db.pool.query(
        'SELECT date, open, close, rsi FROM stock_prices WHERE symbol = ? ORDER BY date',
        ['005930']
      );
      res.writeHead(200);
      res.end(JSON.stringify(rows));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // 백테스팅 실행 API
  if (req.url === "/backtest" && req.method === "POST") {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { initialCash, buyPrice, sellPrice } = JSON.parse(body);
        const result = await runBacktest(initialCash, buyPrice, sellPrice);
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  
  // 기본 페이지
  if (req.url === "/") {
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
          #result { background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 15px; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📈 삼성전자 (005930) 주가 데이터</h1>
          
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
          
          async function loadData() {
            const res = await fetch('/api/stock-data');
            const data = await res.json();
            
            // 통계 표시
            const latest = data[data.length - 1];
            const oldest = data[0];
            const avgRsi = (data.reduce((sum, d) => sum + (d.rsi || 0), 0) / data.length).toFixed(2);
            
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
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not Found" }));
});

// 백테스팅 로직
async function runBacktest(initialCash, buyPrice, sellPrice, symbol = '005930') {
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
    // 매수 조건: 시가가 매수가격 이하이고 현금이 있을 때
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
    // 매도 조건: 종가가 매도가격 이상이고 보유주식이 있을 때
    else if (day.close >= sellPrice && shares > 0) {
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

server.listen(3000, () => {
  console.log("🚀 서버 실행: http://localhost:3000");
});
