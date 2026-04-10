from rl.envs.microgrid_env import MicrogridEnv
from rl.envs.discrete_env import DiscreteMicrogridEnv
from rl.utils.data_utils import generate_synthetic_microgrid_data, generate_test_data
from rl.baselines import rule_based_action, naive_action
from rl.evaluate import load_model


def run_simulation(
    algorithm: str,
    model_path: str = None,
    days: int = 7,
    seed: int = 99,
) -> list:
    """
    Run a full simulation episode and return step-level data.
    algorithm: "sac" | "ppo" | "dqn" | "rule_based" | "naive"
    """
    df = generate_test_data(days=days, seed=seed)

    if algorithm in ("sac", "ppo", "dqn"):
        if not model_path:
            raise ValueError(f"model_path required for {algorithm}")
        model = load_model(model_path, algorithm)

        if algorithm == "dqn":
            env = DiscreteMicrogridEnv(df)
            def policy(obs):
                a, _ = model.predict(obs, deterministic=True)
                return int(a)
        else:
            env = MicrogridEnv(df)
            def policy(obs):
                a, _ = model.predict(obs, deterministic=True)
                return a

    elif algorithm == "rule_based":
        env = MicrogridEnv(df)
        policy = rule_based_action

    elif algorithm == "naive":
        env = MicrogridEnv(df)
        policy = naive_action

    else:
        raise ValueError(f"Unknown algorithm: {algorithm}")

    obs, _ = env.reset()
    steps = []
    done = False

    while not done:
        action = policy(obs)
        obs, reward, terminated, truncated, info = env.step(action)
        steps.append(info)
        done = terminated or truncated

    return steps
