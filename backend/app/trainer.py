import traceback
from pathlib import Path

from .job_store import TRAINING_JOBS, COMPARE_JOBS, update_job, update_compare
from rl.train_sac import train_sac
from rl.train_ppo import train_ppo
from rl.train_dqn import train_dqn
from rl.evaluate import compare_all, evaluate_model


TRAINER_MAP = {
    "sac": train_sac,
    "ppo": train_ppo,
    "dqn": train_dqn,
}


def run_training_job(job_id: str, algorithm: str, config: dict):
    try:
        update_job(job_id, {"status": "running"})
        model_dir = f"models/{job_id}"
        trainer_fn = TRAINER_MAP[algorithm]

        def on_progress(timestep: int, mean_reward: float, std_reward: float):
            if job_id in TRAINING_JOBS:
                progress = TRAINING_JOBS[job_id].get("progress", [])
                progress.append({
                    "timestep": timestep,
                    "mean_reward": mean_reward,
                    "std_reward": std_reward,
                })
                update_job(job_id, {"progress": progress})
                # Also write to per-job file as durable backup
                try:
                    import json
                    Path(model_dir).mkdir(parents=True, exist_ok=True)
                    (Path(model_dir) / "progress.json").write_text(json.dumps(progress))
                except Exception:
                    pass

        model_path = trainer_fn(
            job_id=job_id,
            model_dir=model_dir,
            progress_fn=on_progress,
            **config,
        )

        # Post-training evaluation
        summary, _ = evaluate_model(model_path, algorithm, days=14, seed=99)

        # Persist summary to per-job file as durable backup
        try:
            import json
            (Path(model_dir) / "summary.json").write_text(json.dumps(summary))
        except Exception:
            pass

        update_job(job_id, {
            "status": "completed",
            "model_path": model_path,
            "summary": summary,
        })

    except Exception as e:
        update_job(job_id, {
            "status": "failed",
            "error": f"{e}\n{traceback.format_exc()}",
        })


def run_compare_job(compare_id: str, model_registry: dict, days: int, seed: int):
    try:
        update_compare(compare_id, {"status": "running"})
        results = compare_all(model_registry=model_registry, days=days, seed=seed)
        update_compare(compare_id, {"status": "completed", "results": results})
    except Exception as e:
        update_compare(compare_id, {
            "status": "failed",
            "error": f"{e}\n{traceback.format_exc()}",
        })
