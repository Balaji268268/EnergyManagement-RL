from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class TrainRequest(BaseModel):
    algorithm: str = Field("sac", description="sac | ppo | dqn")
    total_timesteps: int = Field(100_000, ge=100, le=2_000_000)
    learning_rate: float = Field(3e-4, gt=0)
    batch_size: int = Field(256, ge=16, le=1024)
    gamma: float = Field(0.99, gt=0, le=1.0)
    n_steps: int = Field(2048, ge=64)   # PPO only (default ignored for SAC/DQN)
    peak_penalty_weight: float = Field(0.08, ge=0)
    violation_penalty_weight: float = Field(30.0, ge=0)
    degradation_weight: float = Field(0.005, ge=0)
    renewable_bonus_weight: float = Field(0.02, ge=0)


class TrainResponse(BaseModel):
    job_id: str
    status: str


class SimulateRequest(BaseModel):
    algorithm: str = Field("rule_based", description="sac | ppo | dqn | rule_based | naive")
    model_path: Optional[str] = None
    days: int = Field(7, ge=1, le=30)
    seed: int = Field(99)


class CompareRequest(BaseModel):
    days: int = Field(14, ge=1, le=30)
    seed: int = Field(99)
    sac_path: Optional[str] = None
    ppo_path: Optional[str] = None
    dqn_path: Optional[str] = None
