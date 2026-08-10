"""Technical indicator math, implemented from scratch with numpy + pandas.

No indicator libraries (no ta-lib, no tti) — every indicator is derived from
first principles below. Each function takes pandas Series and returns Series
(or a tuple of Series) aligned to the input index.

Warm-up values — the window where the math is not yet defined (e.g. the first
``period - 1`` SMA values) — are NaN. The API layer strips NaNs, so responses
only ever contain meaningful points.

Math references:
    SMA      — simple arithmetic mean over a rolling window
    EMA      — exponentially weighted mean, alpha = 2 / (period + 1)
    RSI      — Wilder-smoothed relative strength index
    MACD     — difference of two EMAs + signal EMA + histogram
    Bollinger— SMA centre line ± k * population standard deviation
    ATR      — Wilder-smoothed mean true range
    Stochastic — %K / %D oscillator over the rolling high/low range
    OBV      — cumulative volume signed by the close-to-close direction
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def sma(series: pd.Series, period: int) -> pd.Series:
    """Simple Moving Average: mean of the last ``period`` observations."""
    if period < 1:
        raise ValueError("period must be >= 1")
    return series.rolling(window=period, min_periods=period).mean()


def ema(series: pd.Series, period: int) -> pd.Series:
    """Exponential Moving Average (span weighting, alpha = 2/(period+1))."""
    if period < 1:
        raise ValueError("period must be >= 1")
    return series.ewm(span=period, adjust=False).mean()


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    """Relative Strength Index with Wilder smoothing.

    rsi = 100 - 100 / (1 + RS),  RS = avg_gain / avg_loss

    Gains and losses are smoothed with the Wilder alpha (1/period). A flat
    market (no gains, no losses) reads 50; a market with only gains reads 100.
    The first ``period`` values are unreliable warm-up and are dropped.
    """
    if period < 1:
        raise ValueError("period must be >= 1")
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    alpha = 1.0 / period
    avg_gain = gain.ewm(alpha=alpha, adjust=False).mean()
    avg_loss = loss.ewm(alpha=alpha, adjust=False).mean()
    rs = avg_gain / avg_loss
    out = 100.0 - 100.0 / (1.0 + rs)
    out = out.where(avg_loss != 0, 100.0)  # no losses -> RSI 100
    out = out.where(~((avg_loss == 0) & (avg_gain == 0)), 50.0)  # flat -> 50
    out.iloc[:period] = np.nan
    return out


def macd(
    close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """MACD line, signal line and histogram.

    macd = ema(fast) - ema(slow); signal = ema(macd, signal); hist = macd - signal.
    """
    if fast < 1 or slow < 1 or signal < 1 or fast >= slow:
        raise ValueError("require 0 < fast < slow and signal >= 1")
    line = ema(close, fast) - ema(close, slow)
    sig = line.ewm(span=signal, adjust=False).mean()
    hist = line - sig
    # Both EMAs seed from close[0], so the first `slow` bars are unreliable
    # warm-up (the line starts at exactly 0.0). Mask them, consistent with
    # SMA/RSI trimming.
    line = line.copy()
    sig = sig.copy()
    hist = hist.copy()
    line.iloc[:slow] = np.nan
    sig.iloc[:slow] = np.nan
    hist.iloc[:slow] = np.nan
    return line, sig, hist


def bollinger(
    close: pd.Series, period: int = 20, std_dev: float = 2.0
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Bollinger Bands: SMA centre line ± k * population standard deviation."""
    if period < 1 or std_dev <= 0:
        raise ValueError("period must be >= 1 and std_dev > 0")
    mid = sma(close, period)
    std = close.rolling(window=period, min_periods=period).std(ddof=0)
    upper = mid + std_dev * std
    lower = mid - std_dev * std
    return upper, mid, lower


def atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """Average True Range (Wilder smoothing of the true range).

    tr = max(high - low, |high - prev_close|, |low - prev_close|)
    """
    if period < 1:
        raise ValueError("period must be >= 1")
    prev_close = close.shift(1)
    tr = pd.concat(
        [high - low, (high - prev_close).abs(), (low - prev_close).abs()],
        axis=1,
    ).max(axis=1)
    return tr.ewm(alpha=1.0 / period, adjust=False).mean()


def stochastic(
    high: pd.Series,
    low: pd.Series,
    close: pd.Series,
    period: int = 14,
    smooth_k: int = 3,
    smooth_d: int = 3,
) -> tuple[pd.Series, pd.Series]:
    """Stochastic oscillator.

    %K = 100 * (close - lowest_low) / (highest_high - lowest_low)
    %K is smoothed over ``smooth_k`` bars, %D is the ``smooth_d`` mean of %K.
    Windows with zero range are NaN (division by zero).
    """
    if period < 1 or smooth_k < 1 or smooth_d < 1:
        raise ValueError("periods must be >= 1")
    lowest = low.rolling(period, min_periods=period).min()
    highest = high.rolling(period, min_periods=period).max()
    spread = (highest - lowest).replace(0.0, np.nan)
    k = 100.0 * (close - lowest) / spread
    k = k.rolling(smooth_k, min_periods=1).mean()
    d = k.rolling(smooth_d, min_periods=1).mean()
    return k, d


def obv(close: pd.Series, volume: pd.Series) -> pd.Series:
    """On-Balance Volume: cumulative volume signed by the price direction."""
    direction = np.sign(close.diff()).fillna(0.0)
    return (direction * volume).cumsum()
