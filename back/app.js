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
      <h1>삼성전자 백테스팅</h1>
      <form id="form">
        <p>초기 자산: <input type="number" id="cash" value="10000000"></p>
        <p>매수 가격: <input type="number" id="buy" value="70000"></p>
        <p>매도 가격: <input type="number" id="sell" value="75000"></p>
        <button type="submit">백테스트 실행</button>
      </form>
      <pre id="result"></pre>
      <script>
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
      </script>
    `);
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not Found" }));
});

// 백테스팅 로직
async function runBacktest(initialCash, buyPrice, sellPrice) {
  // DB에서 삼성전자 데이터 조회
  const [rows] = await db.pool.query(
    'SELECT date, open, close FROM stock_prices ORDER BY date'
  );
  
  let cash = initialCash;
  let shares = 0;
  let trades = 0;
  
  for (const day of rows) {
    // 매수 조건: 시가가 매수가격 이하이고 현금이 있을 때
    if (day.open <= buyPrice && shares === 0 && cash >= day.open) {
      shares = Math.floor(cash / day.open);
      cash -= shares * day.open;
      trades++;
    }
    // 매도 조건: 종가가 매도가격 이상이고 보유주식이 있을 때
    else if (day.close >= sellPrice && shares > 0) {
      cash += shares * day.close;
      shares = 0;
      trades++;
    }
  }
  
  // 남은 주식 정리
  if (shares > 0 && rows.length > 0) {
    cash += shares * rows[rows.length - 1].close;
  }
  
  const profit = cash - initialCash;
  
  // 결과 DB 저장
  await db.pool.query(
    'INSERT INTO backtest_results (initial_cash, final_cash, total_trades, profit) VALUES (?, ?, ?, ?)',
    [initialCash, cash, trades, profit]
  );
  
  return {
    initialCash,
    finalCash: cash,
    profit,
    profitRate: ((profit / initialCash) * 100).toFixed(2) + '%',
    totalTrades: trades
  };
}

server.listen(3000, () => {
  console.log("🚀 서버 실행: http://localhost:3000");
});
