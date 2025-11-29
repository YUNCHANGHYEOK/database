// 페이지 로드시 시간, 애니메이션 세팅, 초기 데이터 로딩
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    addAnimations();
    wireNavigation();
    wireSearch();
    wireTickerButtons();

    setTimeout(() => {
        refreshData();
        loadStockChart('005930');
    }, 600);
});

// 현재 시간을 data-last-update 요소에 표시
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

    document.querySelectorAll('[data-last-update]').forEach(element => {
        element.textContent = timeString;
    });
}

// 데이터 새로고침 (KRX API 호출)
async function refreshData() {
    const refreshButtons = document.querySelectorAll('[data-refresh-button]');
    const stockCards = document.querySelectorAll('.stock-card');

    refreshButtons.forEach(button => {
        button.textContent = '데이터 불러오는 중...';
        button.disabled = true;
    });
    stockCards.forEach(card => card.classList.add('loading'));

    try {
        const response = await fetch('http://localhost:3000/api/stocks');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            updateStockCardsWithRealData(data);
            showNotification('KRX API에서 실시간 종목 데이터를 불러왔습니다.');
        } else if (data.success && Array.isArray(data.stocks) && data.stocks.length > 0) {
            updateStockCardsWithRealData(data.stocks);
            showNotification('KRX API에서 실시간 종목 데이터를 불러왔습니다.');
        } else {
            throw new Error('주식 데이터가 비어 있습니다.');
        }
    } catch (error) {
        showNotification('KRX API 호출 실패: ' + error.message, 'error');
        displayAPIError(error.message);
    } finally {
        updateTime();
        refreshButtons.forEach(button => {
            button.textContent = '데이터 새로고침';
            button.disabled = false;
        });
        stockCards.forEach(card => card.classList.remove('loading'));
    }
}

// KRX API 응답으로 주식 카드 업데이트 (ka10001)
function updateStockCardsWithRealData(stockData) {
    const stockCards = document.querySelectorAll('.stock-card');

    stockCards.forEach((card, index) => {
        if (!stockData[index]) return;

        const stock = stockData[index];
        const nameElement = card.querySelector('h3');
        const symbolElement = card.querySelector('.symbol');
        const priceElement = card.querySelector('.price');
        const changeElement = card.querySelector('.change');

        const stockName = stock.name || stock.stock_name || '종목명';
        const stockCode = stock.symbol || stock.stock_code || '';
        const currentPrice = Math.abs(Number(stock.price || stock.current_price || 0));
        const changePrice = Number(stock.change || stock.change_price || 0);
        const changeRate = Number(stock.changePercent || stock.change_rate || 0);

        if (nameElement) nameElement.textContent = stockName;
        if (symbolElement) symbolElement.textContent = stockCode;
        if (priceElement) priceElement.textContent = `${currentPrice.toLocaleString()}`;

        if (changeElement) {
            const sign = changeRate >= 0 ? '+' : '';
            changeElement.textContent = `${sign}${changePrice.toLocaleString()} (${sign}${changeRate.toFixed(2)}%)`;
            changeElement.className = `change ${changeRate >= 0 ? 'positive' : 'negative'}`;
        }
    });
}

// API 에러 상태 표시
function displayAPIError(message) {
    const stockCards = document.querySelectorAll('.stock-card');

    stockCards.forEach(card => {
        const priceElement = card.querySelector('.price');
        const changeElement = card.querySelector('.change');

        if (priceElement && changeElement) {
            priceElement.textContent = 'API 오류';
            priceElement.style.color = '#e4584f';
            changeElement.textContent = message || 'KRX API 호출 실패';
            changeElement.className = 'change negative';
        }
    });
}

// 카드/기능 섹션 진입 애니메이션
function addAnimations() {
    const cards = document.querySelectorAll('.stock-card, .feature-card, .stat-card');
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
        card.style.transform = 'translateY(14px)';
        card.style.transition = 'all 0.5s ease';
        observer.observe(card);
    });
}

// 토스트 알림
function showNotification(message, type = 'success') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    const backgroundColor = type === 'error'
        ? 'rgba(228, 88, 79, 0.95)'
        : 'rgba(31, 139, 255, 0.95)';

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        font-weight: bold;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        max-width: 360px;
        word-wrap: break-word;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 80);

    setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
        setTimeout(() => notification.remove(), 300);
    }, 2800);
}

// 차트 인스턴스 관리
const chartInstances = {};

// 주식 차트 로드
function loadStockChart(symbol, canvasId = 'stockChart') {
    if (!symbol) {
        showNotification('티커를 입력하세요.', 'error');
        return;
    }
    fetch(`http://localhost:3000/api/chart/${symbol}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            if (result.success && Array.isArray(result.data)) {
                renderStockChart(result.data, symbol, canvasId);
                showNotification(`${symbol} 차트를 불러왔습니다.`);
            } else {
                throw new Error(result.error || '차트 데이터가 부족합니다.');
            }
        })
        .catch(error => {
            showNotification('차트 로딩 실패: ' + error.message, 'error');
        });
}

// 차트 렌더링
function renderStockChart(chartData, symbol, canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

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

    const uniqueDailyData = [];
    const seenDates = new Set();
    for (const item of dailyData) {
        const dateKey = item.date.slice(0, 8);
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
    const borderColor = isUp ? 'rgb(58, 160, 255)' : 'rgb(228, 88, 79)';
    const backgroundColor = isUp ? 'rgba(58, 160, 255, 0.12)' : 'rgba(228, 88, 79, 0.12)';

    chartInstances[canvasId] = new Chart(ctx, {
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
                        font: { size: 14 }
                    }
                },
                title: {
                    display: true,
                    text: `${symbol} - 최근 720거래일 일봉`,
                    font: { size: 18, weight: 'bold' },
                    padding: 16
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 27, 45, 0.9)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
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
                    grid: { color: 'rgba(15, 27, 45, 0.06)' },
                    ticks: {
                        font: { size: 12 },
                        callback: function(value) {
                            return value.toLocaleString() + '원';
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 11 },
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

// 페이지 네비게이션
function wireNavigation() {
    const buttons = document.querySelectorAll('[data-page-btn]');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            if (!target) return;
            buttons.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            document.querySelectorAll('.page').forEach(page => {
                page.classList.toggle('is-active', page.getAttribute('data-page') === target);
            });
            if (target === 'charts') {
                const input = document.getElementById('chartTicker2');
                if (input && input.value.trim()) {
                    loadStockChart(input.value.trim(), 'stockChart2');
                }
            }
        });
    });
}

// 검색 박스와 버튼 이벤트
function wireSearch() {
    const searchInput = document.getElementById('tickerSearch');
    const searchButton = document.getElementById('searchButton');
    if (!searchInput || !searchButton) return;

    const triggerSearch = () => {
        const value = extractTicker(searchInput.value || '');
        if (!value) {
            showNotification('검색할 티커를 입력하세요.', 'error');
            return;
        }
        switchPage('charts');
        loadStockChart(value, 'stockChart2');
    };

    searchButton.addEventListener('click', triggerSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            triggerSearch();
        }
    });
}

// 티커 입력 버튼 연동
function wireTickerButtons() {
    const chartLoadButton = document.getElementById('chartLoadButton');
    const chartTickerInput = document.getElementById('chartTicker');
    const chartLoadButton2 = document.getElementById('chartLoadButton2');
    const chartTickerInput2 = document.getElementById('chartTicker2');

    chartLoadButton?.addEventListener('click', () => {
        const value = extractTicker(chartTickerInput?.value || '005930');
        loadStockChart(value || '005930');
    });
    chartLoadButton2?.addEventListener('click', () => {
        const value = extractTicker(chartTickerInput2?.value || '005930');
        loadStockChart(value || '005930', 'stockChart2');
    });

    document.querySelectorAll('.stock-card').forEach(card => {
        card.addEventListener('click', () => {
            const symbolText = card.querySelector('.symbol')?.textContent || '';
            const ticker = extractTicker(symbolText);
            if (ticker) {
                switchPage('charts');
                loadStockChart(ticker, 'stockChart2');
            }
        });
    });
}

// 페이지 스위처
function switchPage(target) {
    const buttons = document.querySelectorAll('[data-page-btn]');
    buttons.forEach(b => {
        b.classList.toggle('is-active', b.getAttribute('data-target') === target);
    });
    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('is-active', page.getAttribute('data-page') === target);
    });
}

// 티커 문자열 정제
function extractTicker(text) {
    return text.replace(/\\.KS|\\.KQ/gi, '').replace(/[^0-9A-Za-z]/g, '').trim();
}

// 키보드 새로고침 단축키
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
