const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const url = require("url");

const server = http.createServer((req, res) => {
  // CORS 헤더를 모든 응답에 추가
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
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
  console.log("📊 키움 API 호출 요청 받음...");
  
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
            
            // 실제 주식 데이터 요청 (ka10001 사용)
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

// 토큰으로 실제 주식 데이터 요청 (ka10001만 사용)
async function getStockDataWithToken(token) {
  const https = require('https');
  
  return new Promise(async (resolve, reject) => {
    // 삼성전자, SK하이닉스, NAVER 주식 데이터 요청
    const stockSymbols = ['005930', '000660', '035420'];
    const stockNames = ['삼성전자', 'SK하이닉스', 'NAVER'];
    const stockResults = [];
    
    console.log(`🚀 ${stockSymbols.length}개 종목의 ka10001 데이터 조회 시작...`);
    
    try {
      // 각 종목별로 ka10001만 호출 (API 호출 제한을 피하기 위해 지연 추가)
      for (let i = 0; i < stockSymbols.length; i++) {
        console.log(`📊 ${stockNames[i]} (${stockSymbols[i]}) ka10001 호출 중...`);
        
        const stockData = await callKa10001(token, stockSymbols[i], stockNames[i]);
        stockResults.push(stockData);
        
        console.log(`✅ ${stockNames[i]} 데이터 완료: ${stockData.price}원 (${stockData.changePercent})`);
        
        // API 호출 제한을 피하기 위해 1초 대기 (마지막 종목은 대기 안 함)
        if (i < stockSymbols.length - 1) {
          console.log(`⏳ API 호출 제한 회피를 위해 1초 대기 중...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // 배열 형태로 직접 반환
      resolve(stockResults);
      
    } catch (error) {
      console.error('❌ ka10001 호출 오류:', error);
      reject(error);
    }
  });
}

// ka10001 (주식현재가/기본정보) API 호출
function callKa10001(token, symbol, name) {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'mockapi.kiwoom.com',
      port: 443,
      path: '/api/dostk/stkinfo',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': `Bearer ${token}`,
        'cont-yn': 'N',
        'next-key': '',
        'api-id': 'ka10001'
      }
    };
    
    const req = https.request(options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const apiResult = JSON.parse(data);
          
          if (apiResult.return_code === 0) {
            // 성공 - 데이터 가공
            const result = {
              symbol: symbol,
              name: apiResult.stk_nm || name,
              price: Math.abs(parseInt(apiResult.cur_prc || 0)),
              change: parseInt(apiResult.pred_pre || 0),
              changePercent: apiResult.flu_rt || '0',
              volume: parseInt(apiResult.trde_qty || 0),
              openPrice: Math.abs(parseInt(apiResult.open_pric || 0)),
              highPrice: Math.abs(parseInt(apiResult.high_pric || 0)),
              lowPrice: Math.abs(parseInt(apiResult.low_pric || 0)),
              timestamp: new Date().toISOString()
            };
            resolve(result);
          } else {
            // API 오류
            console.log(`❌ ${name} ka10001 실패:`, apiResult.return_msg);
            resolve({
              symbol: symbol,
              name: name,
              price: 0,
              change: 0,
              changePercent: '0',
              volume: 0,
              error: apiResult.return_msg
            });
          }
        } catch (parseError) {
          reject(new Error(`${name} 데이터 파싱 실패: ${parseError.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`${name} 네트워크 오류: ${error.message}`));
    });
    
    req.setTimeout(5000, () => {
      reject(new Error(`${name} 요청 타임아웃`));
    });
    
    req.write(JSON.stringify({ 'stk_cd': symbol }));
    req.end();
  });
}

server.listen(3000, () => {
  console.log("🚀 서버가 포트 3000에서 실행 중입니다!");
  console.log("📝 http://localhost:3000 에서 웹사이트를 확인하세요!");
  console.log("📊 키움 API 연동 준비 완료!");
});
