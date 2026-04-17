# Energy Management with Reinforcement Learning (Smart Grid RL)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.9%2B-blue)
![Next.js](https://img.shields.io/badge/next.js-16-black)

A professional, full-stack application for optimizing microgrid and smart grid energy management using Deep Reinforcement Learning (DRL). This project leverages advanced RL algorithms to intelligently balance energy generation, consumption, and battery storage, maximizing efficiency and minimizing costs.

## 🌟 Key Features

* **Advanced RL Algorithms**: Implements Deep Q-Network (DQN), Proximal Policy Optimization (PPO), and Soft Actor-Critic (SAC) using `stable-baselines3`.
* **Custom Environment**: Utilizes OpenAI `Gymnasium` to simulate a realistic microgrid environment with fluctuating energy demands, renewable generation, and pricing.
* **High-Performance API backend**: Built with **FastAPI** to serve the trained models and simulation data quickly and reliably.
* **Interactive Dashboard**: A modern **Next.js** frontend with rich, dynamic visualizations utilizing `Recharts` to monitor agent performance, grid status, and financial metrics in real-time.
* **Containerized Deployment**: Fully dockerized utilizing `docker-compose` for seamless, one-click deployment.

## 🛠️ Technology Stack

### Backend & Machine Learning
* Python 3.9+
* FastAPI & Uvicorn
* PyTorch
* Stable-Baselines3 & Gymnasium
* Pandas & NumPy

### Frontend
* Next.js 16 (React 18)
* TypeScript
* Recharts (Data Visualization)
* Lucide React (Icons)

### Infrastructure
* Docker & Docker Compose

---

## 🚀 Getting Started

You can run the project either using Docker (recommended for ease of use) or set it up locally for active development.

### Prerequisites
* Git
* Docker and Docker Compose (if using the Docker method)
* Python 3.9+ and Node.js 18+ (if setting up locally)

### Option 1: Running with Docker (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Balaji268268/EnergyManagement-RL.git
   cd EnergyManagement-RL
   ```

2. **Build and start the containers**:
   ```bash
   docker-compose up --build
   ```

3. **Access the application**:
   * **Frontend Dashboard**: `http://localhost:3000`
   * **Backend API Docs (SwaggerUI)**: `http://localhost:8000/docs`

### Option 2: Local Setup (For Development)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Balaji268268/EnergyManagement-RL.git
   cd EnergyManagement-RL
   ```

#### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The frontend will be available at `http://localhost:3000`.*

---

## 🧠 Training the RL Models

The repository includes scripts to train the RL agents. Run these scripts from the project root.

1. **Train DQN (Deep Q-Network)**:
   ```bash
   python rl/train_dqn.py
   ```
2. **Train PPO (Proximal Policy Optimization)**:
   ```bash
   python rl/train_ppo.py
   ```
3. **Train SAC (Soft Actor-Critic)**:
   ```bash
   python rl/train_sac.py
   ```

Trained models are saved in the `models/` directory, and the performance can be evaluated using `python rl/evaluate.py`. Evaluation metrics are output to `metrics_table.json`.

---

## 📂 Project Structure

```text
EnergyManagement-RL/
│
├── backend/            # FastAPI server and application logic
├── frontend/           # Next.js web application and UI components
├── models/             # Directory for saved trained RL models
├── rl/                 # Reinforcement Learning training & evaluation scripts
│   ├── envs/           # Custom Gymnasium environments
│   └── utils/          # RL utility functions
├── docker-compose.yml  # Multi-container Docker configuration
└── README.md           # Project documentation
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📄 License

This project is open-source and available under the MIT License.
