const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const url = require("url");

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let filePath = path.join(__dirname, "../front");
  
  // API 엔드포인트 처리
  if (parsedUrl.pathname === "/api/stocks") {
    handleStocksAPI(req, res);
    return;
  }
  
  // 정적 파일 처리
  if (req.url === "/" || req.url === "/index.html") {
    filePath = path.join(filePath, "index.html");
  } else if (req.url === "/style.css") {
    filePath = path.join(filePath, "style.css");
  } else if (req.url === "/script.js") {
    filePath = path.join(filePath, "script.js");
  } else {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end("페이지를 찾을 수 없습니다.");
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      res.end("서버 오류가 발생했습니다.");
      return;
    }

    let contentType = "text/html; charset=utf-8";
    if (filePath.endsWith(".css")) {
      contentType = "text/css";
    } else if (filePath.endsWith(".js")) {
      contentType = "application/javascript";
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
});

// 키움 API 호출 함수 (실제 API만 사용)
function handleStocksAPI(req, res) {
  console.log("키움 API 호출 중...");
  
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // 키움 API 직접 호출 (Node.js)
  callKiwoomAPI()
    .then(stockData => {
      console.log('키움 API 응답 성공');
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(stockData));
    })
    .catch(error => {
      console.error('키움 API 호출 오류:', error.message);
      
      // 실패 시 명확한 오류 반환 (모의 데이터 없음)
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        success: false,
        error: "키움 API 호출 실패",
        message: error.message,
        timestamp: new Date().toISOString()
      }));
    });
}

// 키움 API 호출 함수 (실제 API만 처리)
async function callKiwoomAPI() {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    // 키움증권 API 설정
    const accessParams = {
      grant_type: 'client_credentials',
      appkey: 'O3kJjNLr_qpv4UaI_dlJcu4NZf_8Q4AIGXMu2UZr5WE',
      secretkey: 'AVTWCe2Wi6h4HX3q3oly0FN2Gq5VsvWNz_W7M9c0kNY'
    };
    
    const postData = JSON.stringify(accessParams);
    
    const options = {
      hostname: 'mockapi.kiwoom.com',
      port: 443,
      path: '/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        console.log('키움 API 응답 상태:', response.statusCode);
        console.log('키움 API 응답 데이터:', data);
        
        if (response.statusCode !== 200) {
          reject(new Error(`키움 API HTTP 오류: ${response.statusCode} - ${data}`));
          return;
        }
        
        try {
          const apiResponse = JSON.parse(data);
          
          // 실제 키움 API 응답에서 토큰을 받았다면 주식 데이터 요청
          if (apiResponse.token || apiResponse.access_token) {
            const token = apiResponse.token || apiResponse.access_token;
            console.log('키움 API 토큰 획득 성공:', token.substring(0, 20) + '...');
            
            // 실제 주식 데이터 요청
            getStockDataWithToken(token)
              .then(stockData => resolve(stockData))
              .catch(error => reject(error));
            
          } else {
            reject(new Error('키움 API에서 올바른 토큰을 받지 못함: ' + JSON.stringify(apiResponse)));
          }
          
        } catch (parseError) {
          reject(new Error('키움 API 응답 파싱 실패: ' + parseError.message));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error('키움 API 네트워크 오류: ' + error.message));
    });
    
    req.setTimeout(10000, () => {
      reject(new Error('키움 API 요청 타임아웃 (10초)'));
    });
    
    req.write(postData);
    req.end();
  });
}

// 키움 API 다중 데이터 요청 함수
async function callMultipleKiwoomAPIs(token, symbol, stockName) {
  const https = require('https');
  
  return new Promise((resolve) => {
    const results = {
      symbol: symbol,
      name: stockName,
      currentPrice: null,
      bidAsk: null,
      stockInfo: null,
      dailyChart: null
    };
    
    let completedAPIs = 0;
    const totalAPIs = 4; // 현재가, 호가, 종목정보, 일봉차트
    
    // 1. 현재가 조회 (ka10001)
    const priceParams = new URLSearchParams({ 'stk_cd': symbol });
    const priceOptions = {
      hostname: 'mockapi.kiwoom.com',
      port: 443,
      path: '/api/dostk/price',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': `Bearer ${token}`,
        'api-id': 'ka10001'
      }
    };
    
    const priceReq = https.request(priceOptions, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          results.currentPrice = JSON.parse(data);
          console.log(`✅ ${stockName} 현재가 조회 완료`);
        } catch (e) {
          console.log(`❌ ${stockName} 현재가 파싱 오류:`, e.message);
        }
        completedAPIs++;
        if (completedAPIs === totalAPIs) resolve(results);
      });
    });
    priceReq.on('error', () => { completedAPIs++; if (completedAPIs === totalAPIs) resolve(results); });
    priceReq.write(JSON.stringify({ 'stk_cd': symbol }));
    priceReq.end();
    
    // 2. 호가 조회 (ka10004)
    const bidAskOptions = {
      hostname: 'mockapi.kiwoom.com',
      port: 443,
      path: '/api/dostk/mrkcond',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': `Bearer ${token}`,
        'api-id': 'ka10004'
      }
    };
    
    const bidAskReq = https.request(bidAskOptions, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          results.bidAsk = JSON.parse(data);
          console.log(`✅ ${stockName} 호가 조회 완료`);
        } catch (e) {
          console.log(`❌ ${stockName} 호가 파싱 오류:`, e.message);
        }
        completedAPIs++;
        if (completedAPIs === totalAPIs) resolve(results);
      });
    });
    bidAskReq.on('error', () => { completedAPIs++; if (completedAPIs === totalAPIs) resolve(results); });
    bidAskReq.write(JSON.stringify({ 'stk_cd': symbol }));
    bidAskReq.end();
    
    // 3. 종목정보 조회 (ka10002)
    const infoOptions = {
      hostname: 'mockapi.kiwoom.com',
      port: 443,
      path: '/api/dostk/info',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': `Bearer ${token}`,
        'api-id': 'ka10002'
      }
    };
    
    const infoReq = https.request(infoOptions, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          results.stockInfo = JSON.parse(data);
          console.log(`✅ ${stockName} 종목정보 조회 완료`);
        } catch (e) {
          console.log(`❌ ${stockName} 종목정보 파싱 오류:`, e.message);
        }
        completedAPIs++;
        if (completedAPIs === totalAPIs) resolve(results);
      });
    });
    infoReq.on('error', () => { completedAPIs++; if (completedAPIs === totalAPIs) resolve(results); });
    infoReq.write(JSON.stringify({ 'stk_cd': symbol }));
    infoReq.end();
    
    // 4. 일봉차트 조회 (ka10101)
    const chartOptions = {
      hostname: 'mockapi.kiwoom.com',
      port: 443,
      path: '/api/dostk/chart',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': `Bearer ${token}`,
        'api-id': 'ka10101'
      }
    };
    
    const chartReq = https.request(chartOptions, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          results.dailyChart = JSON.parse(data);
          console.log(`✅ ${stockName} 일봉차트 조회 완료`);
        } catch (e) {
          console.log(`❌ ${stockName} 일봉차트 파싱 오류:`, e.message);
        }
        completedAPIs++;
        if (completedAPIs === totalAPIs) resolve(results);
      });
    });
    chartReq.on('error', () => { completedAPIs++; if (completedAPIs === totalAPIs) resolve(results); });
    chartReq.write(JSON.stringify({ 'stk_cd': symbol, 'period': 'D', 'cnt': 30 }));
    chartReq.end();
  });
}

// 토큰으로 실제 주식 데이터 요청 (다중 API 통합)
async function getStockDataWithToken(token) {
  return new Promise(async (resolve, reject) => {
    // 삼성전자, SK하이닉스, NAVER 주식 데이터 요청
    const stockSymbols = ['005930', '000660', '035420']; // 삼성전자, SK하이닉스, NAVER
    const stockNames = ['삼성전자', 'SK하이닉스', 'NAVER'];
    const stockResults = [];
    
    console.log(`🚀 ${stockSymbols.length}개 종목의 종합 데이터 조회 시작...`);
    
    try {
      // 각 종목별로 다중 API 호출
      for (let i = 0; i < stockSymbols.length; i++) {
        console.log(`📊 ${stockNames[i]} (${stockSymbols[i]}) 데이터 수집 중...`);
        
        const multiApiResult = await callMultipleKiwoomAPIs(token, stockSymbols[i], stockNames[i]);
        
        // 수집된 데이터를 통합해서 최종 결과 생성
        const integratedData = integrateStockData(multiApiResult, i + 1);
        stockResults.push(integratedData);
        
        console.log(`✅ ${stockNames[i]} 데이터 통합 완료`);
      }
      
      resolve({
        success: true,
        data: stockResults,
        message: `키움 API 종합 주식 데이터 (${stockResults.length}개 종목)`,
        lastUpdate: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ 다중 API 호출 오류:', error);
      reject(error);
    }
  });
}

// 다중 API 결과를 통합하는 함수
function integrateStockData(multiApiResult, id) {
  const { symbol, name, currentPrice, bidAsk, stockInfo, dailyChart } = multiApiResult;
  
  // 기본 구조
  let integratedData = {
    id: id,
    symbol: symbol,
    name: name,
    price: 0,
    change: 0,
    changePercent: '0%',
    volume: 0,
    timestamp: new Date().toISOString(),
    rawData: {
      currentPrice: currentPrice,
      bidAsk: bidAsk,
      stockInfo: stockInfo,
      dailyChart: dailyChart
    }
  };
  
  try {
    // 현재가 데이터에서 기본 정보 추출
    if (currentPrice && currentPrice.return_code === 0) {
      // 키움 API 응답 구조에 맞게 데이터 파싱
      if (currentPrice.output) {
        const output = currentPrice.output;
        integratedData.price = parseInt(output.stck_prpr) || 0;
        integratedData.change = parseInt(output.prdy_vrss) || 0;
        integratedData.changePercent = (parseFloat(output.prdy_ctrt) || 0) + '%';
        integratedData.volume = parseInt(output.acml_vol) || 0;
      }
    }
    
    // 호가 데이터에서 추가 정보 추출
    if (bidAsk && bidAsk.return_code === 0) {
      integratedData.bidAskData = {
        buyPrice: bidAsk.buy_fpr_bid || "0",
        sellPrice: bidAsk.sel_fpr_bid || "0",
        buyVolume: parseInt(bidAsk.buy_fpr_req) || 0,
        sellVolume: parseInt(bidAsk.sel_fpr_req) || 0
      };
    }
    
    // 종목 정보에서 기업 정보 추가
    if (stockInfo && stockInfo.return_code === 0) {
      integratedData.companyInfo = {
        marketCap: stockInfo.market_cap || "정보없음",
        sector: stockInfo.sector || "정보없음",
        industry: stockInfo.industry || "정보없음"
      };
    }
    
    // 일봉 차트에서 최근 동향 정보 추가
    if (dailyChart && dailyChart.return_code === 0 && dailyChart.output && dailyChart.output.length > 0) {
      const recentData = dailyChart.output[0]; // 가장 최근 데이터
      integratedData.recentTrend = {
        openPrice: parseInt(recentData.stck_oprc) || 0,
        highPrice: parseInt(recentData.stck_hgpr) || 0,
        lowPrice: parseInt(recentData.stck_lwpr) || 0,
        closePrice: parseInt(recentData.stck_clpr) || 0,
        tradingVolume: parseInt(recentData.acml_vol) || 0
      };
    }
    
    console.log(`📈 ${name} 통합 데이터: 가격 ${integratedData.price}원, 변동 ${integratedData.changePercent}`);
    
  } catch (error) {
    console.error(`❌ ${name} 데이터 통합 중 오류:`, error.message);
    integratedData.error = `데이터 통합 오류: ${error.message}`;
  }
  
  return integratedData;
}

server.listen(3000, () => {
  console.log("🚀 서버가 포트 3000에서 실행 중입니다!");
  console.log("📝 http://localhost:3000 에서 웹사이트를 확인하세요!");
  console.log("📊 키움 API 연동 준비 완료!");
});
