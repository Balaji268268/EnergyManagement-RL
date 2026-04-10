import json
from pathlib import Path
from stable_baselines3 import SAC
from stable_baselines3.common.monitor import Monitor

from rl.envs.microgrid_env import MicrogridEnv
from rl.utils.data_utils import generate_synthetic_microgrid_data
from rl.utils.callbacks import TrainingProgressCallback


def train_sac(
    job_id: str,
    total_timesteps: int = 100_000,
    learning_rate: float = 3e-4,
    batch_size: int = 256,
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
    env = Monitor(MicrogridEnv(df, **env_kwargs))

    check_freq = max(500, total_timesteps // 100)
    callback = TrainingProgressCallback(
        model_dir=model_dir,
        check_freq=check_freq,
        progress_fn=progress_fn,
    )

    model = SAC(
        "MlpPolicy",
        env,
        learning_rate=learning_rate,
        buffer_size=100_000,
        batch_size=batch_size,
        gamma=gamma,
        tau=0.005,
        train_freq=1,
        gradient_steps=1,
        verbose=0,
    )
    model.learn(total_timesteps=total_timesteps, callback=callback)

    model_path = f"{model_dir}/sac_model"
    model.save(model_path)

    metadata = {
        "algorithm": "sac",
        "job_id": job_id,
        "total_timesteps": total_timesteps,
        "learning_rate": learning_rate,
        "batch_size": batch_size,
        "gamma": gamma,
        "model_file": "sac_model.zip",
    }
    (Path(model_dir) / "metadata.json").write_text(json.dumps(metadata))
    return model_path + ".zip"
