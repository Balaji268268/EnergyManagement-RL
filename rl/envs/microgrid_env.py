import numpy as np
import gymnasium as gym
from gymnasium import spaces


class MicrogridEnv(gym.Env):
    """
    Full microgrid environment for SAC/PPO (continuous action).

    Observation (20-dim):
      [0]  soc_norm          Battery SOC normalised [0,1]
      [1]  load              Current demand (kW)
      [2]  solar             Current solar generation (kW)
      [3]  wind              Current wind generation (kW)
      [4]  price             Electricity price ($/kWh)
      [5]  sin_hour          Cyclical hour encoding
      [6]  cos_hour          Cyclical hour encoding
      [7-9]  f_load_1/2/3    Load forecasts t+1,+2,+3 h
      [10-11] f_solar_1/2   Solar forecasts t+1,+2 h
      [12-13] f_wind_1/2    Wind forecasts t+1,+2 h
      [14-15] f_price_1/2   Price forecasts t+1,+2 h
      [16]  daily_peak_norm  Today's peak grid import normalised
      [17]  renewable_ratio  Renewable / load ratio
      [18]  net_demand_norm  Net demand (load - renew) normalised
      [19]  soc_trend        Rate of SOC change (last step)

    Action (continuous, 1-dim):
      [-1, 0] → charge  (magnitude * max_charge_kw)
      [ 0,+1] → discharge (magnitude * max_discharge_kw)

    Reward:
      r = -(energy_cost + λ_peak*peak_penalty + λ_viol*violation + λ_deg*degradation)
           + export_revenue + λ_renew*renewable_bonus
    """

    metadata = {"render_modes": []}

    def __init__(
        self,
        df,
        battery_capacity_kwh: float = 100.0,
        max_charge_kw: float = 25.0,
        max_discharge_kw: float = 25.0,
        dt_hours: float = 1.0,
        charge_efficiency: float = 0.95,
        discharge_efficiency: float = 0.95,
        soc_min: float = 0.10,
        soc_max: float = 0.95,
        peak_penalty_weight: float = 0.08,
        violation_penalty_weight: float = 30.0,
        degradation_weight: float = 0.005,
        renewable_bonus_weight: float = 0.02,
    ):
        super().__init__()
        self.df = df.reset_index(drop=True)
        self.n = len(self.df)

        self.capacity = battery_capacity_kwh
        self.max_charge_kw = max_charge_kw
        self.max_discharge_kw = max_discharge_kw
        self.dt = dt_hours
        self.charge_eff = charge_efficiency
        self.discharge_eff = discharge_efficiency
        self.soc_min = soc_min * battery_capacity_kwh
        self.soc_max = soc_max * battery_capacity_kwh

        self.peak_w = peak_penalty_weight
        self.viol_w = violation_penalty_weight
        self.deg_w = degradation_weight
        self.renew_w = renewable_bonus_weight

        self.action_space = spaces.Box(
            low=np.array([-1.0], dtype=np.float32),
            high=np.array([1.0], dtype=np.float32),
            dtype=np.float32,
        )
        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf, shape=(20,), dtype=np.float32
        )

        self.t = 0
        self.soc = 0.5 * self.capacity
        self.daily_peak = 0.0
        self.prev_soc = 0.5 * self.capacity

    def _row(self, t: int):
        return self.df.iloc[min(t, self.n - 1)]

    def _get_obs(self) -> np.ndarray:
        r = self._row(self.t)
        hour = float(r["hour"])
        renew = float(r["solar"]) + float(r["wind"])
        load = float(r["load"])
        net = max(load - renew, 0.0)
        soc_trend = (self.soc - self.prev_soc) / (self.capacity + 1e-6)

        return np.array([
            self.soc / self.capacity,                      # 0
            load / 100.0,                                   # 1  normalised
            float(r["solar"]) / 30.0,                      # 2
            float(r["wind"]) / 30.0,                       # 3
            float(r["price"]) / 0.35,                      # 4
            np.sin(2 * np.pi * hour / 24),                 # 5
            np.cos(2 * np.pi * hour / 24),                 # 6
            float(r["f_load_1"]) / 100.0,                  # 7
            float(r["f_load_2"]) / 100.0,                  # 8
            float(r["f_load_3"]) / 100.0,                  # 9
            float(r["f_solar_1"]) / 30.0,                  # 10
            float(r["f_solar_2"]) / 30.0,                  # 11
            float(r["f_wind_1"]) / 30.0,                   # 12
            float(r["f_wind_2"]) / 30.0,                   # 13
            float(r["f_price_1"]) / 0.35,                  # 14
            float(r["f_price_2"]) / 0.35,                  # 15
            self.daily_peak / 100.0,                        # 16
            min(renew / (load + 1e-6), 2.0),               # 17
            net / 100.0,                                    # 18
            float(np.clip(soc_trend, -1, 1)),              # 19
        ], dtype=np.float32)

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.t = 0
        self.soc = 0.5 * self.capacity
        self.prev_soc = self.soc
        self.daily_peak = 0.0
        return self._get_obs(), {}

    def step(self, action):
        r = self._row(self.t)
        a = float(np.clip(action[0], -1.0, 1.0))

        self.prev_soc = self.soc

        # Battery physics
        if a < 0:
            # Charging: energy flows into battery
            requested_charge_kw = abs(a) * self.max_charge_kw
            delta_kwh = requested_charge_kw * self.dt * self.charge_eff
            self.soc = min(self.soc + delta_kwh, self.capacity)
        else:
            # Discharging: energy flows out of battery
            requested_discharge_kw = a * self.max_discharge_kw
            delta_kwh = requested_discharge_kw * self.dt / self.discharge_eff
            self.soc = max(self.soc - delta_kwh, 0.0)

        # SOC constraint violations
        violation = 0.0
        if self.soc < self.soc_min:
            violation += (self.soc_min - self.soc)
            self.soc = self.soc_min
        if self.soc > self.soc_max:
            violation += (self.soc - self.soc_max)
            self.soc = self.soc_max

        actual_delta = self.soc - self.prev_soc
        battery_power_kw = -actual_delta / self.dt  # positive = discharging to grid

        # Energy balance
        load = float(r["load"])
        solar = float(r["solar"])
        wind = float(r["wind"])
        price = float(r["price"])
        renewable = solar + wind

        net_load = load - renewable - battery_power_kw
        grid_import = max(net_load, 0.0)
        grid_export = max(-net_load, 0.0)

        # Peak tracking (reset daily)
        if self.t % 24 == 0 and self.t > 0:
            self.daily_peak = 0.0
        self.daily_peak = max(self.daily_peak, grid_import)

        # Renewable utilisation
        renewable_used = min(renewable, load)
        renewable_ratio = renewable_used / (load + 1e-6)
        renewable_bonus = self.renew_w * renewable_ratio

        # Costs & rewards
        energy_cost = grid_import * price
        export_revenue = grid_export * price * 0.5
        peak_penalty = self.peak_w * self.daily_peak
        degradation = self.deg_w * abs(actual_delta)
        viol_cost = self.viol_w * violation

        reward = (
            -energy_cost
            + export_revenue
            - peak_penalty
            - degradation
            - viol_cost
            + renewable_bonus
        )

        info = {
            "t": int(self.t),
            "hour": int(r["hour"]),
            "soc_kwh": float(self.soc),
            "soc_pct": float(self.soc / self.capacity * 100),
            "grid_import_kw": float(grid_import),
            "grid_export_kw": float(grid_export),
            "battery_power_kw": float(battery_power_kw),
            "action": float(a),
            "renewable_gen_kw": float(renewable),
            "renewable_ratio": float(renewable_ratio),
            "energy_cost": float(energy_cost),
            "export_revenue": float(export_revenue),
            "peak_penalty": float(peak_penalty),
            "degradation_cost": float(degradation),
            "violation_cost": float(viol_cost),
            "renewable_bonus": float(renewable_bonus),
            "reward": float(reward),
            "net_cost": float(energy_cost - export_revenue),
            "price": float(price),
            "load": float(load),
            "solar": float(solar),
            "wind": float(wind),
            "daily_peak": float(self.daily_peak),
        }

        self.t += 1
        terminated = self.t >= self.n - 1
        obs = self._get_obs() if not terminated else np.zeros(20, dtype=np.float32)
        return obs, reward, terminated, False, info
