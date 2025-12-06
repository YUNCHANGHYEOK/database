// 초기화: 시간 표기, 애니메이션, 네비게이션, 기본 데이터 로드
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    addAnimations();
    wireNavigation();
    wireTickerButtons();
    loadBacktestHistory();

    setTimeout(() => {
        loadStockChart('005930', 'stockChart', true);
    }, 400);
});

// 모든 차트 인스턴스 관리
const chartInstances = {};

// 백테스팅 결과 히스토리 (최대 10개)
let backtestHistory = [];
const MAX_HISTORY = 10;

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

// 주식 차트 로드 (백엔드 /api/stock-data 사용)
function loadStockChart(symbol, canvasId = 'stockChart', silent = false) {
    const ticker = extractTicker(symbol || '005930');
    
    fetch(`http://localhost:3000/api/stock-data`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP 상태: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                if (!silent) {
                    throw new Error('데이터가 없습니다');
                }
                return;
            }
            renderStockChart(data, ticker, canvasId);
            updateStatsFromData(data);
        })
        .catch(error => {
            if (!silent) {
                showToast('차트 로딩 실패', error.message, 'error');
            }
        });
}

// 통계 업데이트
function updateStatsFromData(data) {
    if (!data || data.length === 0) return;
    
    const latest = data[data.length - 1];
    const volumeEl = document.querySelector('[data-total-volume]');
    const topMoverEl = document.querySelector('[data-top-mover]');
    
    if (volumeEl) {
        volumeEl.textContent = '데이터 로드됨';
    }
    
    if (topMoverEl) {
        let rsiValue = 'N/A';
        // 전체 기간의 평균 RSI 계산
        const validRsi = data.filter(d => d.rsi !== null && d.rsi !== undefined);
        if (validRsi.length > 0) {
            const sum = validRsi.reduce((acc, d) => acc + parseFloat(d.rsi), 0);
            const avg = sum / validRsi.length;
            if (!isNaN(avg)) {
                rsiValue = avg.toFixed(2);
            }
        }
        topMoverEl.textContent = `평균 RSI: ${rsiValue}`;
    }
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

// 차트 렌더러
function renderStockChart(chartData, symbol, canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const labels = chartData.map(item => {
        const dateStr = item.date;
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const closePrices = chartData.map(item => Math.abs(Number(item.close || 0)));
    const openPrices = chartData.map(item => Math.abs(Number(item.open || 0)));
    const rsiValues = chartData.map(item => item.rsi ? Number(item.rsi) : null);

    const isUp = closePrices[closePrices.length - 1] >= closePrices[0];
    const borderColor = isUp ? 'rgb(58, 160, 255)' : 'rgb(228, 88, 79)';
    const backgroundColor = isUp ? 'rgba(58, 160, 255, 0.12)' : 'rgba(228, 88, 79, 0.12)';

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: '시가',
                data: openPrices,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.3,
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 6,
                borderWidth: 2
            }, {
                label: '종가',
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
                    text: `${symbol} - 주가 차트`,
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
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + '원';
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

    chartLoadButton?.addEventListener('click', () => {
        loadStockChart('005930', 'stockChart', true);
    });

    document.querySelectorAll('.stock-card').forEach(card => {
        card.addEventListener('click', () => {
            loadStockChart('005930', 'stockChart', true);
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

// ==================== 데이터 수집 기능 ====================

// 날짜 형식 변환 (YYYYMMDD <-> YYYY-MM-DD)
function formatDate(input) {
    if (!input) return '';
    const cleaned = input.replace(/[^0-9]/g, '');
    
    if (cleaned.length === 8) {
        // YYYYMMDD -> YYYY-MM-DD
        return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    }
    
    return input; // 이미 YYYY-MM-DD 형식이면 그대로 반환
}

// 데이터 수집 실행
async function collectData() {
    const symbolInput = document.getElementById('collectSymbol');
    const startDateInput = document.getElementById('collectStartDate');
    const endDateInput = document.getElementById('collectEndDate');
    const collectBtn = document.querySelector('.collect-btn');
    const progressContainer = document.querySelector('.progress-container');
    const progressBar = progressContainer.querySelector('.progress-bar span');
    const btnText = collectBtn.querySelector('.btn-text');
    const btnLoading = collectBtn.querySelector('.btn-loading');
    
    const symbol = symbolInput.value.trim();
    const startDate = formatDate(startDateInput.value.trim());
    const endDate = formatDate(endDateInput.value.trim());
    
    // 유효성 검사
    if (!symbol) {
        showToast('종목 코드를 입력하세요', '종목 코드는 필수입니다', 'error');
        return;
    }
    
    if (!startDate || !endDate) {
        showToast('날짜를 입력하세요', '시작일과 종료일을 모두 입력해주세요', 'error');
        return;
    }
    
    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        showToast('잘못된 날짜 형식', '올바른 날짜 형식으로 입력하세요 (예: 20240101 또는 2024-01-01)', 'error');
        return;
    }
    
    // UI 상태 변경
    collectBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    progressContainer.style.display = 'flex';
    
    // 진행률 애니메이션
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressBar.style.width = progress + '%';
    }, 200);
    
    try {
        const response = await fetch('http://localhost:3000/api/fetch-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, startDate, endDate })
        });
        
        const result = await response.json();
        
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        
        if (response.ok && result.success) {
            showToast(
                '데이터 수집 완료! 🎉',
                `${result.imported}개의 데이터를 성공적으로 가져왔습니다`,
                'success'
            );
            
            // 차트 자동 새로고침
            setTimeout(() => {
                loadStockChart(symbol);
            }, 1000);
        } else {
            throw new Error(result.message || '데이터 수집에 실패했습니다');
        }
    } catch (error) {
        clearInterval(progressInterval);
        showToast(
            '수집 실패',
            error.message || 'API 호출 중 오류가 발생했습니다',
            'error'
        );
    } finally {
        // UI 원상 복구
        setTimeout(() => {
            collectBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';
        }, 1500);
    }
}

// 데이터베이스 초기화
async function resetDatabase() {
    // 확인 대화상자
    if (!confirm('⚠️ 정말로 모든 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.\n- 주가 데이터\n- 백테스팅 결과\n- 거래 내역')) {
        return;
    }
    
    const resetBtn = document.querySelector('.reset-btn');
    const btnText = resetBtn.querySelector('.btn-text');
    const btnLoading = resetBtn.querySelector('.btn-loading');
    
    resetBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    
    try {
        const response = await fetch('http://localhost:3000/api/reset-database', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast(
                '초기화 완료! 🗑️',
                '모든 데이터가 삭제되었습니다',
                'success'
            );
            
            // 차트 및 통계 초기화
            if (chartInstances.stockChart) {
                chartInstances.stockChart.destroy();
                delete chartInstances.stockChart;
            }
            
            // 통계 초기화
            const volumeEl = document.querySelector('[data-total-volume]');
            const topMoverEl = document.querySelector('[data-top-mover]');
            if (volumeEl) volumeEl.textContent = '-';
            if (topMoverEl) topMoverEl.textContent = '-';
            
        } else {
            throw new Error(result.error || '초기화에 실패했습니다');
        }
    } catch (error) {
        showToast(
            '초기화 실패',
            error.message || 'API 호출 중 오류가 발생했습니다',
            'error'
        );
    } finally {
        resetBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

// 토스트 알림 표시 (향상된 버전)
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    // 아이콘 선택
    const icons = {
        success: '✅',
        error: '❌',
        info: '💡'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // 5초 후 자동 제거
    setTimeout(() => {
        toast.classList.add('closing');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ==================== 백테스팅 기능 ====================

let backtestChartInstance = null;
let currentBacktestType = 'price'; // 'price' 또는 'rsi'

// 백테스팅 타입 전환
function switchBacktestType(type) {
    currentBacktestType = type;
    
    // 버튼 활성화 상태 변경
    document.getElementById('backtestTypePrice').classList.toggle('is-active', type === 'price');
    document.getElementById('backtestTypeRSI').classList.toggle('is-active', type === 'rsi');
    
    // 폼 표시/숨김
    document.getElementById('priceBacktestForm').style.display = type === 'price' ? 'block' : 'none';
    document.getElementById('rsiBacktestForm').style.display = type === 'rsi' ? 'block' : 'none';
}

// 백테스트 실행
async function runBacktest(type) {
    const resultsSection = document.getElementById('backtestResults');
    let backtestBtn, btnText, btnLoading;
    let requestData, apiUrl;
    
    if (type === 'price') {
        // 가격 기반 백테스팅
        backtestBtn = document.querySelector('#priceBacktestForm .backtest-btn');
        btnText = backtestBtn.querySelector('.btn-text');
        btnLoading = backtestBtn.querySelector('.btn-loading');
        
        const initialCash = Number(document.getElementById('initialCash').value);
        const buyPrice = Number(document.getElementById('buyPrice').value);
        const sellPrice = Number(document.getElementById('sellPrice').value);
        
        // 유효성 검사
        if (initialCash <= 0 || buyPrice <= 0 || sellPrice <= 0) {
            showToast('금액 오류', '올바른 금액을 입력하세요', 'error');
            return;
        }
        
        if (sellPrice <= buyPrice) {
            showToast('가격 설정 오류', '매도가는 매수가보다 높아야 합니다', 'error');
            return;
        }
        
        requestData = { initialCash, buyPrice, sellPrice };
        apiUrl = 'http://localhost:3000/backtest';
        
    } else {
        // RSI 기반 백테스팅
        backtestBtn = document.querySelector('#rsiBacktestForm .backtest-btn');
        btnText = backtestBtn.querySelector('.btn-text');
        btnLoading = backtestBtn.querySelector('.btn-loading');
        
        const initialCash = Number(document.getElementById('initialCashRSI').value);
        const buyRSI = Number(document.getElementById('buyRSI').value);
        const sellRSI = Number(document.getElementById('sellRSI').value);
        
        // 유효성 검사
        if (initialCash <= 0) {
            showToast('금액 오류', '올바른 금액을 입력하세요', 'error');
            return;
        }
        
        if (buyRSI < 0 || buyRSI > 100 || sellRSI < 0 || sellRSI > 100) {
            showToast('RSI 범위 오류', 'RSI는 0~100 사이의 값이어야 합니다', 'error');
            return;
        }
        
        if (sellRSI <= buyRSI) {
            showToast('RSI 설정 오류', '매도 RSI는 매수 RSI보다 높아야 합니다', 'error');
            return;
        }
        
        requestData = { initialCash, buyRSI, sellRSI };
        apiUrl = 'http://localhost:3000/backtest-rsi';
    }
    
    // UI 상태 변경
    backtestBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP 오류: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 결과 저장
        saveBacktestResult(result, type, requestData);
        
        // 결과 표시
        displayBacktestResults(result, type);
        resultsSection.style.display = 'block';
        
        // 성공 알림
        const profit = result.profit || 0;
        const profitRate = result.profitRate || '0%';
        showToast(
            '백테스트 완료! 📊',
            `수익: ${profit.toLocaleString()}원 (${profitRate})`,
            profit >= 0 ? 'success' : 'error'
        );
        
        // 결과 섹션으로 스크롤
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        
    } catch (error) {
        showToast('백테스트 실패', error.message, 'error');
        resultsSection.style.display = 'none';
    } finally {
        backtestBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

// 백테스트 결과 표시
function displayBacktestResults(result, type) {
    const profit = result.profit || 0;
    const profitRate = result.profitRate || '0%';
    const initialCash = result.initialCash || 0;
    const finalCash = result.finalCash || 0;
    const totalTrades = result.totalTrades || 0;
    const trades = result.trades || [];
    
    // 수익 카드 업데이트
    document.getElementById('profitValue').textContent = profit.toLocaleString() + '원';
    document.getElementById('profitRate').textContent = `수익률: ${profitRate}`;
    
    const profitPill = document.getElementById('profitPill');
    if (profit >= 0) {
        profitPill.textContent = '수익';
        profitPill.className = 'pill positive';
    } else {
        profitPill.textContent = '손실';
        profitPill.className = 'pill negative';
    }
    
    // 기타 카드 업데이트
    document.getElementById('initialCashValue').textContent = initialCash.toLocaleString() + '원';
    document.getElementById('finalCashValue').textContent = finalCash.toLocaleString() + '원';
    document.getElementById('totalTradesValue').textContent = totalTrades + '회';
    
    // 거래 테이블 업데이트
    const tableBody = document.getElementById('tradeTableBody');
    tableBody.innerHTML = '';
    
    trades.forEach(trade => {
        const row = document.createElement('tr');
        const date = trade.date ? new Date(trade.date).toLocaleDateString('ko-KR') : '-';
        const tradeType = trade.type || '-';
        const typeClass = tradeType === 'BUY' ? 'trade-type-buy' : 'trade-type-sell';
        const typeText = tradeType === 'BUY' ? '매수' : '매도';
        const price = (trade.price || 0).toLocaleString();
        const shares = (trade.shares || 0).toLocaleString();
        const amount = (trade.amount || 0).toLocaleString();
        const rsi = trade.rsi !== undefined ? Number(trade.rsi).toFixed(2) : '-';
        
        row.innerHTML = `
            <td>${date}</td>
            <td class="${typeClass}">${typeText}</td>
            <td>${price}원</td>
            <td>${shares}주</td>
            <td>${amount}원</td>
            <td>${rsi}</td>
        `;
        tableBody.appendChild(row);
    });
    
    // 차트 생성
    renderBacktestChart(trades, initialCash);
}

// 백테스트 차트 렌더링
async function renderBacktestChart(trades, initialCash) {
    const ctx = document.getElementById('backtestChart');
    if (!ctx) return;
    
    if (backtestChartInstance) {
        backtestChartInstance.destroy();
    }
    
    // DB에서 전체 주가 데이터 가져오기
    let stockData = [];
    try {
        const response = await fetch('http://localhost:3000/api/stock-data');
        if (response.ok) {
            stockData = await response.json();
        }
    } catch (error) {
        console.error('주가 데이터 로드 실패:', error);
    }
    
    // 거래 날짜를 Map으로 변환 (빠른 조회)
    const tradeMap = new Map();
    trades.forEach(trade => {
        if (trade.date) {
            // 날짜를 정규화 (YYYY-MM-DD 형식)
            const tradeDate = new Date(trade.date);
            const dateKey = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}-${String(tradeDate.getDate()).padStart(2, '0')}`;
            if (!tradeMap.has(dateKey)) {
                tradeMap.set(dateKey, []);
            }
            tradeMap.get(dateKey).push(trade);
        }
    });
    
    // 주가 데이터 준비
    const labels = stockData.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    });
    const closePrices = stockData.map(d => d.close);
    
    // 매수/매도 포인트 데이터 준비 (전체 배열 생성)
    const buyPoints = new Array(stockData.length).fill(null);
    const sellPoints = new Array(stockData.length).fill(null);
    
    stockData.forEach((d, index) => {
        // DB 날짜를 정규화
        const dbDate = new Date(d.date);
        const dateKey = `${dbDate.getFullYear()}-${String(dbDate.getMonth() + 1).padStart(2, '0')}-${String(dbDate.getDate()).padStart(2, '0')}`;
        const tradesOnDate = tradeMap.get(dateKey);
        
        if (tradesOnDate) {
            tradesOnDate.forEach(trade => {
                if (trade.type === 'BUY') {
                    buyPoints[index] = trade.price;
                } else if (trade.type === 'SELL') {
                    sellPoints[index] = trade.price;
                }
            });
        }
    });
    
    backtestChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: '종가',
                    data: closePrices,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    borderWidth: 2,
                    order: 3
                },
                {
                    label: '매수',
                    data: buyPoints,
                    borderColor: 'rgb(31, 182, 120)',
                    backgroundColor: 'rgb(31, 182, 120)',
                    pointStyle: 'triangle',
                    pointRadius: 10,
                    pointHoverRadius: 14,
                    showLine: false,
                    order: 1,
                    spanGaps: false
                },
                {
                    label: '매도',
                    data: sellPoints,
                    borderColor: 'rgb(228, 88, 79)',
                    backgroundColor: 'rgb(228, 88, 79)',
                    pointStyle: 'rectRot',
                    pointRadius: 10,
                    pointHoverRadius: 14,
                    showLine: false,
                    order: 2,
                    spanGaps: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { size: 14, weight: 'bold' } }
                },
                title: {
                    display: true,
                    text: '백테스팅 결과 - 매매 시점',
                    font: { size: 18, weight: 'bold' },
                    padding: 16
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 27, 45, 0.9)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            const date = stockData[index].date;
                            return new Date(date).toLocaleDateString('ko-KR', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            });
                        },
                        label: function(context) {
                            if (context.dataset.label === '종가') {
                                return '종가: ' + context.parsed.y.toLocaleString() + '원';
                            }
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + '원';
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
                        autoSkip: true,
                        maxTicksLimit: 30
                    }
                }
            }
        }
    });
}

// CSV 다운로드
function exportTrades() {
    const table = document.getElementById('tradeTable');
    if (!table) return;
    
    let csv = [];
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
        const cols = row.querySelectorAll('td, th');
        const rowData = Array.from(cols).map(col => col.textContent);
        csv.push(rowData.join(','));
    });
    
    const csvContent = csv.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `backtest_trades_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV 다운로드', '거래 내역이 다운로드되었습니다', 'success');
}

// 백테스팅 결과 저장
function saveBacktestResult(result, type, params) {
    const historyItem = {
        timestamp: new Date().toISOString(),
        type: type, // 'price' or 'rsi'
        params: params,
        result: {
            initialCash: result.initialCash,
            finalCash: result.finalCash,
            profit: result.profit,
            profitRate: result.profitRate,
            totalTrades: result.totalTrades
        }
    };
    
    // 히스토리 배열에 추가 (최신이 앞에)
    backtestHistory.unshift(historyItem);
    
    // 최대 개수 제한
    if (backtestHistory.length > MAX_HISTORY) {
        backtestHistory = backtestHistory.slice(0, MAX_HISTORY);
    }
    
    // localStorage에 저장
    try {
        localStorage.setItem('backtestHistory', JSON.stringify(backtestHistory));
    } catch (e) {
        console.warn('localStorage 저장 실패:', e);
    }
    
    // UI 업데이트
    updateComparisonPanel();
}

// 백테스팅 히스토리 로드
function loadBacktestHistory() {
    try {
        const saved = localStorage.getItem('backtestHistory');
        if (saved) {
            backtestHistory = JSON.parse(saved);
            updateComparisonPanel();
        }
    } catch (e) {
        console.warn('localStorage 로드 실패:', e);
        backtestHistory = [];
    }
}

// 비교 패널 업데이트
function updateComparisonPanel() {
    const panel = document.getElementById('comparisonPanel');
    const tableBody = document.getElementById('historyTableBody');
    
    if (backtestHistory.length === 0) {
        panel.style.display = 'none';
        return;
    }
    
    panel.style.display = 'block';
    
    // 테이블 업데이트
    tableBody.innerHTML = '';
    backtestHistory.forEach((item, index) => {
        const row = document.createElement('tr');
        const timestamp = new Date(item.timestamp).toLocaleString('ko-KR');
        const strategyLabel = item.type === 'price' ? '가격 기반' : 'RSI 기반';
        const strategyClass = item.type === 'price' ? 'trade-type-buy' : 'trade-type-sell';
        
        let paramsText = '';
        if (item.type === 'price') {
            paramsText = `매수: ${item.params.buyPrice?.toLocaleString()}원, 매도: ${item.params.sellPrice?.toLocaleString()}원`;
        } else {
            paramsText = `매수 RSI: ${item.params.buyRSI}, 매도 RSI: ${item.params.sellRSI}`;
        }
        
        const profit = item.result.profit || 0;
        const profitClass = profit >= 0 ? 'trade-type-buy' : 'trade-type-sell';
        
        row.innerHTML = `
            <td>${timestamp}</td>
            <td class="${strategyClass}">${strategyLabel}</td>
            <td>${item.result.initialCash.toLocaleString()}원</td>
            <td>${item.result.finalCash.toLocaleString()}원</td>
            <td class="${profitClass}">${profit.toLocaleString()}원</td>
            <td class="${profitClass}">${item.result.profitRate}</td>
            <td>${item.result.totalTrades}회</td>
            <td style="font-size: 12px;">${paramsText}</td>
        `;
        tableBody.appendChild(row);
    });
    
    // 비교 차트 업데이트
    updateComparisonChart();
}

// 비교 차트 렌더링
function updateComparisonChart() {
    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;
    
    // 기존 차트 삭제
    if (chartInstances.comparisonChart) {
        chartInstances.comparisonChart.destroy();
    }
    
    // 가격 기반 vs RSI 기반 분리
    const priceResults = backtestHistory.filter(h => h.type === 'price');
    const rsiResults = backtestHistory.filter(h => h.type === 'rsi');
    
    // 최근 5개만
    const recentPrice = priceResults.slice(0, 5).reverse();
    const recentRsi = rsiResults.slice(0, 5).reverse();
    
    const labels = [];
    const priceData = [];
    const rsiData = [];
    
    const maxLength = Math.max(recentPrice.length, recentRsi.length);
    
    for (let i = 0; i < maxLength; i++) {
        labels.push(`#${i + 1}`);
        
        if (recentPrice[i]) {
            const profitRate = parseFloat(recentPrice[i].result.profitRate);
            priceData.push(profitRate);
        } else {
            priceData.push(null);
        }
        
        if (recentRsi[i]) {
            const profitRate = parseFloat(recentRsi[i].result.profitRate);
            rsiData.push(profitRate);
        } else {
            rsiData.push(null);
        }
    }
    
    chartInstances.comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: '가격 기반 수익률 (%)',
                    data: priceData,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 2
                },
                {
                    label: 'RSI 기반 수익률 (%)',
                    data: rsiData,
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderColor: 'rgb(139, 92, 246)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { size: 14, weight: 'bold' } }
                },
                title: {
                    display: true,
                    text: '전략별 수익률 비교 (최근 5회)',
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
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(15, 27, 45, 0.06)' },
                    ticks: {
                        font: { size: 12 },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                }
            }
        }
    });
}

// 히스토리 초기화
function clearHistory() {
    if (!confirm('모든 백테스팅 기록을 삭제하시겠습니까?')) {
        return;
    }
    
    backtestHistory = [];
    localStorage.removeItem('backtestHistory');
    updateComparisonPanel();
    showToast('기록 초기화', '모든 백테스팅 기록이 삭제되었습니다', 'success');
}
