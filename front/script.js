// 초기화: 시간 표기, 애니메이션, 네비게이션, 검색, 기본 데이터 로드
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    addAnimations();
    wireNavigation();
    wireSearch();
    wireTickerButtons();

    setTimeout(() => {
        refreshData();
        loadStockChart('005930');
    }, 400);
});

// 모든 차트 인스턴스 관리
const chartInstances = {};

// 현재 시간 표시
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

// 백엔드에서 데이터 불러오기
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
            throw new Error(`HTTP 상태: ${response.status}`);
        }

        const payload = await response.json();
        const data = normalizeStockResponse(payload);
        if (!data.length) {
            throw new Error('응답 데이터가 비어 있습니다');
        }

        updateStockCardsWithRealData(data);
        updateOverviewMetrics(data);
        updateDetailPanel(data[0]);
        showNotification('KRX 백엔드에서 최신 데이터를 받아왔습니다.');
    } catch (error) {
        showNotification('API 호출 실패: ' + error.message, 'error');
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

// 백엔드 응답 형태 정리
function normalizeStockResponse(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload?.stocks && Array.isArray(payload.stocks)) return payload.stocks;
    if (payload?.data && Array.isArray(payload.data)) return payload.data;
    return [];
}

// 카드 UI 업데이트
function updateStockCardsWithRealData(stockData) {
    const stockCards = document.querySelectorAll('.stock-card');

    stockCards.forEach((card, index) => {
        const stock = stockData[index];
        if (!stock) return;

        const nameElement = card.querySelector('h3');
        const symbolElement = card.querySelector('.symbol');
        const priceElement = card.querySelector('.price');
        const changeElement = card.querySelector('.change');

        const stockName = stock.name || stock.stock_name || '종목';
        const stockCode = stock.symbol || stock.stock_code || '';
        const currentPrice = Math.abs(Number(stock.price || stock.current_price || 0));
        const changePrice = Number(stock.change || stock.change_price || 0);
        const changeRate = Number(String(stock.changePercent || stock.change_rate || 0).replace('%', ''));

        if (nameElement) nameElement.textContent = stockName;
        if (symbolElement) symbolElement.textContent = stockCode || symbolElement.textContent;
        if (priceElement) priceElement.textContent = `${currentPrice.toLocaleString()}원`;

        if (changeElement) {
            const sign = changeRate >= 0 ? '+' : '';
            changeElement.textContent = `${sign}${changePrice.toLocaleString()} (${sign}${changeRate.toFixed(2)}%)`;
            changeElement.className = `change ${changeRate > 0 ? 'positive' : changeRate < 0 ? 'negative' : 'neutral'}`;
        }

        // 카드에 세부 정보 저장하여 클릭 시 활용
        card.dataset.stock = JSON.stringify({
            ...stock,
            name: stockName,
            code: stockCode,
            price: currentPrice,
            changePrice,
            changeRate
        });
    });
}

// 통합 지표 업데이트 (Feat26 추가 필드 반영)
function updateOverviewMetrics(stocks) {
    if (!Array.isArray(stocks) || stocks.length === 0) return;

    const totalVolume = stocks.reduce((sum, item) => sum + Math.abs(Number(item.volume || item.trde_qty || 0)), 0);
    const sortedByChange = [...stocks].sort((a, b) => Number(b.changePercent || b.change_rate || 0) - Number(a.changePercent || a.change_rate || 0));
    const topMover = sortedByChange[0];

    const volumeElement = document.querySelector('[data-total-volume]');
    const topMoverElement = document.querySelector('[data-top-mover]');
    const topMoverDetail = document.querySelector('[data-top-mover-detail]');
    const topDirPill = document.querySelector('[data-top-change-dir]');

    if (volumeElement) volumeElement.textContent = totalVolume.toLocaleString();

    if (topMoverElement && topMoverDetail && topDirPill) {
        const rate = Number(topMover.changePercent || topMover.change_rate || 0);
        const direction = rate >= 0 ? 'positive' : 'negative';
        topMoverElement.textContent = `${topMover.name || topMover.stock_name || '종목'} (${rate.toFixed(2)}%)`;
        topMoverDetail.textContent = rate >= 0 ? '상승 우위' : '하락 우위';
        topDirPill.className = `pill ${direction}`;
        topDirPill.textContent = rate >= 0 ? '상승' : '하락';
    }
}

// 상세 패널 업데이트
function updateDetailPanel(stock) {
    if (!stock) return;
    const name = stock.name || stock.stock_name || '종목';
    const code = stock.code || stock.symbol || stock.stock_code || '-';
    const openPrice = Math.abs(Number(stock.openPrice || stock.open_pric || 0));
    const highPrice = Math.abs(Number(stock.highPrice || stock.high_pric || 0));
    const lowPrice = Math.abs(Number(stock.lowPrice || stock.low_pric || 0));
    const volume = Math.abs(Number(stock.volume || stock.trde_qty || 0));

    const nameEl = document.querySelector('[data-detail-name]');
    const codeEl = document.querySelector('[data-detail-code]');
    const openEl = document.querySelector('[data-detail-open]');
    const highEl = document.querySelector('[data-detail-high]');
    const lowEl = document.querySelector('[data-detail-low]');
    const volumeEl = document.querySelector('[data-detail-volume]');

    if (nameEl) nameEl.textContent = `${name} / ${code}`;
    if (codeEl) codeEl.textContent = code || '-';
    if (openEl) openEl.textContent = openPrice ? `${openPrice.toLocaleString()}원` : '-';
    if (highEl) highEl.textContent = highPrice ? `${highPrice.toLocaleString()}원` : '-';
    if (lowEl) lowEl.textContent = lowPrice ? `${lowPrice.toLocaleString()}원` : '-';
    if (volumeEl) volumeEl.textContent = volume ? volume.toLocaleString() : '-';
}

// API 오류 표시
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
    const cards = document.querySelectorAll('.stock-card, .feature-card, .stat-card, .panel');
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

// 주식 차트 로드
function loadStockChart(symbol, canvasId = 'stockChart') {
    const ticker = extractTicker(symbol || '');
    if (!ticker) {
        showNotification('종목 코드를 입력하세요.', 'error');
        return;
    }

    fetch(`http://localhost:3000/api/chart/${ticker}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP 상태: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            const dataArray =
                (Array.isArray(result.data) && result.data) ||
                (result.data && Array.isArray(result.data.data) && result.data.data) ||
                (Array.isArray(result.output) && result.output) ||
                (Array.isArray(result.stk_dt_pole_chart_qry) && result.stk_dt_pole_chart_qry) ||
                [];

            if (result.success === false || dataArray.length === 0) {
                throw new Error(result.error || '차트 응답이 비어 있습니다');
            }

            renderStockChart(dataArray, ticker, canvasId);
            showNotification(`${ticker} 차트를 불러왔습니다.`);
        })
        .catch(error => {
            showNotification('차트 로딩 실패: ' + error.message, 'error');
        });
}

// 차트 렌더러
function renderStockChart(chartData, symbol, canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const dailyData = chartData.filter(item => {
        const timeStr = item.date || item.dt || '';
        if (timeStr.length === 8) return true;
        if (timeStr.length === 14) {
            const time = timeStr.slice(8, 12);
            return time === '1530';
        }
        return false;
    });

    const uniqueDailyData = [];
    const seenDates = new Set();
    for (const item of dailyData) {
        const dateKey = (item.date || item.dt || '').slice(0, 8);
        if (dateKey && !seenDates.has(dateKey)) {
            seenDates.add(dateKey);
            uniqueDailyData.push(item);
        }
    }

    const limitedData = uniqueDailyData.slice(-720);
    const sortedData = [...limitedData].reverse();

    const labels = sortedData.map(item => {
        const dateStr = item.date || item.dt || '';
        return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
    });

    const closePrices = sortedData.map(item => {
        const close = item.close ?? item.cur_prc ?? item.end_prc ?? 0;
        return Math.abs(Number(String(close).replace(/[^\d.-]/g, '')));
    });
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
                    text: `${symbol} - 최근 720거래일 종가`,
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
        });
    });
}

// 검색 박스/버튼
function wireSearch() {
    const searchInput = document.getElementById('tickerSearch');
    const searchButton = document.getElementById('searchButton');
    if (!searchInput || !searchButton) return;

    const triggerSearch = () => {
        const value = extractTicker(searchInput.value || '');
        if (!value) {
            showNotification('검색할 종목을 입력하세요.', 'error');
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

// 차트 버튼/카드 이벤트
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
            const stored = card.dataset.stock ? JSON.parse(card.dataset.stock) : null;
            const symbolText = stored?.code || stored?.symbol || card.querySelector('.symbol')?.textContent || '';
            const ticker = extractTicker(symbolText);
            if (stored) {
                updateDetailPanel(stored);
            }
            if (ticker) {
                switchPage('charts');
                loadStockChart(ticker, 'stockChart2');
            }
        });
    });
}

// 페이지 전환
function switchPage(target) {
    const buttons = document.querySelectorAll('[data-page-btn]');
    buttons.forEach(b => {
        b.classList.toggle('is-active', b.getAttribute('data-target') === target);
    });
    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('is-active', page.getAttribute('data-page') === target);
    });
}

// 코드 추출
function extractTicker(text) {
    return text.replace(/\.KS|\.KQ/gi, '').replace(/[^0-9A-Za-z]/g, '').trim();
}

// 새로고침 단축키
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey && e.key.toLowerCase() === 'r') || e.key === 'F5') {
        e.preventDefault();
        refreshData();
    }
});

// 1분마다 시간 갱신
setInterval(updateTime, 60000);

// 창 크기 변경 시 차트 리사이즈
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        Object.values(chartInstances).forEach(chart => chart?.resize && chart.resize());
    }, 250);
});
