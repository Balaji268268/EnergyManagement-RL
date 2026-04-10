import json
from pathlib import Path
from stable_baselines3 import DQN
from stable_baselines3.common.monitor import Monitor

from rl.envs.discrete_env import DiscreteMicrogridEnv
from rl.utils.data_utils import generate_synthetic_microgrid_data
from rl.utils.callbacks import TrainingProgressCallback


def train_dqn(
    job_id: str,
    total_timesteps: int = 100_000,
    learning_rate: float = 1e-4,
    batch_size: int = 64,
    gamma: float = 0.99,
    model_dir: str = None,
    env_kwargs: dict = None,
    progress_fn=None,
) -> str:
    if model_dir is None:
        model_dir = f"models/{job_id}"
    if env_kwargs is None:
        env_kwargs = {}

    Path(model_dir).mkdir(parents=True, exist_ok=True)

    df = generate_synthetic_microgrid_data(days=60, seed=42)
    env = Monitor(DiscreteMicrogridEnv(df, **env_kwargs))

    check_freq = max(500, total_timesteps // 100)
    callback = TrainingProgressCallback(
        model_dir=model_dir,
        check_freq=check_freq,
        progress_fn=progress_fn,
    )

    model = DQN(
        "MlpPolicy",
        env,
        learning_rate=learning_rate,
        buffer_size=100_000,
        batch_size=batch_size,
        gamma=gamma,
        exploration_fraction=0.2,
        exploration_final_eps=0.05,
        train_freq=4,
        target_update_interval=1000,
        verbose=0,
    )
    model.learn(total_timesteps=total_timesteps, callback=callback)

    model_path = f"{model_dir}/dqn_model"
    model.save(model_path)

    metadata = {
        "algorithm": "dqn",
        "job_id": job_id,
        "total_timesteps": total_timesteps,
        "learning_rate": learning_rate,
        "batch_size": batch_size,
        "gamma": gamma,
        "model_file": "dqn_model.zip",
    }
    (Path(model_dir) / "metadata.json").write_text(json.dumps(metadata))
    return model_path + ".zip"
