# SmartSupply - Enterprise Inventory Intelligence

SmartSupply is an AI-powered supply chain and inventory management system. It leverages machine learning to forecast demand and automatically calculate critical inventory metrics, helping businesses avoid stockouts and reduce holding costs.

## Features

- **Demand Forecasting**: Uses Facebook's Prophet machine learning model to predict future demand for various SKUs based on historical sales data.
- **Inventory Metrics Calculation**: Automatically calculates Safety Stock, Reorder Points, and Economic Order Quantity (EOQ).
- **Interactive Dashboard**: A beautiful, responsive React frontend (built with Vite) that visualizes forecasts, current stock levels, and critical alerts using Recharts.
- **System Health & Exception Alerts**: Monitors inventory levels and alerts you to stockouts and demand spikes.

## Tech Stack

- **Frontend**: React 19, Vite, Recharts, CSS
- **Backend**: Python, FastAPI, Uvicorn
- **Machine Learning**: Facebook Prophet, Scikit-Learn, Pandas

---

## Project Structure

```text
SmartSupply_Project/
├── frontend/           # React + Vite web application
├── backend/            # FastAPI server serving the ML models
└── ml_pipeline/        # Python scripts for data cleaning & model training
```

---

## Running Locally

### 1. Start the Backend

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
The API will be available at `http://localhost:8000`.

### 2. Start the Frontend

Open a new terminal and navigate to the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```
The web app will be available at `http://localhost:5173`. By default, it will automatically connect to the local backend.

---

## Deployment

### Frontend (Vercel)
The frontend is optimized for deployment on Vercel. 
1. Import the project into Vercel and set the **Root Directory** to `frontend`.
2. Vercel will automatically detect Vite and configure the build command (`npm run build`).
3. Add an Environment Variable `VITE_API_BASE_URL` pointing to your deployed backend API URL.

### Backend (Render / Railway / Heroku)
The backend requires a Python environment and cannot be deployed as a standard Vercel serverless function due to the size of ML libraries (Prophet, Pandas).
1. Deploy the backend on a platform like Render.
2. Set the **Root Directory** to `backend`.
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## Machine Learning Pipeline

If you need to retrain the forecasting models with new data, navigate to the `ml_pipeline` directory and run the scripts in order:

```bash
cd ml_pipeline
python 1_data_cleaning.py
python 2_forecasting.py
```
This will generate new serialized `.pkl` models which are then used by the FastAPI backend.
