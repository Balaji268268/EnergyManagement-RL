import json
import traceback
from pathlib import Path
from threading import Lock

# ── File-backed storage ────────────────────────────────────────────────────────
REGISTRY_PATH = Path("models/job_registry.json")

# Global job registry — shared by training threads
TRAINING_JOBS: dict = {}
COMPARE_JOBS: dict = {}
JOBS_LOCK = Lock()


def _save_registry():
    """Persist TRAINING_JOBS to disk (called inside JOBS_LOCK)."""
    try:
        REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
        REGISTRY_PATH.write_text(json.dumps(TRAINING_JOBS, indent=2))
    except Exception:
        pass  # never crash a training thread over a disk write


def load_registry():
    """
    Load persisted jobs from disk into TRAINING_JOBS on server startup.
    Also scans models/**/metadata.json for jobs not yet in the registry
    (e.g. models trained before this persistence was added).
    """
    with JOBS_LOCK:
        # 1. Load the registry file if it exists
        if REGISTRY_PATH.exists():
            try:
                saved = json.loads(REGISTRY_PATH.read_text())
                TRAINING_JOBS.update(saved)
            except Exception:
                pass

        # 2. Scan all metadata.json files — ensures models trained before
        #    persistence was added still appear in the job list.
        for meta_file in Path("models").glob("*/metadata.json"):
            try:
                meta = json.loads(meta_file.read_text())
                job_id = meta.get("job_id")
                if not job_id or job_id in TRAINING_JOBS:
                    continue  # already known

                algo = meta.get("algorithm", "unknown")
                model_file = meta.get("model_file", "")
                model_path = str(meta_file.parent / model_file)
                exists = Path(model_path).exists()

                # Try to load summary from summary.json if present
                summary = None
                summary_file = meta_file.parent / "summary.json"
                if summary_file.exists():
                    try:
                        summary = json.loads(summary_file.read_text())
                    except Exception:
                        pass

                # Try to load progress from progress.json if present
                progress = []
                progress_file = meta_file.parent / "progress.json"
                if progress_file.exists():
                    try:
                        progress = json.loads(progress_file.read_text())
                    except Exception:
                        pass

                TRAINING_JOBS[job_id] = {
                    "job_id": job_id,
                    "algorithm": algo,
                    "status": "completed" if exists else "failed",
                    "progress": progress,
                    "model_path": model_path if exists else None,
                    "summary": summary,
                    "error": None,
                    "config": {
                        "total_timesteps": meta.get("total_timesteps", 0),
                        "learning_rate": meta.get("learning_rate", 0),
                        "batch_size": meta.get("batch_size", 0),
                        "gamma": meta.get("gamma", 0),
                    },
                }
            except Exception:
                pass

        # Re-save consolidated registry
        _save_registry()


def update_job(job_id: str, updates: dict):
    with JOBS_LOCK:
        if job_id in TRAINING_JOBS:
            TRAINING_JOBS[job_id].update(updates)
            _save_registry()


def update_compare(compare_id: str, updates: dict):
    with JOBS_LOCK:
        if compare_id in COMPARE_JOBS:
            COMPARE_JOBS[compare_id].update(updates)
