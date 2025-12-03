const fs = require('fs');
const path = require('path');
const db = require('./db');

// CSV 파일을 읽어서 DB에 저장
async function importCSV(csvPath, symbol) {
  try {
    // CSV 파일 읽기
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    
    console.log(`📄 CSV 파일: ${csvPath}`);
    console.log(`📈 종목 코드: ${symbol}`);
    console.log(`📊 전체 라인: ${lines.length - 1}개`);
    
    let imported = 0;
    let skipped = 0;
    
    // 헤더를 제외한 데이터 처리
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      
      headers.forEach((header, idx) => {
        row[header.trim()] = values[idx];
      });
      
      // date 형식 변환 (20230710 -> 2023-07-10)
      const dateStr = row.date;
      const formattedDate = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
      
      try {
        // DB에 삽입 (중복 시 업데이트)
        await db.pool.query(
          `INSERT INTO stock_prices (symbol, date, open, close, rsi, avg_gain, avg_loss) 
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           open = VALUES(open), 
           close = VALUES(close),
           rsi = VALUES(rsi),
           avg_gain = VALUES(avg_gain),
           avg_loss = VALUES(avg_loss)`,
          [symbol, formattedDate, row.open, row.close, row.rsi || null, row.avg_gain || null, row.avg_loss || null]
        );
        imported++;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          skipped++;
        } else {
          console.error(`❌ Error at line ${i}:`, error.message);
        }
      }
    }
    
    console.log(`✅ 가져오기 완료: ${imported}개 삽입, ${skipped}개 중복`);
    
    // 확인 쿼리
    const [rows] = await db.pool.query(
      'SELECT COUNT(*) as total FROM stock_prices WHERE symbol = ?',
      [symbol]
    );
    console.log(`📈 ${symbol} 총 데이터: ${rows[0].total}개`);
    
  } catch (error) {
    console.error('❌ CSV 가져오기 실패:', error);
  } finally {
    process.exit(0);
  }
}

// 명령줄 인자로 CSV 파일 경로와 종목코드 받기
const csvPath = process.argv[2];
const symbol = process.argv[3];

if (!csvPath || !symbol) {
  console.error('사용법: node csv_to_db.js <csv파일경로> <종목코드>');
  console.error('예시: node csv_to_db.js ../API_pull/rsi_005930.csv 005930');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`❌ 파일이 없습니다: ${csvPath}`);
  process.exit(1);
}

importCSV(csvPath, symbol);
