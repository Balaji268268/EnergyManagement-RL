import numpy as np
import pandas as pd
from stable_baselines3 import SAC, PPO, DQN

from rl.envs.microgrid_env import MicrogridEnv
from rl.envs.discrete_env import DiscreteMicrogridEnv
from rl.utils.data_utils import generate_test_data
from rl.baselines import rule_based_action, naive_action, rule_based_discrete_action


def rollout(env, policy_fn) -> pd.DataFrame:
    obs, _ = env.reset()
    rows = []
    done = False
    while not done:
        action = policy_fn(obs)
        obs, reward, terminated, truncated, info = env.step(action)
        rows.append(info)
        done = terminated or truncated
    return pd.DataFrame(rows)


def summarise(df: pd.DataFrame) -> dict:
    return {
        "total_energy_cost": float(df["energy_cost"].sum()),
        "total_export_revenue": float(df["export_revenue"].sum()),
        "net_cost": float(df["net_cost"].sum()),
        "peak_grid_import": float(df["grid_import_kw"].max()),
        "avg_grid_import": float(df["grid_import_kw"].mean()),
        "total_reward": float(df["reward"].sum()),
        "total_violations": float(df["violation_cost"].sum()),
        "total_degradation": float(df["degradation_cost"].sum()),
        "renewable_ratio": float(df["renewable_ratio"].mean()),
        "avg_soc_pct": float(df["soc_pct"].mean()),
        "steps": int(len(df)),
    }


def load_model(model_path: str, algorithm: str):
    algo_map = {"sac": SAC, "ppo": PPO, "dqn": DQN}
    cls = algo_map.get(algorithm.lower())
    if cls is None:
        raise ValueError(f"Unknown algorithm: {algorithm}")
    return cls.load(model_path)


def evaluate_model(model_path: str, algorithm: str, days: int = 14, seed: int = 99):
    df_test = generate_test_data(days=days, seed=seed)
    algorithm = algorithm.lower()

    model = load_model(model_path, algorithm)

    if algorithm == "dqn":
        env = DiscreteMicrogridEnv(df_test)
        def policy(obs):
            action, _ = model.predict(obs, deterministic=True)
            return int(action)
    else:
        env = MicrogridEnv(df_test)
        def policy(obs):
            action, _ = model.predict(obs, deterministic=True)
            return action

    results_df = rollout(env, policy)
    summary = summarise(results_df)
    return summary, results_df.to_dict(orient="records")


def evaluate_baselines(days: int = 14, seed: int = 99):
    df_test = generate_test_data(days=days, seed=seed)
    results = {}

    # Rule-based (continuous)
    env = MicrogridEnv(df_test)
    rb_df = rollout(env, rule_based_action)
    results["rule_based"] = {
        "summary": summarise(rb_df),
        "steps": rb_df.to_dict(orient="records"),
    }

    # Naive (always hold)
    env = MicrogridEnv(df_test)
    naive_df = rollout(env, naive_action)
    results["naive"] = {
        "summary": summarise(naive_df),
        "steps": naive_df.to_dict(orient="records"),
    }

    return results


def compare_all(model_registry: dict, days: int = 14, seed: int = 99) -> dict:
    """
    model_registry: {algorithm: model_path}  e.g. {"sac": "models/xxx/sac_model.zip"}
    Returns dict with summary + step data for each policy.
    """
    results = {}

    # RL models
    for algo, path in model_registry.items():
        try:
            summary, steps = evaluate_model(path, algo, days=days, seed=seed)
            results[algo] = {"summary": summary, "steps": steps, "available": True}
        except Exception as e:
            results[algo] = {"summary": {}, "steps": [], "available": False, "error": str(e)}

    # Baselines
    baselines = evaluate_baselines(days=days, seed=seed)
    results.update(baselines)

    return results
