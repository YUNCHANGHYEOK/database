// 페이지 로드 시 초기 데이터와 애니메이션을 설정합니다.
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    addAnimations();

    // 최초 로딩 후 API 데이터 요청
    setTimeout(() => {
        console.log('초기 데이터 로딩을 시작합니다.');
        refreshData();
        loadStockChart('005930'); // 삼성전자 차트 로드
    }, 1000);

    console.log('KRX 주식 데이터 대시보드가 로드되었습니다.');
});

// 현재 시간을 화면에 표시
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

// 데이터 새로고침 (KRX API 호출)
async function refreshData() {
    const button = document.querySelector('.cta-button');
    const stockCards = document.querySelectorAll('.stock-card');

    if (button) {
        button.textContent = 'KRX API 호출 중...';
        button.disabled = true;
    }

    stockCards.forEach(card => card.classList.add('loading'));

    try {
        const response = await fetch('http://localhost:3000/api/stocks');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('KRX 실시간 API 응답:', data);

        if (Array.isArray(data) && data.length > 0) {
            updateStockCardsWithRealData(data);
            showNotification('KRX API(ka10001)에서 실시간 데이터가 도착했습니다.');
        } else if (data.success && Array.isArray(data.stocks) && data.stocks.length > 0) {
            updateStockCardsWithRealData(data.stocks);
            showNotification('KRX API에서 실시간 데이터가 도착했습니다.');
        } else {
            console.log('수신된 데이터:', data);
            throw new Error('주식 데이터가 비어 있습니다.');
        }
    } catch (error) {
        console.error('KRX API 호출 오류:', error);
        showNotification('KRX API 호출 실패: ' + error.message, 'error');
        displayAPIError(error.message);
    } finally {
        updateTime();

        if (button) {
            button.textContent = '최신 데이터 요청';
            button.disabled = false;
        }

        stockCards.forEach(card => card.classList.remove('loading'));
    }
}

// KRX API 응답으로 주식 카드 업데이트 (ka10001 대응)
function updateStockCardsWithRealData(stockData) {
    const stockCards = document.querySelectorAll('.stock-card');

    console.log('카드 업데이트용 주식 데이터:', stockData);

    stockCards.forEach((card, index) => {
        if (!stockData[index]) return;

        const stock = stockData[index];
        const nameElement = card.querySelector('h3');
        const symbolElement = card.querySelector('.symbol');
        const priceElement = card.querySelector('.price');
        const changeElement = card.querySelector('.change');

        const stockName = stock.name || stock.stock_name || '종목명 없음';
        const stockCode = stock.symbol || stock.stock_code || '';
        const currentPrice = Math.abs(Number(stock.price || stock.current_price || 0));
        const changePrice = Number(stock.change || stock.change_price || 0);
        const changeRate = Number(stock.changePercent || stock.change_rate || 0);

        console.log(`업데이트: ${stockName} - ${currentPrice}원 (${changeRate}%)`);

        if (nameElement) nameElement.textContent = stockName;
        if (symbolElement) symbolElement.textContent = stockCode;
        if (priceElement) priceElement.textContent = `${currentPrice.toLocaleString()}`;

        if (changeElement) {
            const sign = changeRate >= 0 ? '+' : '';
            changeElement.textContent = `${sign}${changePrice.toLocaleString()} (${sign}${changeRate.toFixed(2)}%)`;
            changeElement.className = `change ${changeRate >= 0 ? 'positive' : 'negative'}`;
        }

        card.style.transform = 'scale(1.02)';
        card.style.borderLeft = changeRate >= 0 ? '4px solid #2ecc71' : '4px solid #e74c3c';
        setTimeout(() => {
            card.style.transform = 'scale(1)';
        }, 200);
    });

    console.log('주식 카드가 실시간 데이터로 업데이트되었습니다.');
}

// API 오류 상태 표시
function displayAPIError(message) {
    const stockCards = document.querySelectorAll('.stock-card');

    stockCards.forEach(card => {
        const priceElement = card.querySelector('.price');
        const changeElement = card.querySelector('.change');

        if (priceElement && changeElement) {
            priceElement.textContent = 'API 오류';
            priceElement.style.color = '#e74c3c';
            changeElement.textContent = 'KRX API 연결 실패';
            changeElement.className = 'change negative';
        }

        card.style.borderLeft = '4px solid #e74c3c';
        card.style.backgroundColor = 'rgba(231, 76, 60, 0.05)';
    });

    console.log('API 오류가 화면에 표시되었습니다:', message);
}

// 카드/기능 섹션 진입 시 페이드 인
function addAnimations() {
    const cards = document.querySelectorAll('.stock-card, .feature-card');

    const observer = new IntersectionObserver(entries => {
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

// 알림 토스트 표시
function showNotification(message, type = 'success') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    const backgroundColor = type === 'error'
        ? 'rgba(231, 76, 60, 0.95)'
        : 'rgba(46, 204, 113, 0.95)';

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

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 차트 인스턴스
let stockChartInstance = null;

// 주식 차트 로드
function loadStockChart(symbol) {
    console.log(`종목 ${symbol} 차트 데이터를 로딩합니다.`);

    fetch(`http://localhost:3000/api/chart/${symbol}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            console.log('차트 데이터 응답:', result);

            if (result.success && Array.isArray(result.data)) {
                renderStockChart(result.data, symbol);
                console.log('차트 렌더링 완료');
            } else {
                console.error('차트 데이터 형식 오류:', result);
                throw new Error(result.error || '차트 데이터가 부족하거나 형식이 잘못되었습니다.');
            }
        })
        .catch(error => {
            console.error('차트 로딩 오류:', error);
            showNotification('차트 로딩 실패: ' + error.message, 'error');
        });
}

// 차트 렌더링
function renderStockChart(chartData, symbol) {
    const ctx = document.getElementById('stockChart');

    if (!ctx) {
        console.error('차트 캔버스를 찾을 수 없습니다.');
        return;
    }

    if (stockChartInstance) {
        stockChartInstance.destroy();
    }

    // 일봉 데이터만 추출 (분봉은 마감 시간만 사용)
    const dailyData = chartData.filter(item => {
        const timeStr = item.date;
        if (timeStr.length === 8) {
            return true;
        }
        if (timeStr.length === 14) {
            const time = timeStr.slice(8, 12); // HHMM
            return time === '1530';
        }
        return false;
    });

    // 날짜별로 하나씩만 유지
    const uniqueDailyData = [];
    const seenDates = new Set();

    for (const item of dailyData) {
        const dateKey = item.date.slice(0, 8); // YYYYMMDD
        if (!seenDates.has(dateKey)) {
            seenDates.add(dateKey);
            uniqueDailyData.push(item);
        }
    }

    const limitedData = uniqueDailyData.slice(-720);
    const sortedData = [...limitedData].reverse();

    const labels = sortedData.map(item => {
        const dateStr = item.date;
        return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
    });

    const closePrices = sortedData.map(item => item.close);
    const isUp = closePrices[closePrices.length - 1] >= closePrices[0];
    const borderColor = isUp ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)';
    const backgroundColor = isUp ? 'rgba(75, 192, 192, 0.1)' : 'rgba(255, 99, 132, 0.1)';

    stockChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: '종가 (원)',
                data: closePrices,
                borderColor,
                backgroundColor,
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
                    text: `삼성전자 (${symbol}) - 최근 720거래일 일봉 차트`,
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

// 단축키로 새로고침 지원
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
        e.preventDefault();
        refreshData();
    }
});

// 1분마다 시간 업데이트
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
