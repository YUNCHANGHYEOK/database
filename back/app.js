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

// 키움 API 호가 데이터로 주식 정보 추출 (실제 작동하는 ka10004만 사용)
async function getKiwoomStockData(token, symbol, stockName) {
  const https = require('https');
  
  return new Promise((resolve) => {
    console.log(`📊 ${stockName} (${symbol}) 호가 데이터 조회 중...`);
    
    const bidAskOptions = {
      hostname: 'mockapi.kiwoom.com',
      port: 443,
      path: '/api/dostk/mrkcond',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': `Bearer ${token}`,
        'cont-yn': 'N',
        'next-key': '',
        'api-id': 'ka10004'
      }
    };
    
    const bidAskReq = https.request(bidAskOptions, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`✅ ${stockName} 호가 데이터 수신 완료 (${response.statusCode})`);
          
          resolve({
            symbol: symbol,
            name: stockName,
            bidAskData: result,
            success: response.statusCode === 200 && result.return_code === 0
          });
          
        } catch (e) {
          console.log(`❌ ${stockName} 데이터 파싱 오류:`, e.message);
          resolve({
            symbol: symbol,
            name: stockName,
            bidAskData: null,
            success: false,
            error: e.message
          });
        }
      });
    });
    
    bidAskReq.on('error', (error) => {
      console.log(`❌ ${stockName} 네트워크 오류:`, error.message);
      resolve({
        symbol: symbol,
        name: stockName,
        bidAskData: null,
        success: false,
        error: error.message
      });
    });
    
    bidAskReq.setTimeout(10000, () => {
      console.log(`⏰ ${stockName} 요청 타임아웃`);
      resolve({
        symbol: symbol,
        name: stockName,
        bidAskData: null,
        success: false,
        error: '타임아웃'
      });
    });
    
    bidAskReq.write(JSON.stringify({ 'stk_cd': symbol }));
    bidAskReq.end();
  });
}

// 토큰으로 실제 주식 데이터 요청 (호가 데이터 기반)
async function getStockDataWithToken(token) {
  return new Promise(async (resolve, reject) => {
    // 삼성전자, SK하이닉스, NAVER 주식 데이터 요청
    const stockSymbols = ['005930', '000660', '035420']; // 삼성전자, SK하이닉스, NAVER
    const stockNames = ['삼성전자', 'SK하이닉스', 'NAVER'];
    const stockResults = [];
    
    console.log(`🚀 ${stockSymbols.length}개 종목의 호가 데이터 조회 시작...`);
    
    try {
      // 각 종목별로 호가 데이터 조회
      for (let i = 0; i < stockSymbols.length; i++) {
        const stockData = await getKiwoomStockData(token, stockSymbols[i], stockNames[i]);
        
        // 호가 데이터를 주식 카드 형식으로 변환
        const cardData = convertBidAskToStockCard(stockData, i + 1);
        stockResults.push(cardData);
        
        console.log(`✅ ${stockNames[i]} 카드 데이터 생성 완료`);
      }
      
      resolve({
        success: true,
        data: stockResults,
        message: `키움 API 호가 기반 주식 데이터 (${stockResults.length}개 종목)`,
        lastUpdate: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ 호가 데이터 조회 오류:', error);
      reject(error);
    }
  });
}

// 호가 데이터를 주식 카드 형식으로 변환하는 함수
function convertBidAskToStockCard(stockData, id) {
  const { symbol, name, bidAskData, success, error } = stockData;
  
  // 기본 구조
  let cardData = {
    id: id,
    symbol: symbol,
    name: name,
    price: 0,
    change: 0,
    changePercent: '0%',
    volume: 0,
    timestamp: new Date().toISOString(),
    bidAskInfo: null,
    rawData: bidAskData
  };
  
  if (!success || !bidAskData || bidAskData.return_code !== 0) {
    cardData.error = error || '데이터 조회 실패';
    console.log(`❌ ${name} 호가 데이터 변환 실패:`, cardData.error);
    return cardData;
  }
  
  try {
    // 호가 데이터에서 현재가 정보 추출
    const buyPrice = parseInt(bidAskData.buy_fpr_bid?.replace(/[+-]/g, '')) || 0;
    const sellPrice = parseInt(bidAskData.sel_fpr_bid?.replace(/[+-]/g, '')) || 0;
    
    // 매수 우선호가와 매도 우선호가의 중간값을 현재가로 사용
    const estimatedPrice = buyPrice > 0 && sellPrice > 0 ? Math.round((buyPrice + sellPrice) / 2) : (buyPrice || sellPrice || 0);
    
    cardData.price = estimatedPrice;
    cardData.volume = (parseInt(bidAskData.tot_buy_req) || 0) + (parseInt(bidAskData.tot_sel_req) || 0);
    
    // 호가 정보 추가
    cardData.bidAskInfo = {
      buyPrice: buyPrice,
      sellPrice: sellPrice,
      buyVolume: parseInt(bidAskData.buy_fpr_req) || 0,
      sellVolume: parseInt(bidAskData.sel_fpr_req) || 0,
      totalBuyVolume: parseInt(bidAskData.tot_buy_req) || 0,
      totalSellVolume: parseInt(bidAskData.tot_sel_req) || 0,
      bidTime: bidAskData.bid_req_base_tm || "000000"
    };
    
    // 매수/매도 호가 차이로 변동성 추정
    if (buyPrice > 0 && sellPrice > 0) {
      const spread = sellPrice - buyPrice;
      const spreadPercent = ((spread / buyPrice) * 100).toFixed(2);
      cardData.changePercent = `${spreadPercent}%`;
      cardData.change = spread;
    }
    
    console.log(`📈 ${name} 호가 기반 데이터: 추정가 ${estimatedPrice}원, 매수호가 ${buyPrice}원, 매도호가 ${sellPrice}원`);
    
  } catch (parseError) {
    console.error(`❌ ${name} 호가 데이터 파싱 중 오류:`, parseError.message);
    cardData.error = `호가 데이터 파싱 오류: ${parseError.message}`;
  }
  
  return cardData;
}

server.listen(3000, () => {
  console.log("🚀 서버가 포트 3000에서 실행 중입니다!");
  console.log("📝 http://localhost:3000 에서 웹사이트를 확인하세요!");
  console.log("📊 키움 API 연동 준비 완료!");
});
