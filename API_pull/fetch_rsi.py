"""
Fetch daily OHLC data from Kiwoom REST API, compute RSI, and export to CSV.

Usage:
  python fetch_rsi.py 005930 --period 14 --rows 200

Environment variables:
  KIWOOM_APP_KEY       Kiwoom issued app key
  KIWOOM_SECRET_KEY    Kiwoom issued secret key
  KIWOOM_MODE          paper | live (default: paper, 모의투자 기준)
  KIWOOM_BASE_URL      Optional override (paper 기본: https://mockapi.kiwoom.com)
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import os
from pathlib import Path
from typing import Dict, List

import requests


# 모의투자/실계좌 모드에 따라 기본 URL 분기
DEFAULT_PAPER_URL = "https://mockapi.kiwoom.com"
DEFAULT_LIVE_URL = "https://openapi.kiwoom.com"  # 실계좌 사용 시 필요에 따라 수정

APP_KEY = os.getenv("KIWOOM_APP_KEY", "PwdbpffkSvnHD2YX3BghGpGt-6k-YNS5emdTuj7obC4")
SECRET_KEY = os.getenv("KIWOOM_SECRET_KEY", "8BxwlX_LK_eR7gIm8WPOJbx7KSCAKoKH8datKIgzAKM")
MODE = os.getenv("KIWOOM_MODE", "paper").lower()
BASE_URL = os.getenv("KIWOOM_BASE_URL") or (DEFAULT_PAPER_URL if MODE == "paper" else DEFAULT_LIVE_URL)
OUTPUT_DIR = Path(__file__).parent


class KiwoomAPIError(Exception):
    """Raised when a Kiwoom REST API call fails."""


def get_token() -> str:
    url = f"{BASE_URL}/oauth2/token"
    payload = {
        "grant_type": "client_credentials",
        "appkey": APP_KEY,
        "secretkey": SECRET_KEY,
    }
    response = requests.post(url, json=payload, timeout=10)
    if response.status_code != 200:
        raise KiwoomAPIError(f"Token request failed: {response.status_code} {response.text}")

    data = response.json()
    token = data.get("access_token") or data.get("token")
    if not token:
        raise KiwoomAPIError("Token missing in response.")
    return token


def fetch_daily_ohlc(token: str, symbol: str, *, base_date: str | None, rows: int) -> List[Dict]:
    """
    Request daily OHLC data (ka10081) and return a list sorted by date asc.
    base_date: YYYYMMDD string. If None, today's date is used by the API.
    rows: limit the number of rows to keep from the API response.
    """
    url = f"{BASE_URL}/api/dostk/chart"
    today = dt.date.today()
    payload = {
        "stk_cd": symbol,
        "base_dt": base_date or today.strftime("%Y%m%d"),
        "upd_stkpc_tp": "1",
    }
    headers = {
        "Content-Type": "application/json;charset=UTF-8",
        "authorization": f"Bearer {token}",
        "cont-yn": "N",
        "next-key": "",
        "api-id": "ka10081",
    }

    response = requests.post(url, json=payload, headers=headers, timeout=10)
    if response.status_code != 200:
        raise KiwoomAPIError(f"ka10081 request failed: {response.status_code} {response.text}")

    data = response.json()
    chart_array = (
        data.get("stk_dt_pole_chart_qry")
        or data.get("output")
        or data.get("data")
        or data.get("stk_min_pole_chart_qry")
        or []
    )

    if data.get("return_code") not in (0, "0") or not chart_array:
        raise KiwoomAPIError(f"ka10081 error: {data.get('return_msg') or 'no data returned'}")

    parsed = []
    for item in chart_array:
        close = int(str(item.get("cur_prc", "0")).replace("+", "").replace("-", ""))
        open_p = int(str(item.get("open_pric", "0")).replace("+", "").replace("-", ""))
        high = int(str(item.get("high_pric", "0")).replace("+", "").replace("-", ""))
        low = int(str(item.get("low_pric", "0")).replace("+", "").replace("-", ""))
        volume = int(str(item.get("trde_qty") or item.get("trde_prca") or "0").replace(",", ""))
        trade_date = item.get("dt") or item.get("trd_dd") or ""
        parsed.append(
            {
                "date": trade_date,
                "close": close,
                "open": open_p,
                "high": high,
                "low": low,
                "volume": volume,
            }
        )

    # Sort by date ascending to ensure RSI is calculated chronologically
    parsed.sort(key=lambda row: row["date"])
    return parsed[:rows]


def compute_rsi(ohlc: List[Dict], period: int) -> List[Dict]:
    if period < 2:
        raise ValueError("RSI period must be at least 2.")
    if len(ohlc) <= period:
        raise ValueError(f"Need at least {period + 1} data points to compute RSI.")

    gains: List[float] = [0.0]
    losses: List[float] = [0.0]

    for i in range(1, len(ohlc)):
        change = ohlc[i]["close"] - ohlc[i - 1]["close"]
        gains.append(max(change, 0))
        losses.append(max(-change, 0))

    avg_gain = sum(gains[1 : period + 1]) / period
    avg_loss = sum(losses[1 : period + 1]) / period

    rsi_rows: List[Dict] = []
    for idx in range(period + 1, len(ohlc)):
        avg_gain = ((avg_gain * (period - 1)) + gains[idx]) / period
        avg_loss = ((avg_loss * (period - 1)) + losses[idx]) / period

        if avg_loss == 0:
            rsi = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))

        rsi_rows.append(
            {
                "date": ohlc[idx]["date"],
                "close": ohlc[idx]["close"],
                "rsi": round(rsi, 2),
                "avg_gain": round(avg_gain, 4),
                "avg_loss": round(avg_loss, 4),
            }
        )

    return rsi_rows


def save_csv(symbol: str, rows: List[Dict]) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = OUTPUT_DIR / f"rsi_{symbol}_{timestamp}.csv"
    fieldnames = ["date", "close", "rsi", "avg_gain", "avg_loss"]

    with file_path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return file_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch daily RSI via Kiwoom REST and export to CSV.")
    parser.add_argument("symbol", help="Stock code (e.g., 005930)")
    parser.add_argument("--period", type=int, default=14, help="RSI period (default: 14)")
    parser.add_argument(
        "--rows",
        type=int,
        default=200,
        help="Number of latest rows to keep for RSI calculation (default: 200)",
    )
    parser.add_argument(
        "--base-date",
        dest="base_date",
        default=None,
        help="Base date in YYYYMMDD (defaults to today on server).",
    )
    args = parser.parse_args()

    token = get_token()
    ohlc = fetch_daily_ohlc(token, args.symbol, base_date=args.base_date, rows=args.rows)
    rsi_rows = compute_rsi(ohlc, args.period)
    csv_path = save_csv(args.symbol, rsi_rows)
    print(f"Saved {len(rsi_rows)} RSI rows to {csv_path}")


if __name__ == "__main__":
    main()
