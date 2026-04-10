import numpy as np
import gymnasium as gym
from gymnasium import spaces
from .microgrid_env import MicrogridEnv

# Map discrete action index → continuous action value
DISCRETE_ACTION_MAP = {
    0: np.array([-1.0], dtype=np.float32),   # Full charge
    1: np.array([-0.5], dtype=np.float32),   # Partial charge
    2: np.array([0.0],  dtype=np.float32),   # Hold
    3: np.array([0.5],  dtype=np.float32),   # Partial discharge
    4: np.array([1.0],  dtype=np.float32),   # Full discharge
}
ACTION_LABELS = ["Full Charge", "Partial Charge", "Hold", "Partial Discharge", "Full Discharge"]


class DiscreteMicrogridEnv(MicrogridEnv):
    """
    Discrete action space wrapper for DQN.
    5 actions: full_charge | partial_charge | hold | partial_discharge | full_discharge
    Inherits all physics from MicrogridEnv.
    """

    def __init__(self, df, n_actions: int = 5, **kwargs):
        super().__init__(df, **kwargs)
        self.n_actions = n_actions
        self.action_space = spaces.Discrete(n_actions)

    def step(self, action: int):
        continuous_action = DISCRETE_ACTION_MAP[int(action) % self.n_actions]
        obs, reward, terminated, truncated, info = super().step(continuous_action)
        info["discrete_action"] = int(action)
        info["action_label"] = ACTION_LABELS[int(action) % self.n_actions]
        return obs, reward, terminated, truncated, info
