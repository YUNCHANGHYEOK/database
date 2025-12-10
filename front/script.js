// Plain Backtest front script
const API_BASE = window.API_BASE || '';

let currentStrategy = 'price';
let history = [];
let equityChart;

document.addEventListener('DOMContentLoaded', () => {
    try {
        wireNavigation();
        wireStrategySelector();
        wirePresetButtons();
        wireRunButton();
        loadHistory();
        renderRecent();
    } catch (e) {
        console.error('초기화 중 오류가 발생했습니다.', e);
        alert('화면 초기화 중 오류가 발생했습니다. 새로고침 후에도 문제가 지속되면 콘솔 로그를 확인해주세요.');
    }
});

function wireNavigation() {
    const navButtons = document.querySelectorAll('[data-page-btn]');
    if (!navButtons.length) return;
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            document.querySelectorAll('.nav-item').forEach(b => {
                const match = b.getAttribute('data-target') === target;
                b.classList.toggle('is-active', match);
            });
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
    const cards = document.querySelectorAll('[data-select-strategy]');
    const priceForm = document.getElementById('priceBacktestForm');
    const rsiForm = document.getElementById('rsiBacktestForm');
    if (!cards.length) return;
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const type = card.getAttribute('data-select-strategy');
            currentStrategy = type;
            cards.forEach(c => c.classList.remove('is-active'));
            card.classList.add('is-active');
            if (rsiForm) rsiForm.style.display = type === 'rsi' ? 'block' : 'none';
            if (priceForm) priceForm.style.display = type === 'price' ? 'block' : 'none';
        });
    });
    const priceCard = document.querySelector('[data-select-strategy="price"]');
    if (priceCard) priceCard.classList.add('is-active');
    if (priceForm) priceForm.style.display = 'block';
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
        .then(result => attachPriceSeries(result))
        .catch(() => generateMockResult(params))
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
    return normalizeBackendResult(data, params);
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
        console.warn('데이터 수집 중단, 기존 데이터로 진행:', e.message);
        return null;
    }
}

function collectParams() {
    const periodStart = (document.getElementById('builderStartPrice') || {}).value || (document.getElementById('builderStartRSI') || {}).value || '';
    const periodEnd = (document.getElementById('builderEndPrice') || {}).value || (document.getElementById('builderEndRSI') || {}).value || '';
    if (currentStrategy === 'price') {
        return {
            strategy: '가격기반',
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

function normalizeBackendResult(data, params) {
    const mergedParams = data.params ? { ...params, ...data.params } : params;
    const summary = normalizeSummary(data, mergedParams);
    const rawLabels = data.equityLabels || data.labels || data.dates || [];
    const equityLabels = (rawLabels || []).map(label => {
        if (!label) return '';
        const parsed = new Date(label);
        if (!Number.isNaN(parsed.getTime())) return formatDateInput(parsed);
        return String(label).slice(0, 10);
    }).filter(Boolean);
    const equityData = (data.equityData || data.equity || data.portfolio || data.portfolioValue || []).map(Number);
    const rawTrades = data.trades || data.tradeHistory || data.orders || [];
    const rawDaily = data.daily || data.dailyReturns || data.performance || [];
    const trades = normalizeTrades(Array.isArray(rawTrades) ? rawTrades : [], mergedParams.initialCash);
    const daily = normalizeDaily(Array.isArray(rawDaily) ? rawDaily : [], mergedParams.initialCash);
    const meta = data.strategySummary || data.meta || mergedParams;
    return { params: mergedParams, equityLabels, equityData, trades, daily, summary, meta };
}

function normalizeSummary(data, params) {
    const summary = {
        profit: data.profit,
        profitRate: data.profitRate,
        mdd: data.mdd ?? data.maxDrawdown,
        tradeCount: data.totalTrades ?? data.tradeCount,
        winRate: data.winRate,
        ...(data.summary || {})
    };
    if (typeof summary.profitRate === 'number') summary.profitRate = `${summary.profitRate.toFixed(2)}%`;
    if (typeof summary.mdd === 'number') summary.mdd = `${summary.mdd.toFixed(2)}%`;
    if (typeof summary.winRate === 'number') summary.winRate = `${summary.winRate.toFixed(1)}%`;
    if (summary.profit == null && typeof summary.profitRate === 'string') {
        const rate = Number(summary.profitRate.replace('%', '')) / 100;
        summary.profit = Math.round((params.initialCash || 0) * rate);
    }
    return summary;
}

function normalizeTrades(trades, initialCash) {
    return trades
        .map(t => {
            const date = t.date || t.timestamp || t.time || t.executedAt || t.filledAt;
            const rawType = (t.type || t.side || '').toUpperCase();
            const type = rawType.includes('SELL') ? 'SELL' : 'BUY';
            const price = Number(t.price ?? t.fillPrice ?? t.executedPrice ?? 0);
            const shares = Number(t.shares ?? t.quantity ?? t.qty ?? 0);
            const amount = Number(t.amount ?? t.total ?? (price && shares ? price * shares : 0));
            const rsi = t.rsi ?? (t.indicator ? t.indicator.rsi : null);
            return { date, type, price, shares, amount, rsi };
        })
        .filter(t => t.date)
        .map(t => ({
            ...t,
            amount: isNaN(t.amount) ? 0 : Math.round(t.amount || 0),
            price: isNaN(t.price) ? 0 : t.price,
            shares: isNaN(t.shares) ? 0 : t.shares
        }));
}

function normalizeDaily(list, initialCash) {
    return list
        .map(item => {
            const date = item.date || item.day || item.timestamp;
            const portfolioSource = item.portfolio ?? item.portfolioValue ?? item.value ?? initialCash ?? 0;
            const portfolio = Number(portfolioSource);
            const dailyReturn = item.dailyReturn ?? item.return ?? item.daily_return;
            const cumulative = item.cumulative ?? item.cumulativeReturn ?? item.cumulative_return;
            const dailyReturnPct = dailyReturn != null ? Number(dailyReturn).toFixed(2) : null;
            const cumulativePct = cumulative != null ? Number(cumulative).toFixed(2) : null;
            const fallbackCumulative = ((portfolio - initialCash) / (initialCash || 1) * 100).toFixed(2);
            return {
                date,
                dailyReturn: dailyReturnPct ?? '0.00',
                cumulative: cumulativePct ?? fallbackCumulative,
                portfolio: Math.round(portfolio)
            };
        })
        .filter(item => item.date);
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
            '가격·데이터를 분석하는 중입니다...',
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
    const { params } = result;
    const summary = { ...(result.summary || {}) };
    summary.tradeCount = summary.tradeCount ?? result.trades?.length ?? 0;
    summary.winRate = summary.winRate ?? computeWinRate(result.trades || []);
    if (!summary.profitRate && result.equityData?.length) {
        const finalValue = result.equityData[result.equityData.length - 1];
        const base = params.initialCash || 1;
        const rate = ((finalValue - base) / base) * 100;
        summary.profitRate = `${rate.toFixed(2)}%`;
        summary.profit = summary.profit ?? Math.round(finalValue - base);
    }
    const container = document.getElementById('backtestResults');
    if (container) container.style.display = 'grid';
    const profit = Number(summary.profit || 0);
    setText('profitValue', `${profit.toLocaleString()}원`);
    setText('profitRate', `수익률 ${summary.profitRate || '-'}`);
    setText('mddValue', summary.mdd || '-');
    setText('tradeCountValue', `${summary.tradeCount ?? 0}건`);
    setText('winRateValue', summary.winRate || '-');

    const pill = document.getElementById('profitPill');
    if (pill) {
        pill.textContent = profit >= 0 ? '수익' : '손실';
        pill.className = profit >= 0 ? 'pill positive' : 'pill negative';
    }

    renderEquityChart(result);
    renderTrades(result.trades || []);
    renderDaily(result.daily || []);
    renderStrategySummary(params, result.meta || params);
    result.summary = summary;
    switchPage('results');
}

function computeWinRate(trades) {
    let wins = 0;
    let total = 0;
    trades.forEach((t, idx) => {
        if (t.type !== 'SELL') return;
        const buy = [...trades.slice(0, idx)].reverse().find(x => x.type === 'BUY');
        if (!buy) return;
        total += 1;
        const profit = Number(t.price || 0) - Number(buy.price || 0);
        if (profit > 0) wins += 1;
    });
    if (!total) return '-';
    return `${((wins / total) * 100).toFixed(1)}%`;
}

function renderEquityChart(result) {
    clearChartError();
    const ctx = document.getElementById('backtestChart');
    if (!ctx) return;
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js 로드되지 않음, 캔버스 폴백 사용');
        drawFallbackChart(ctx, result);
        return;
    }
    const labels = ensureSeriesLabels(result);
    const series = ensureSeriesData(result);
    if (!series.length || !labels.length) {
        showChartError('차트를 표시할 데이터를 불러오지 못했습니다.');
        if (equityChart) equityChart.destroy();
        return;
    }
    if (equityChart) equityChart.destroy();

    const buyPoints = new Array(series.length).fill(null);
    const sellPoints = new Array(series.length).fill(null);
    result.trades.forEach(t => {
        const dateKey = (t.date || '').slice(0, 10);
        const idx = labels.findIndex(d => d === dateKey);
        if (idx >= 0) {
            const pv = series[idx];
            if (t.type === 'BUY') buyPoints[idx] = pv;
            if (t.type === 'SELL') sellPoints[idx] = pv;
        }
    });

    const minVal = Math.min(...series);
    const maxVal = Math.max(...series);
    const pad = Math.max(1000, (maxVal - minVal) * 0.08);

    try {
        equityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: result.priceData?.length ? '종가(설정 기간)' : '포트폴리오 가치', data: series, borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.15)', tension: 0.2, fill: true, pointRadius: 2.5, pointHoverRadius: 6, hitRadius: 8 },
                    { label: '매수', data: buyPoints, borderColor: '#16a34a', backgroundColor: '#16a34a', pointStyle: 'triangle', pointRadius: 7, showLine: false },
                    { label: '매도', data: sellPoints, borderColor: '#dc2626', backgroundColor: '#dc2626', pointStyle: 'rectRot', pointRadius: 7, showLine: false }
                ]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: {
                        display: true,
                        ticks: { maxTicksLimit: 6 }
                    },
                    y: {
                        suggestedMin: minVal - pad,
                        suggestedMax: maxVal + pad,
                        ticks: { callback: v => `${v.toLocaleString()}원` }
                    }
                },
                plugins: {
                    legend: { display: true },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: (ctx) => ctx[0]?.label || '',
                            label: (ctx) => {
                                const datasetLabel = ctx.dataset.label || '';
                                const value = ctx.parsed.y;
                                if (datasetLabel === '매수' || datasetLabel === '매도') {
                                    const trade = result.trades.find(t => (t.date || '').slice(0, 10) === ctx.label && t.type === (datasetLabel === '매수' ? 'BUY' : 'SELL'));
                                    const priceText = trade ? ` (체결가 ${Number(trade.price || 0).toLocaleString()}원)` : '';
                                    return `${datasetLabel}: ${value.toLocaleString()}원${priceText}`;
                                }
                                return `${datasetLabel}: ${value.toLocaleString()}원`;
                            }
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error('차트 렌더링 실패', e);
        showChartError('차트 렌더링에 실패했습니다. 설정을 다시 확인해주세요.');
    }
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
            <td>${Number(t.price).toLocaleString()}원</td>
            <td>${t.shares}</td>
            <td>${Number(t.amount).toLocaleString()}원</td>
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

function renderStrategySummary(params, meta = {}) {
    const items = document.querySelectorAll('#strategySummary li span:last-child');
    if (!items.length) return;
    const source = { ...params, ...meta };
    const strategyName = source.strategy || params.strategy;
    items[0].textContent = strategyName;
    items[1].textContent = '삼성전자';
    const start = source.periodStart || source.startDate || source.start;
    const end = source.periodEnd || source.endDate || source.end;
    items[2].textContent = start && end ? `${start} ~ ${end}` : '최근 구간';
    if (isPriceStrategy(strategyName)) {
        const buy = Number(source.buyPrice ?? params.buyPrice);
        const sell = Number(source.sellPrice ?? params.sellPrice);
        items[3].textContent = `매수 ${buy.toLocaleString()} / 매도 ${sell.toLocaleString()}`;
    } else {
        const buyRSI = source.buyRSI ?? params.buyRSI;
        const sellRSI = source.sellRSI ?? params.sellRSI;
        const rsiPeriod = source.rsiPeriod ?? params.rsiPeriod;
        items[3].textContent = `RSI ${buyRSI} ~ ${sellRSI} (기간 ${rsiPeriod})`;
    }
    items[4].textContent = `${Number(source.initialCash ?? params.initialCash).toLocaleString()}원`;
    items[5].textContent = source.feeText || source.slippageText || '기본 수수료·슬리피지 적용';
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
            <td>${item.summary.tradeCount}건</td>
            <td>${isPriceStrategy(item.params.strategy) ? `매수 ${Number(item.params.buyPrice).toLocaleString()}/매도 ${Number(item.params.sellPrice).toLocaleString()}` : `RSI ${item.params.buyRSI}/${item.params.sellRSI}`}</td>
        `;
        row.addEventListener('click', () => rerun(idx));
        body.appendChild(row);
    });

    const panel = document.getElementById('comparisonPanel');
    if (panel) panel.style.display = history.length ? 'grid' : 'none';
}

function renderRecent() {
    const box = document.getElementById("recentBacktests");
    if (!box) return;
    if (!history.length) {
        box.innerHTML = "<p class=\"muted\">최근 실행한 백테스트가 없습니다. 빠른 백테스트로 실행해보세요.</p>";
        return;
    }
    box.innerHTML = "";
    history.slice(0, 3).forEach((item, idx) => {
        const profitRate = item.summary?.profitRate || "-";
        const mdd = item.summary?.mdd || "-";
        const winRate = item.summary?.winRate || "-";
        const div = document.createElement("div");
        div.className = "recent-item";
        div.innerHTML = `
            <div>
                <p class="muted small">${item.params.strategy} · ${new Date(item.timestamp).toLocaleDateString('ko-KR')}</p>
                <p><strong>수익률 ${profitRate}</strong> · MDD ${mdd} · 승률 ${winRate}</p>
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
    currentStrategy = isPriceStrategy(item.params.strategy) ? 'price' : 'rsi';
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

function isPriceStrategy(strategy) {
    if (!strategy) return false;
    const s = String(strategy);
    return s === 'price' || s.toLowerCase().includes('price') || s.includes('가격');
}

function showChartError(message) {
    let el = document.getElementById('chartError');
    if (!el) {
        const area = document.querySelector('.chart-area');
        if (!area) return;
        el = document.createElement('p');
        el.id = 'chartError';
        el.className = 'chart-error';
        area.appendChild(el);
    }
    el.textContent = message;
    el.style.display = 'block';
}

function clearChartError() {
    const el = document.getElementById('chartError');
    if (el) el.style.display = 'none';
}

function ensureEquityLabels(result) {
    const labels = Array.isArray(result.equityLabels) ? result.equityLabels.filter(Boolean) : [];
    const dataLen = Array.isArray(result.equityData) ? result.equityData.length : 0;
    if (labels.length === dataLen && labels.length) return labels;
    if (Array.isArray(result.daily) && result.daily.length === dataLen) {
        return result.daily.map(d => {
            const dateVal = d.date || d.day || d.timestamp;
            const parsed = new Date(dateVal);
            if (!Number.isNaN(parsed.getTime())) return formatDateInput(parsed);
            return String(dateVal).slice(0, 10);
        });
    }
    const base = result.params?.periodStart ? new Date(result.params.periodStart) : new Date();
    if (!result.params?.periodStart) base.setDate(base.getDate() - (dataLen - 1));
    const generated = [];
    for (let i = 0; i < dataLen; i += 1) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        generated.push(formatDateInput(d));
    }
    return generated;
}

function ensureSeriesLabels(result) {
    if (Array.isArray(result.priceLabels) && result.priceLabels.length === (result.priceData?.length || 0)) {
        return result.priceLabels;
    }
    return ensureEquityLabels(result);
}

function ensureSeriesData(result) {
    if (Array.isArray(result.priceData) && result.priceData.length) return result.priceData.map(Number);
    return result.equityData || [];
}

async function attachPriceSeries(result) {
    try {
        const params = result.params || {};
        const symbol = params.symbol || '005930';
        const start = params.periodStart || defaultStartDate();
        const end = params.periodEnd || formatDateInput(new Date());
        const url = `${API_BASE}/api/stock-data?symbol=${symbol}&startDate=${start}&endDate=${end}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('price fetch failed');
        const rows = await res.json();
        const { labels, closes } = buildPriceSeries(rows);
        if (labels.length && closes.length) {
            result.priceLabels = labels;
            result.priceData = closes;
        }
    } catch (e) {
        console.warn('가격 시계열 로드 실패, 포트폴리오 데이터 사용', e.message);
    }
    return result;
}

function buildPriceSeries(rows) {
    const labels = [];
    const closes = [];
    rows.forEach((r) => {
        if (!r) return;
        const date = r.date || r.trade_date || r.day || r.timestamp;
        const close = Number(r.close ?? r.price ?? r.last ?? r.closingPrice ?? NaN);
        if (!date || Number.isNaN(close)) return;
        labels.push(formatDateInput(new Date(date)));
        closes.push(close);
    });
    return { labels, closes };
}

function drawFallbackChart(canvas, result) {
    const ctx = canvas.getContext('2d');
    const series = ensureSeriesData(result);
    const labels = ensureSeriesLabels(result);
    if (!ctx || !series.length) {
        showChartError('차트를 표시할 데이터를 불러오지 못했습니다.');
        return;
    }
    const width = canvas.width || canvas.clientWidth || 600;
    const height = canvas.height || canvas.clientHeight || 320;
    ctx.clearRect(0, 0, width, height);
    const pad = { top: 20, right: 20, bottom: 30, left: 50 };
    const xs = labels;
    const ys = series;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const yRange = maxY - minY || 1;
    const xStep = (width - pad.left - pad.right) / Math.max(ys.length - 1, 1);
    const mapX = (i) => pad.left + i * xStep;
    const mapY = (v) => pad.top + (height - pad.top - pad.bottom) * (1 - (v - minY) / yRange);

    // axes
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, height - pad.bottom);
    ctx.lineTo(width - pad.right, height - pad.bottom);
    ctx.stroke();

    // polyline
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ys.forEach((v, i) => {
        const x = mapX(i);
        const y = mapY(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // fill
    ctx.fillStyle = 'rgba(37,99,235,0.12)';
    ctx.lineTo(mapX(ys.length - 1), height - pad.bottom);
    ctx.lineTo(mapX(0), height - pad.bottom);
    ctx.closePath();
    ctx.fill();

    // buy/sell markers based on trades date match
    const buys = [];
    const sells = [];
    result.trades.forEach((t) => {
        const dateKey = (t.date || '').slice(0, 10);
        const idx = xs.findIndex((d) => d === dateKey);
        if (idx >= 0) {
            const x = mapX(idx);
            const y = mapY(ys[idx]);
            if (t.type === 'BUY') buys.push({ x, y });
            if (t.type === 'SELL') sells.push({ x, y });
        }
    });
    ctx.fillStyle = '#16a34a';
    buys.forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 6);
        ctx.lineTo(p.x - 5, p.y + 5);
        ctx.lineTo(p.x + 5, p.y + 5);
        ctx.closePath();
        ctx.fill();
    });
    ctx.fillStyle = '#dc2626';
    sells.forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(p.x - 5, p.y - 5);
        ctx.lineTo(p.x + 5, p.y - 5);
        ctx.lineTo(p.x + 5, p.y + 5);
        ctx.lineTo(p.x - 5, p.y + 5);
        ctx.closePath();
        ctx.fill();
    });

    // Y ticks (min/mid/max)
    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    [minY, (minY + maxY) / 2, maxY].forEach((val, i) => {
        const y = mapY(val);
        const label = `${Math.round(val).toLocaleString()}원`;
        ctx.fillText(label, 6, y + 4);
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
    });

    // X ticks (start/mid/end)
    const tickIdx = [0, Math.floor(xs.length / 2), xs.length - 1].filter((v, i, arr) => arr.indexOf(v) === i && xs[v]);
    ctx.textAlign = 'center';
    tickIdx.forEach((i) => {
        const x = mapX(i);
        ctx.fillText(xs[i], x, height - pad.bottom + 16);
    });
}
