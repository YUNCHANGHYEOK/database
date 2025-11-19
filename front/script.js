// 간단한 JavaScript 기능들

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    addAnimations();
    
    // 페이지 로드 시 실제 키움 API 데이터 한 번 가져오기
    setTimeout(() => {
        console.log('📊 페이지 로드 후 키움 API 데이터 자동 로딩...');
        refreshData();
        loadStockChart('005930'); // 삼성전자 차트 로드
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
    
    const updateElements = document.querySelectorAll('[data-last-update]');
    updateElements.forEach(element => {
        element.textContent = timeString;
    });
}

// 데이터 새로고침 함수 (키움 API 호출)
async function refreshData() {
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
    
    try {
        // Node.js 서버를 통한 키움 API 호출
        const response = await fetch('http://localhost:3000/api/stocks');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
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
    } catch (error) {
        console.error('❌ 키움 API 호출 오류:', error);
        showNotification('❌ 키움 API 호출 실패: ' + error.message, 'error');
        
        // 오류 상태를 화면에 표시
        displayAPIError(error.message);
    } finally {
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
    }
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

// 차트 관련 변수
let stockChartInstance = null;

// 주식 차트 로드 함수
function loadStockChart(symbol) {
    console.log(`📈 ${symbol} 차트 데이터 로딩 중...`);
    
    fetch(`http://localhost:3000/api/chart/${symbol}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            console.log('📈 차트 데이터 응답:', result);
            console.log('📈 result.success:', result.success);
            console.log('📈 result.data:', result.data);
            
            if (result.success && result.data && Array.isArray(result.data)) {
                renderStockChart(result.data, symbol);
                console.log('✅ 차트 렌더링 완료');
            } else {
                console.error('❌ 차트 데이터 형식 오류:', result);
                throw new Error(result.error || '차트 데이터가 없거나 형식이 잘못되었습니다');
            }
        })
        .catch(error => {
            console.error('❌ 차트 로딩 오류:', error);
            showNotification('❌ 차트 로딩 실패: ' + error.message, 'error');
        });
}

// 차트 렌더링 함수
function renderStockChart(chartData, symbol) {
    const ctx = document.getElementById('stockChart');
    
    if (!ctx) {
        console.error('차트 캔버스를 찾을 수 없습니다');
        return;
    }
    
    // 기존 차트가 있으면 제거
    if (stockChartInstance) {
        stockChartInstance.destroy();
    }
    
    // 일봉 데이터만 추출 (8자리 날짜 또는 장 마감 시간)
    const dailyData = chartData.filter(item => {
        const timeStr = item.date;
        // 8자리면 일봉 데이터
        if (timeStr.length === 8) {
            return true;
        }
        // 14자리 분봉 데이터면 장 마감 시간만
        if (timeStr.length === 14) {
            const time = timeStr.slice(8, 12); // HHMM
            return time === '1530';
        }
        return false;
    });
    
    // 날짜별로 하나만 남기기 (중복 제거)
    const uniqueDailyData = [];
    const seenDates = new Set();
    
    for (const item of dailyData) {
        const dateKey = item.date.slice(0, 8); // YYYYMMDD
        if (!seenDates.has(dateKey)) {
            seenDates.add(dateKey);
            uniqueDailyData.push(item);
        }
    }
    
    // 최대 720개 (720일 = 약 2년)
    const limitedData = uniqueDailyData.slice(-720);
    
    // 데이터를 날짜 오름차순으로 정렬 (오래된 것부터)
    const sortedData = [...limitedData].reverse();
    
    // 날짜와 종가 데이터 추출
    const labels = sortedData.map(item => {
        const dateStr = item.date;
        // 분봉 데이터 (14자리): YYYYMMDDHHMMSS
        if (dateStr.length === 14) {
            return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
        }
        // 일봉 데이터 (8자리): YYYYMMDD
        return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
    });
    
    const closePrices = sortedData.map(item => item.close);
    
    // 가격 변동 확인 (상승/하락 색상)
    const borderColor = closePrices[closePrices.length - 1] > closePrices[0] 
        ? 'rgb(255, 99, 132)'  // 하락 - 빨강
        : 'rgb(75, 192, 192)'; // 상승 - 초록
    
    const backgroundColor = closePrices[closePrices.length - 1] > closePrices[0]
        ? 'rgba(255, 99, 132, 0.1)'
        : 'rgba(75, 192, 192, 0.1)';
    
    // Chart.js로 라인 차트 생성
    stockChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '종가 (원)',
                data: closePrices,
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                tension: 0.3,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 14
                        }
                    }
                },
                title: {
                    display: true,
                    text: `삼성전자 (${symbol}) - 최근 720일 일봉 차트`,
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    padding: 20
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return '종가: ' + context.parsed.y.toLocaleString() + '원';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return value.toLocaleString() + '원';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        maxRotation: 0,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 30
                    }
                }
            }
        }
    });
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

// 화면 크기 변경 시 차트 리사이즈
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        if (stockChartInstance) {
            stockChartInstance.resize();
        }
    }, 250);
});
