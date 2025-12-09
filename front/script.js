// Plain Backtest 프런트: 삼성전자 단일 종목 전용 데모 UX (모의 데이터)
const API_BASE = window.API_BASE || '';

document.addEventListener('DOMContentLoaded', () => {
    wireNavigation();
    wireStrategySelector();
    wirePresetButtons();
    wireRunButton();
    loadHistory();
    renderRecent();
});

let currentStrategy = 'price';
let history = [];
let equityChart;

function wireNavigation() {
    document.querySelectorAll('[data-page-btn]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('is-active', b === btn));
            switchPage(target);
        });
    });
}

function switchPage(target) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('is-active', page.getAttribute('data-page') === target);
    });
}

function wireStrategySelector() {
    document.querySelectorAll('[data-select-strategy]').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.getAttribute('data-select-strategy');
            currentStrategy = type;
            document.querySelectorAll('[data-select-strategy]').forEach(c => c.classList.remove('is-active'));
            card.classList.add('is-active');
            document.getElementById('rsiBacktestForm').style.display = type === 'rsi' ? 'block' : 'none';
            document.getElementById('priceBacktestForm').style.display = type === 'price' ? 'block' : 'none';
        });
    });
    // 기본 선택: 가격 전략
    document.querySelector('[data-select-strategy="price"]').classList.add('is-active');
    document.getElementById('priceBacktestForm').style.display = 'block';
}

function wirePresetButtons() {
    document.querySelectorAll('.seed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = Number(btn.dataset.seed || 0);
            const target = btn.dataset.target === 'rsi' ? 'initialCashRSI' : 'initialCash';
            const input = document.getElementById(target);
            if (input) input.value = amount;
        });
    });

    document.querySelectorAll('.chip[data-range]').forEach(btn => {
        btn.addEventListener('click', () => {
            const years = btn.dataset.range;
            const end = new Date();
            let start = new Date(end);
            const map = { '1y': 1, '3y': 3, '5y': 5, '10y': 10 };
            if (map[years]) start.setFullYear(end.getFullYear() - map[years]);
            else start = new Date(2010, 0, 1);
            const s = formatDateInput(start);
            const e = formatDateInput(end);
            ['builderStartPrice', 'builderStartRSI'].forEach(id => { const i = document.getElementById(id); if (i) i.value = s; });
            ['builderEndPrice', 'builderEndRSI'].forEach(id => { const i = document.getElementById(id); if (i) i.value = e; });
        });
    });

    document.querySelectorAll('.rsi-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('buyRSI').value = btn.dataset.buy || 30;
            document.getElementById('sellRSI').value = btn.dataset.sell || 70;
        });
    });
}

function wireRunButton() {
    const quick = document.querySelector('[data-run-quick]');
    quick?.addEventListener('click', runBacktest);
    document.querySelectorAll('.backtest-btn').forEach(btn => btn.addEventListener('click', runBacktest));
}

function runBacktest() {
    const params = collectParams();
    if (!params) return;
    toggleLoading(true);
    simulateStages()
        .then(() => autoFetchData(params))
        .then(() => runBacktestBackend(params))
        .catch(() => generateMockResult(params)) // 백엔드 실패 시 더미
        .then(result => {
            renderResults(result);
            saveHistory(result);
        })
        .finally(() => {
            toggleLoading(false);
            switchPage('results');
        });
}

async function runBacktestBackend(params) {
    const res = await fetch(`${API_BASE}/api/backtest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('백엔드 응답 오류');
    const data = await res.json();
    const summary = data.summary || {
        profit: data.profit,
        profitRate: data.profitRate,
        mdd: data.mdd,
        tradeCount: data.totalTrades ?? data.tradeCount,
        winRate: data.winRate
    };
    return {
        params,
        equityLabels: data.equityLabels || data.labels || data.dates || [],
        equityData: data.equityData || data.equity || data.portfolio || [],
        trades: data.trades || data.tradeHistory || [],
        daily: data.daily || data.dailyReturns || [],
        summary
    };
}

async function autoFetchData(params) {
    const start = params.periodStart || defaultStartDate();
    const end = params.periodEnd || formatDateInput(new Date());
    const payload = { symbol: '005930', startDate: start, endDate: end };
    try {
        const res = await fetch(`${API_BASE}/api/fetch-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('데이터 수집 실패');
        return res.json();
    } catch (e) {
        console.warn('데이터 수집 단계에서 오류, 기존 데이터로 진행:', e.message);
        return null;
    }
}

function collectParams() {
    const periodStart = (document.getElementById('builderStartPrice') || {}).value || (document.getElementById('builderStartRSI') || {}).value || '';
    const periodEnd = (document.getElementById('builderEndPrice') || {}).value || (document.getElementById('builderEndRSI') || {}).value || '';
    if (currentStrategy === 'price') {
        return {
            strategy: '가격 기반',
            buyPrice: Number(document.getElementById('buyPrice').value || 60000),
            sellPrice: Number(document.getElementById('sellPrice').value || 66000),
            initialCash: Number(document.getElementById('initialCash').value || 1000000),
            periodStart,
            periodEnd
        };
    }
    return {
        strategy: 'RSI 전략',
        rsiPeriod: Number(document.getElementById('rsiPeriod').value || 14),
        buyRSI: Number(document.getElementById('buyRSI').value || 30),
        sellRSI: Number(document.getElementById('sellRSI').value || 70),
        initialCash: Number(document.getElementById('initialCashRSI').value || 1000000),
        periodStart,
        periodEnd
    };
}

function toggleLoading(show) {
    const overlay = document.getElementById('backtestLoading');
    if (!overlay) return;
    overlay.style.display = show ? 'flex' : 'none';
    const bar = overlay.querySelector('.loading-bar span');
    if (bar) bar.style.width = show ? '15%' : '0%';
}

function simulateStages() {
    return new Promise(resolve => {
        const steps = [
            '가격 데이터를 분석하는 중입니다...',
            '전략을 적용하는 중입니다...',
            '수익률을 계산하는 중입니다...'
        ];
        const textEls = document.querySelectorAll('.loading-steps span');
        const dots = document.querySelectorAll('.step-dot');
        const bar = document.querySelector('.loading-bar span');
        let idx = 0;
        const tick = () => {
            textEls.forEach((el, i) => el.textContent = steps[i]);
            dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
            if (bar) bar.style.width = `${30 + idx * 30}%`;
            idx += 1;
            if (idx < steps.length) {
                setTimeout(tick, 700);
            } else {
                setTimeout(resolve, 800);
            }
        };
        tick();
    });
}

function generateMockResult(params) {
    const days = 120;
    let equity = params.initialCash;
    const labels = [];
    const equityData = [];
    const trades = [];
    const daily = [];
    let shares = 0;

    for (let i = 0; i < days; i++) {
        const price = 60000 + Math.sin(i / 8) * 1500 + Math.random() * 800;
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        labels.push(date.toISOString().slice(0, 10));

        // 단순 모의 매매 로직
        if (i % 15 === 0 && shares === 0) {
            shares = Math.floor(params.initialCash / price / 10);
            const amount = shares * price;
            equity -= amount;
            trades.push({ date, type: 'BUY', price: Math.round(price), shares, amount, rsi: 40 + Math.random() * 20 });
        } else if (i % 20 === 0 && shares > 0) {
            const amount = shares * price;
            equity += amount;
            trades.push({ date, type: 'SELL', price: Math.round(price), shares, amount, rsi: 60 + Math.random() * 20 });
            shares = 0;
        }

        const portfolio = equity + shares * price;
        equityData.push(Math.round(portfolio));
        const prev = daily.length ? daily[daily.length - 1].portfolio : params.initialCash;
        const dailyReturn = ((portfolio - prev) / prev) * 100;
        daily.push({ date, dailyReturn: dailyReturn.toFixed(2), portfolio: Math.round(portfolio) });
    }

    const finalValue = equityData[equityData.length - 1];
    const profit = finalValue - params.initialCash;
    const profitRate = ((profit / params.initialCash) * 100).toFixed(2) + '%';
    const completedTrades = trades.filter(t => t.type === 'SELL');
    const winTrades = completedTrades.filter(t => t.amount > 0);
    const winRate = completedTrades.length ? ((winTrades.length / completedTrades.length) * 100).toFixed(1) + '%' : '-';
    const mdd = calcMDD(equityData);

    const finalTrades = trades.map(t => ({
        ...t,
        date: t.date.toISOString(),
        amount: Math.round(t.amount)
    }));
    const dailyRows = daily.map(d => ({
        ...d,
        date: d.date.toISOString(),
        cumulative: ((d.portfolio - params.initialCash) / params.initialCash * 100).toFixed(2)
    }));

    return {
        params,
        equityLabels: labels,
        equityData,
        trades: finalTrades,
        daily: dailyRows,
        summary: {
            profit,
            profitRate,
            mdd,
            tradeCount: trades.length,
            winRate
        }
    };
}

function calcMDD(values) {
    let peak = values[0] || 0;
    let mdd = 0;
    values.forEach(v => {
        if (v > peak) peak = v;
        const draw = (peak - v) / peak;
        if (draw > mdd) mdd = draw;
    });
    return (mdd * 100).toFixed(2) + '%';
}

function renderResults(result) {
    const { summary = {}, params } = result;
    const container = document.getElementById('backtestResults');
    if (container) container.style.display = 'grid';
    const profit = Number(summary.profit || 0);
    setText('profitValue', `${profit.toLocaleString()}원`);
    setText('profitRate', `수익률 ${summary.profitRate || '-'}`);
    setText('mddValue', summary.mdd || '-');
    setText('tradeCountValue', `${summary.tradeCount ?? 0}회`);
    setText('winRateValue', summary.winRate || '-');

    const pill = document.getElementById('profitPill');
    if (pill) {
        pill.textContent = profit >= 0 ? '수익' : '손실';
        pill.className = profit >= 0 ? 'pill positive' : 'pill negative';
    }

    renderEquityChart(result);
    renderTrades(result.trades || []);
    renderDaily(result.daily || []);
    renderStrategySummary(params);
    switchPage('results');
}

function renderEquityChart(result) {
    const ctx = document.getElementById('backtestChart');
    if (!ctx || !result.equityData.length) return;
    if (equityChart) equityChart.destroy();

    const buyPoints = new Array(result.equityData.length).fill(null);
    const sellPoints = new Array(result.equityData.length).fill(null);
    result.trades.forEach(t => {
        const idx = result.equityLabels.findIndex(d => d === t.date.slice(0, 10));
        if (idx >= 0) {
            const pv = result.equityData[idx];
            if (t.type === 'BUY') buyPoints[idx] = pv;
            if (t.type === 'SELL') sellPoints[idx] = pv;
        }
    });

    const minVal = Math.min(...result.equityData);
    const maxVal = Math.max(...result.equityData);
    const pad = Math.max(1000, (maxVal - minVal) * 0.08);

    equityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: result.equityLabels,
            datasets: [
                { label: '포트폴리오 가치', data: result.equityData, borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.15)', tension: 0.2, fill: true, pointRadius: 0 },
                { label: '매수', data: buyPoints, borderColor: '#16a34a', backgroundColor: '#16a34a', pointStyle: 'triangle', pointRadius: 7, showLine: false },
                { label: '매도', data: sellPoints, borderColor: '#dc2626', backgroundColor: '#dc2626', pointStyle: 'rectRot', pointRadius: 7, showLine: false }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { display: false },
                y: {
                    suggestedMin: minVal - pad,
                    suggestedMax: maxVal + pad,
                    ticks: { callback: v => `${v.toLocaleString()}원` }
                }
            },
            plugins: { legend: { display: true } }
        }
    });
}

function renderTrades(trades) {
    const body = document.getElementById('tradeTableBody');
    if (!body) return;
    body.innerHTML = '';
    if (!trades.length) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" class="muted">거래 내역이 없습니다.</td>`;
        body.appendChild(row);
        return;
    }
    trades.forEach(t => {
        const row = document.createElement('tr');
        const dateText = new Date(t.date).toLocaleDateString('ko-KR');
        const typeText = t.type === 'BUY' ? '매수' : '매도';
        row.innerHTML = `
            <td>${dateText}</td>
            <td class="${t.type === 'BUY' ? 'trade-type-buy' : 'trade-type-sell'}">${typeText}</td>
            <td>${t.price.toLocaleString()}원</td>
            <td>${t.shares}</td>
            <td>${t.amount.toLocaleString()}원</td>
            <td>${t.rsi ? Number(t.rsi).toFixed(2) : '-'}</td>
        `;
        body.appendChild(row);
    });
}

function renderDaily(list) {
    const body = document.getElementById('dailyTableBody');
    if (!body) return;
    body.innerHTML = '';
    if (!list.length) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" class="muted">일별 수익률 데이터가 없습니다.</td>`;
        body.appendChild(row);
        return;
    }
    list.forEach(item => {
        const row = document.createElement('tr');
        const dateText = new Date(item.date).toLocaleDateString('ko-KR');
        row.innerHTML = `
            <td>${dateText}</td>
            <td>${item.dailyReturn}%</td>
            <td>${item.cumulative}%</td>
            <td>${item.portfolio.toLocaleString()}원</td>
        `;
        body.appendChild(row);
    });
}

function renderStrategySummary(params) {
    const items = document.querySelectorAll('#strategySummary li span:last-child');
    if (!items.length) return;
    items[0].textContent = params.strategy;
    items[1].textContent = '삼성전자 (단일 종목)';
    items[2].textContent = params.periodStart && params.periodEnd ? `${params.periodStart} ~ ${params.periodEnd}` : '최근 구간';
    if (params.strategy === '가격 기반') {
        items[3].textContent = `매수 ${params.buyPrice.toLocaleString()} / 매도 ${params.sellPrice.toLocaleString()}`;
    } else {
        items[3].textContent = `RSI ${params.buyRSI} ~ ${params.sellRSI} (기간 ${params.rsiPeriod})`;
    }
    items[4].textContent = `${params.initialCash.toLocaleString()}원`;
    items[5].textContent = '기본 수수료·슬리피지 적용';
}

function saveHistory(result) {
    history.unshift({
        timestamp: new Date().toISOString(),
        params: result.params,
        summary: result.summary
    });
    history = history.slice(0, 5);
    localStorage.setItem('pb_history', JSON.stringify(history));
    loadHistory();
    renderRecent();
}

function loadHistory() {
    try {
        const saved = localStorage.getItem('pb_history');
        history = saved ? JSON.parse(saved) : [];
    } catch (e) {
        history = [];
    }

    const body = document.getElementById('historyTableBody');
    if (!body) return;
    body.innerHTML = '';
    history.forEach((item, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(item.timestamp).toLocaleString('ko-KR')}</td>
            <td>${item.params.strategy}</td>
            <td>${item.params.initialCash.toLocaleString()}원</td>
            <td>-</td>
            <td>${item.summary.profit.toLocaleString()}원</td>
            <td>${item.summary.profitRate}</td>
            <td>${item.summary.tradeCount}회</td>
            <td>${item.params.strategy === '가격 기반' ? `매수 ${Number(item.params.buyPrice).toLocaleString()}/매도 ${Number(item.params.sellPrice).toLocaleString()}` : `RSI ${item.params.buyRSI}/${item.params.sellRSI}`}</td>
        `;
        row.addEventListener('click', () => rerun(idx));
        body.appendChild(row);
    });

    const panel = document.getElementById('comparisonPanel');
    if (panel) panel.style.display = history.length ? 'grid' : 'none';
}

function renderRecent() {
    const box = document.getElementById('recentBacktests');
    if (!box) return;
    if (!history.length) {
        box.innerHTML = '<p class="muted">아직 실행한 백테스트가 없습니다. 빠른 백테스트를 실행해보세요.</p>';
        return;
    }
    box.innerHTML = '';
    history.slice(0, 3).forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'recent-item';
        div.innerHTML = `
            <div>
                <p class="muted small">${item.params.strategy} · ${new Date(item.timestamp).toLocaleDateString('ko-KR')}</p>
                <p><strong>${item.summary.profitRate}</strong> / ${item.params.initialCash.toLocaleString()}원</p>
            </div>
            <div class="recent-actions">
                <button class="text-btn" onclick="rerun(${idx})">다시 실행</button>
            </div>
        `;
        box.appendChild(div);
    });
}

function rerun(idx) {
    const item = history[idx];
    if (!item) return;
    currentStrategy = item.params.strategy === '가격 기반' ? 'price' : 'rsi';
    document.querySelectorAll('[data-select-strategy]').forEach(c => c.classList.remove('is-active'));
    const targetCard = document.querySelector(`[data-select-strategy="${currentStrategy}"]`);
    targetCard?.classList.add('is-active');
    document.getElementById('rsiBacktestForm').style.display = currentStrategy === 'rsi' ? 'block' : 'none';
    document.getElementById('priceBacktestForm').style.display = currentStrategy === 'price' ? 'block' : 'none';

    if (currentStrategy === 'price') {
        document.getElementById('buyPrice').value = item.params.buyPrice;
        document.getElementById('sellPrice').value = item.params.sellPrice;
        document.getElementById('initialCash').value = item.params.initialCash;
    } else {
        document.getElementById('rsiPeriod').value = item.params.rsiPeriod;
        document.getElementById('buyRSI').value = item.params.buyRSI;
        document.getElementById('sellRSI').value = item.params.sellRSI;
        document.getElementById('initialCashRSI').value = item.params.initialCash;
    }
    switchPage('builder');
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function formatDateInput(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function defaultStartDate() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return formatDateInput(d);
}
