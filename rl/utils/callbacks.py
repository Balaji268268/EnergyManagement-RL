import json
from pathlib import Path
import numpy as np
from stable_baselines3.common.callbacks import BaseCallback


class TrainingProgressCallback(BaseCallback):
    """
    Callback that records training progress and notifies the backend via a callback function.
    Also writes progress to a JSON file for persistence.
    """

    def __init__(
        self,
        model_dir: str,
        check_freq: int = 1000,
        progress_fn=None,
        verbose: int = 0,
    ):
        super().__init__(verbose)
        self.model_dir = Path(model_dir)
        self.check_freq = check_freq
        self.progress_fn = progress_fn
        self.progress: list = []
        self.episode_rewards: list = []

    def _on_step(self) -> bool:
        if self.n_calls % self.check_freq == 0:
            if len(self.model.ep_info_buffer) > 0:
                ep_rewards = [ep["r"] for ep in self.model.ep_info_buffer]
                mean_reward = float(np.mean(ep_rewards))
                std_reward = float(np.std(ep_rewards))
            else:
                mean_reward = 0.0
                std_reward = 0.0

            point = {
                "timestep": int(self.num_timesteps),
                "mean_reward": mean_reward,
                "std_reward": std_reward,
            }
            self.progress.append(point)

            if self.progress_fn:
                self.progress_fn(int(self.num_timesteps), mean_reward, std_reward)

            # Persist to file
            progress_file = self.model_dir / "progress.json"
            progress_file.write_text(json.dumps(self.progress))

        return True
