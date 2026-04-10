import numpy as np


def rule_based_action(obs: np.ndarray) -> np.ndarray:
    """
    Intelligent rule-based controller.
    obs: [soc_norm, load_norm, solar_norm, wind_norm, price_norm, sin_h, cos_h, ...]
    """
    soc = float(obs[0])          # [0, 1]
    load = float(obs[1]) * 100   # kW (denorm)
    solar = float(obs[2]) * 30   # kW (denorm)
    wind = float(obs[3]) * 30    # kW (denorm)
    price = float(obs[4]) * 0.35 # $/kWh (denorm)
    sin_h = float(obs[5])
    cos_h = float(obs[6])
    hour = int(round(np.degrees(np.arctan2(sin_h, cos_h)) / 15) % 24)

    renewable = solar + wind
    renewable_surplus = renewable - load

    # Charge during high renewable surplus (excess solar/wind)
    if renewable_surplus > 10 and soc < 0.90:
        return np.array([-1.0], dtype=np.float32)

    # Charge during off-peak hours (midnight to 6am) if cheap
    if 0 <= hour <= 6 and price < 0.12 and soc < 0.85:
        return np.array([-0.8], dtype=np.float32)

    # Discharge during expensive peak hours (5pm - 10pm)
    if 17 <= hour <= 22 and price > 0.18 and soc > 0.25:
        return np.array([0.9], dtype=np.float32)

    # Moderate discharge when price elevated and SOC healthy
    if price > 0.15 and soc > 0.40:
        return np.array([0.5], dtype=np.float32)

    # Emergency charge if SOC critically low
    if soc < 0.12:
        return np.array([-0.6], dtype=np.float32)

    return np.array([0.0], dtype=np.float32)


def naive_action(obs: np.ndarray) -> np.ndarray:
    """No battery control — always idle. Used as weakest baseline."""
    return np.array([0.0], dtype=np.float32)


def rule_based_discrete_action(obs: np.ndarray) -> int:
    """Rule-based for discrete env — maps to discrete action index."""
    cont = rule_based_action(obs)
    val = float(cont[0])
    if val <= -0.75:
        return 0  # Full charge
    elif val <= -0.25:
        return 1  # Partial charge
    elif val <= 0.25:
        return 2  # Hold
    elif val <= 0.75:
        return 3  # Partial discharge
    else:
        return 4  # Full discharge
