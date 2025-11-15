// 간단한 JavaScript 기능들

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    addAnimations();
    
    // 페이지 로드 시 실제 키움 API 데이터 한 번 가져오기
    setTimeout(() => {
        console.log('📊 페이지 로드 후 키움 API 데이터 자동 로딩...');
        refreshData();
    }, 1000);
    
    console.log('📊 주식 데이터 분석 웹사이트가 로드되었습니다!');
});

// 시간 업데이트 함수
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const updateElement = document.getElementById('lastUpdate');
    if (updateElement) {
        updateElement.textContent = timeString;
    }
}

// 데이터 새로고침 함수 (Flask 서버를 통한 키움 API 호출)
function refreshData() {
    const button = document.querySelector('.cta-button');
    const stockCards = document.querySelectorAll('.stock-card');
    
    // 버튼 로딩 상태
    if (button) {
        button.textContent = '🔄 키움 API 호출 중...';
        button.disabled = true;
    }
    
    // 주식 카드에 로딩 애니메이션 추가
    stockCards.forEach(card => {
        card.classList.add('loading');
    });
    
    // Node.js 서버를 통한 키움 API 호출
    fetch('http://localhost:3000/api/stocks')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('📊 키움 API 응답:', data);
            
            // 서버 응답 데이터 확인 (배열 형태로 직접 전달됨)
            if (Array.isArray(data) && data.length > 0) {
                // 실제 주가 데이터로 업데이트
                updateStockCardsWithRealData(data);
                showNotification('✅ 키움 API(ka10001)에서 실시간 데이터를 가져왔습니다!');
            } else if (data.success && data.stocks && data.stocks.length > 0) {
                // 이전 형식 지원
                updateStockCardsWithRealData(data.stocks);
                showNotification('✅ 키움 API에서 실시간 데이터를 가져왔습니다!');
            } else {
                console.log('📊 받은 데이터:', data);
                throw new Error('주식 데이터가 없습니다');
            }
        })
        .catch(error => {
            console.error('❌ 키움 API 호출 오류:', error);
            showNotification('❌ 키움 API 호출 실패: ' + error.message, 'error');
            
            // 오류 상태를 화면에 표시
            displayAPIError(error.message);
        })
        .finally(() => {
            // 시간 업데이트
            updateTime();
            
            // 로딩 상태 해제
            if (button) {
                button.textContent = '📊 데이터 새로고침';
                button.disabled = false;
            }
            
            stockCards.forEach(card => {
                card.classList.remove('loading');
            });
        });
}

// 실제 키움 API 데이터로 주식 카드 업데이트 (ka10001 전용)
function updateStockCardsWithRealData(stockData) {
    const stockCards = document.querySelectorAll('.stock-card');
    
    console.log('📊 업데이트할 주식 데이터:', stockData);
    
    stockCards.forEach((card, index) => {
        if (stockData[index]) {
            const stock = stockData[index];
            const nameElement = card.querySelector('h3');
            const symbolElement = card.querySelector('.symbol');
            const priceElement = card.querySelector('.price');
            const changeElement = card.querySelector('.change');
            
            // ka10001 응답 형식에 맞춰 데이터 추출
            const stockName = stock.name || stock.stock_name || '알 수 없음';
            const stockCode = stock.symbol || stock.stock_code || '';
            const currentPrice = Math.abs(parseInt(stock.price || stock.current_price || 0));
            const changePrice = parseInt(stock.change || stock.change_price || 0);
            const changeRate = parseFloat(stock.changePercent || stock.change_rate || 0);
            
            console.log(`📈 ${stockName}: ${currentPrice}원 (${changeRate}%)`);
            
            // 주식 정보 업데이트
            if (nameElement) nameElement.textContent = stockName;
            if (symbolElement) symbolElement.textContent = stockCode;
            if (priceElement) {
                priceElement.textContent = `₩${currentPrice.toLocaleString()}`;
            }
            
            if (changeElement) {
                const sign = changeRate >= 0 ? '+' : '';
                changeElement.textContent = `${sign}${changePrice.toLocaleString()} (${sign}${changeRate}%)`;
                changeElement.className = `change ${changeRate >= 0 ? 'positive' : 'negative'}`;
            }
            
            // 카드에 업데이트 효과 추가
            card.style.transform = 'scale(1.02)';
            card.style.borderLeft = changeRate >= 0 ? '4px solid #2ecc71' : '4px solid #e74c3c';
            setTimeout(() => {
                card.style.transform = 'scale(1)';
            }, 200);
        }
    });
    
    console.log('✅ 주식 카드가 ka10001 데이터로 업데이트되었습니다.');
}

// API 오류를 화면에 표시
function displayAPIError(message) {
    const stockCards = document.querySelectorAll('.stock-card');
    
    stockCards.forEach(card => {
        const priceElement = card.querySelector('.price');
        const changeElement = card.querySelector('.change');
        
        if (priceElement && changeElement) {
            priceElement.textContent = 'API 오류';
            priceElement.style.color = '#e74c3c';
            changeElement.textContent = '키움 API 연결 실패';
            changeElement.className = 'change negative';
        }
        
        // 카드에 오류 스타일 적용
        card.style.borderLeft = '4px solid #e74c3c';
        card.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
    });
    
    console.log('❌ API 오류가 화면에 표시되었습니다:', message);
}

// 애니메이션 추가
function addAnimations() {
    const cards = document.querySelectorAll('.stock-card, .feature-card');
    
    // Intersection Observer로 스크롤 애니메이션
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });
    
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
}

// 알림 메시지 표시 (에러 타입 지원)
function showNotification(message, type = 'success') {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    const backgroundColor = type === 'error' ? 'rgba(231, 76, 60, 0.95)' : 'rgba(46, 204, 113, 0.95)';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        font-weight: bold;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    // 애니메이션으로 나타내기
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 키보드 단축키
document.addEventListener('keydown', function(e) {
    // Ctrl + R 또는 F5로 데이터 새로고침
    if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
        e.preventDefault();
        refreshData();
    }
});

// 자동 시간 업데이트 (1분마다)
setInterval(updateTime, 60000);