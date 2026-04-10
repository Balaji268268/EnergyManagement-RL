import numpy as np
import pandas as pd


def generate_synthetic_microgrid_data(days: int = 30, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    hours = days * 24
    idx = np.arange(hours)
    hour_of_day = idx % 24
    day_of_week = (idx // 24) % 7

    # Demand: morning + evening peaks, weekday higher
    base_load = 50 + 8 * np.sin(2 * np.pi * (hour_of_day - 7) / 24)
    evening_peak = 15 * np.exp(-((hour_of_day - 19) ** 2) / 8)
    morning_peak = 8 * np.exp(-((hour_of_day - 8) ** 2) / 6)
    weekday_factor = np.where(day_of_week < 5, 1.0, 0.75)
    noise = rng.normal(0, 2.5, size=hours)
    load = np.clip((base_load + evening_peak + morning_peak) * weekday_factor + noise, 20, 120)

    # Solar: realistic bell curve with cloud noise
    solar_base = np.maximum(0, np.sin(np.pi * (hour_of_day - 6) / 12))
    cloud_factor = np.clip(1.0 - 0.4 * rng.beta(2, 5, size=hours), 0.3, 1.0)
    solar = np.clip(25 * solar_base * cloud_factor + rng.normal(0, 0.5, size=hours), 0, None)

    # Wind: autocorrelated, slightly higher at night
    wind_base = 8 + 4 * np.cos(2 * np.pi * hour_of_day / 24 + np.pi)
    wind_noise = np.zeros(hours)
    wind_noise[0] = rng.normal(0, 2)
    for i in range(1, hours):
        wind_noise[i] = 0.85 * wind_noise[i - 1] + rng.normal(0, 1)
    wind = np.clip(wind_base + wind_noise, 0, 30)

    # Price: time-of-use with peak hours 17-22
    price_base = np.full(hours, 0.10)
    peak_mask = (hour_of_day >= 17) & (hour_of_day <= 22)
    shoulder_mask = (hour_of_day >= 9) & (hour_of_day < 17)
    price_base[peak_mask] = 0.22
    price_base[shoulder_mask] = 0.15
    price_noise = rng.uniform(-0.01, 0.02, size=hours)
    demand_factor = 0.03 * (load / load.max())
    price = np.clip(price_base + price_noise + demand_factor, 0.05, 0.35)

    df = pd.DataFrame({
        "t": idx,
        "hour": hour_of_day,
        "day": idx // 24,
        "load": load,
        "solar": solar,
        "wind": wind,
        "price": price,
    })

    # Forecasts (shifted with small noise)
    # Use ffill() for trailing NaN (from negative shifts), then bfill() for leading, then fillna(0) safety net
    for h in [1, 2, 3]:
        base_load  = df["load"].shift(-h).ffill().bfill().fillna(df["load"].mean())
        base_solar = df["solar"].shift(-h).ffill().bfill().fillna(0)
        base_wind  = df["wind"].shift(-h).ffill().bfill().fillna(0)
        base_price = df["price"].shift(-h).ffill().bfill().fillna(0.12)
        df[f"f_load_{h}"]  = (base_load  + rng.normal(0, 1.5, size=hours)).round(4)
        df[f"f_solar_{h}"] = np.clip(base_solar + rng.normal(0, 0.5, size=hours), 0, None).round(4)
        df[f"f_wind_{h}"]  = np.clip(base_wind  + rng.normal(0, 0.5, size=hours), 0, None).round(4)
        df[f"f_price_{h}"] = np.clip(base_price + rng.uniform(-0.005, 0.005, size=hours), 0.05, None).round(4)

    # Final safety: replace any inf/nan that snuck through
    df = df.replace([np.inf, -np.inf], np.nan).fillna(0)
    return df.reset_index(drop=True)


def generate_test_data(days: int = 14, seed: int = 99) -> pd.DataFrame:
    return generate_synthetic_microgrid_data(days=days, seed=seed)
