import uuid
import json
import math
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware


def _sanitise(obj: Any) -> Any:
    """Recursively replace NaN/Inf with None so JSON serialisation never fails."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: _sanitise(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitise(v) for v in obj]
    return obj

from .schemas import TrainRequest, TrainResponse, SimulateRequest, CompareRequest
from .job_store import TRAINING_JOBS, COMPARE_JOBS, JOBS_LOCK, load_registry, _save_registry, update_job
from .trainer import run_training_job, run_compare_job
from .simulator import run_simulation
from rl.utils.data_utils import generate_synthetic_microgrid_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load persisted job history on startup, then background-evaluate any null-summary jobs."""
    load_registry()
    # Kick off background evaluation for any completed jobs missing summary
    def _bg_evaluate():
        from rl.evaluate import evaluate_model
        for job in list(TRAINING_JOBS.values()):
            if job.get("status") == "completed" and job.get("summary") is None:
                try:
                    summary, _ = evaluate_model(
                        job["model_path"], job["algorithm"], days=14, seed=99
                    )
                    model_dir = str(Path(job["model_path"]).parent)
                    try:
                        import json as _json
                        (Path(model_dir) / "summary.json").write_text(_json.dumps(summary))
                    except Exception:
                        pass
                    update_job(job["job_id"], {"summary": summary})
                except Exception:
                    pass
    threading.Thread(target=_bg_evaluate, daemon=True).start()
    yield


app = FastAPI(
    title="SmartGrid RL API",
    description="Full-stack RL microgrid control system with SAC, PPO, and DQN",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


# ─── Training ─────────────────────────────────────────────────────────────────

@app.post("/api/train", response_model=TrainResponse)
def start_training(req: TrainRequest):
    algo = req.algorithm.lower()
    if algo not in ("sac", "ppo", "dqn"):
        raise HTTPException(400, f"Unknown algorithm '{algo}'. Choose sac, ppo, or dqn.")

    job_id = str(uuid.uuid4())
    config = {
        "total_timesteps": req.total_timesteps,
        "learning_rate": req.learning_rate,
        "batch_size": req.batch_size,
        "gamma": req.gamma,
        "env_kwargs": {
            "peak_penalty_weight": req.peak_penalty_weight,
            "violation_penalty_weight": req.violation_penalty_weight,
            "degradation_weight": req.degradation_weight,
            "renewable_bonus_weight": req.renewable_bonus_weight,
        },
    }
    if algo == "ppo":
        config["n_steps"] = req.n_steps

    with JOBS_LOCK:
        TRAINING_JOBS[job_id] = {
            "job_id": job_id,
            "algorithm": algo,
            "status": "queued",
            "progress": [],
            "model_path": None,
            "summary": None,
            "error": None,
            "config": config,
        }

    thread = threading.Thread(
        target=run_training_job,
        args=(job_id, algo, config),
        daemon=True,
    )
    thread.start()
    return {"job_id": job_id, "status": "queued"}


@app.get("/api/train/{job_id}")
def training_status(job_id: str):
    job = TRAINING_JOBS.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found")
    return job


@app.get("/api/jobs")
def list_jobs():
    return list(TRAINING_JOBS.values())


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str):
    if job_id not in TRAINING_JOBS:
        raise HTTPException(404, "Job not found")
    with JOBS_LOCK:
        del TRAINING_JOBS[job_id]
        _save_registry()
    return {"deleted": job_id}


@app.get("/api/jobs/{job_id}/evaluate")
def evaluate_job(job_id: str):
    """Re-run evaluation for a completed job — useful to populate null summaries."""
    from rl.evaluate import evaluate_model
    job = TRAINING_JOBS.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found")
    if job["status"] != "completed" or not job.get("model_path"):
        raise HTTPException(400, "Job is not completed or has no saved model")
    try:
        summary, steps = evaluate_model(job["model_path"], job["algorithm"], days=14, seed=99)
        model_dir = str(Path(job["model_path"]).parent)
        try:
            (Path(model_dir) / "summary.json").write_text(json.dumps(summary))
        except Exception:
            pass
        update_job(job_id, {"summary": summary})
        return _sanitise({"summary": summary, "steps": steps})
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/jobs/{job_id}/steps")
def job_steps(job_id: str):
    """Return full step-by-step simulation for a completed job."""
    from rl.evaluate import evaluate_model
    job = TRAINING_JOBS.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found")
    if job["status"] != "completed" or not job.get("model_path"):
        raise HTTPException(400, "Job is not completed or has no saved model")
    try:
        summary, steps = evaluate_model(job["model_path"], job["algorithm"], days=14, seed=99)
        return _sanitise({"job_id": job_id, "algorithm": job["algorithm"], "summary": summary, "steps": steps})
    except Exception as e:
        raise HTTPException(500, str(e))


# ─── Models ───────────────────────────────────────────────────────────────────

@app.get("/api/models")
def list_models():
    models_dir = Path("models")
    if not models_dir.exists():
        return []
    result = []
    for meta_file in models_dir.glob("*/metadata.json"):
        try:
            meta = json.loads(meta_file.read_text())
            job_dir = meta_file.parent
            model_file = meta.get("model_file", "")
            model_path = job_dir / model_file
            meta["model_path"] = str(model_path)
            meta["exists"] = model_path.exists()
            result.append(meta)
        except Exception:
            pass
    return result


# ─── Simulation ───────────────────────────────────────────────────────────────

@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    try:
        steps = run_simulation(
            algorithm=req.algorithm,
            model_path=req.model_path,
            days=req.days,
            seed=req.seed,
        )
        return _sanitise({"algorithm": req.algorithm, "days": req.days, "steps": steps})
    except Exception as e:
        raise HTTPException(400, str(e))


# ─── Comparison ───────────────────────────────────────────────────────────────

@app.post("/api/compare")
def start_compare(req: CompareRequest):
    compare_id = str(uuid.uuid4())

    # Build model registry from request or scan saved models
    registry = {}
    if req.sac_path:
        registry["sac"] = req.sac_path
    if req.ppo_path:
        registry["ppo"] = req.ppo_path
    if req.dqn_path:
        registry["dqn"] = req.dqn_path

    # Auto-find latest model for each algo if not specified
    if not registry:
        registry = _find_latest_models()

    with JOBS_LOCK:
        COMPARE_JOBS[compare_id] = {
            "compare_id": compare_id,
            "status": "queued",
            "results": None,
            "error": None,
        }

    thread = threading.Thread(
        target=run_compare_job,
        args=(compare_id, registry, req.days, req.seed),
        daemon=True,
    )
    thread.start()
    return {"compare_id": compare_id, "status": "queued"}


@app.get("/api/compare/{compare_id}")
def get_compare(compare_id: str):
    job = COMPARE_JOBS.get(compare_id)
    if not job:
        raise HTTPException(404, f"Compare job {compare_id} not found")
    return job


@app.get("/api/compare-jobs")
def list_compare_jobs():
    return list(COMPARE_JOBS.values())


def _find_latest_models() -> dict:
    """Scan models/ dir and return most recent model per algorithm."""
    models_dir = Path("models")
    if not models_dir.exists():
        return {}
    latest: dict = {}
    for meta_file in sorted(models_dir.glob("*/metadata.json")):
        try:
            meta = json.loads(meta_file.read_text())
            algo = meta.get("algorithm", "")
            model_file = meta.get("model_file", "")
            model_path = meta_file.parent / model_file
            if algo and model_path.exists():
                latest[algo] = str(model_path)
        except Exception:
            pass
    return latest


# ─── Data Preview ─────────────────────────────────────────────────────────────

@app.get("/api/data/preview")
def data_preview(days: int = Query(1, ge=1, le=7), seed: int = Query(42)):
    df = generate_synthetic_microgrid_data(days=days, seed=seed)
    records = df.head(days * 24).to_dict(orient="records")
    return {"days": days, "records": _sanitise(records)}


# ─── Dashboard live metrics ────────────────────────────────────────────────────

@app.get("/api/dashboard/metrics")
def dashboard_metrics():
    """Return aggregate metrics from all completed training jobs."""
    completed = [j for j in TRAINING_JOBS.values() if j["status"] == "completed"]
    if not completed:
        return {"completed_jobs": 0, "algorithms_trained": []}

    return {
        "completed_jobs": len(completed),
        "algorithms_trained": list({j["algorithm"] for j in completed}),
        "best_by_algorithm": {
            j["algorithm"]: j.get("summary", {})
            for j in completed
        },
    }


# ─── Expected Outcomes Analysis ───────────────────────────────────────────────

@app.post("/api/outcomes")
def get_outcomes(req: CompareRequest):
    """
    Full expected-outcome analysis for the project brief:
      1. Cost savings demonstration  (per-policy net cost + cumulative curves)
      2. Trade-off curves            (energy_cost vs violations vs peak)
      3. Policy interpretation       (hourly action, action vs price, action vs SOC)
    Runs rule_based + naive always; adds RL models if available.
    """
    from rl.evaluate import compare_all

    registry = _find_latest_models()
    if not req.sac_path and not req.ppo_path and not req.dqn_path:
        # auto-discover
        pass
    else:
        if req.sac_path:
            registry["sac"] = req.sac_path
        if req.ppo_path:
            registry["ppo"] = req.ppo_path
        if req.dqn_path:
            registry["dqn"] = req.dqn_path

    results = compare_all(model_registry=registry, days=req.days, seed=req.seed)

    # ── 1. Trade-off points ───────────────────────────────────────────────────
    tradeoff_points = []
    for algo, d in results.items():
        s = d.get("summary", {})
        if not s:
            continue
        tradeoff_points.append({
            "algo": algo,
            "energy_cost": s.get("total_energy_cost", 0),
            "export_revenue": s.get("total_export_revenue", 0),
            "net_cost": s.get("net_cost", 0),
            "violations": s.get("total_violations", 0),
            "peak": s.get("peak_grid_import", 0),
            "reward": s.get("total_reward", 0),
            "renewable_ratio": s.get("renewable_ratio", 0),
            "degradation": s.get("total_degradation", 0),
        })

    # ── 2. Cumulative cost curves (per-step) ─────────────────────────────────
    cumulative: dict = {}
    for algo, d in results.items():
        steps = d.get("steps", [])
        running = 0.0
        curve = []
        for i, st in enumerate(steps):
            running += float(st.get("energy_cost", 0)) - float(st.get("export_revenue", 0))
            curve.append({"t": i, "cumulative_cost": round(running, 4)})
        cumulative[algo] = curve

    # ── 3. Policy interpretation ─────────────────────────────────────────────
    interpretation: dict = {}
    for algo, d in results.items():
        steps = d.get("steps", [])
        if not steps:
            continue

        # Hourly averages (0–23)
        hourly_bins: dict = {h: {"actions": [], "costs": [], "soc": []} for h in range(24)}
        action_vs_price = []
        action_vs_soc = []

        for st in steps:
            h = int(st.get("hour", 0)) % 24
            a = float(st.get("action", 0))
            c = float(st.get("energy_cost", 0))
            soc = float(st.get("soc_pct", 50))
            price = float(st.get("price", 0.12))
            hourly_bins[h]["actions"].append(a)
            hourly_bins[h]["costs"].append(c)
            hourly_bins[h]["soc"].append(soc)
            # Sample every 3rd step for scatter plots
            if len(action_vs_price) < 300:
                action_vs_price.append({"price": round(price, 4), "action": round(a, 3), "soc": round(soc, 1)})
            if len(action_vs_soc) < 300:
                action_vs_soc.append({"soc": round(soc, 1), "action": round(a, 3), "price": round(price, 4)})

        hourly_avg = []
        for h in range(24):
            bucket = hourly_bins[h]
            n = len(bucket["actions"]) or 1
            hourly_avg.append({
                "hour": h,
                "avg_action": round(sum(bucket["actions"]) / n, 3),
                "avg_cost": round(sum(bucket["costs"]) / n, 4),
                "avg_soc": round(sum(bucket["soc"]) / n, 1),
            })

        # Action distribution buckets
        charge_full = sum(1 for st in steps if float(st.get("action", 0)) <= -0.6)
        charge_part = sum(1 for st in steps if -0.6 < float(st.get("action", 0)) <= -0.1)
        hold = sum(1 for st in steps if -0.1 < float(st.get("action", 0)) < 0.1)
        discharge_part = sum(1 for st in steps if 0.1 <= float(st.get("action", 0)) < 0.6)
        discharge_full = sum(1 for st in steps if float(st.get("action", 0)) >= 0.6)
        total = len(steps) or 1

        interpretation[algo] = {
            "hourly_avg": hourly_avg,
            "action_vs_price": action_vs_price,
            "action_vs_soc": action_vs_soc,
            "action_distribution": [
                {"label": "Full Charge",       "pct": round(charge_full / total * 100, 1)},
                {"label": "Partial Charge",    "pct": round(charge_part / total * 100, 1)},
                {"label": "Hold",              "pct": round(hold / total * 100, 1)},
                {"label": "Partial Discharge", "pct": round(discharge_part / total * 100, 1)},
                {"label": "Full Discharge",    "pct": round(discharge_full / total * 100, 1)},
            ],
        }

    # ── 4. Hour-by-hour cost comparison (first 24h) ───────────────────────────
    hourly_cost_compare = []
    for h in range(24):
        row: dict = {"hour": h}
        for algo, d in results.items():
            steps = d.get("steps", [])
            matching = [s for s in steps if int(s.get("hour", -1)) == h]
            if matching:
                row[algo] = round(sum(s.get("energy_cost", 0) for s in matching) / len(matching), 4)
        hourly_cost_compare.append(row)

    return _sanitise({
        "summaries": {algo: d.get("summary", {}) for algo, d in results.items()},
        "tradeoff_points": tradeoff_points,
        "cumulative_cost": cumulative,
        "interpretation": interpretation,
        "hourly_cost_compare": hourly_cost_compare,
        "algorithms_run": list(results.keys()),
    })
