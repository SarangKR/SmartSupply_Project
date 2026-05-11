from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import pickle

from app.services.inventory_service import (
    calculate_safety_stock,
    calculate_reorder_point,
    calculate_eoq
)

app = FastAPI(title="SmartSupply API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)



MODEL_PATH = "app/models/prophet_models.pkl"
DATA_PATH = "app/data/processed_train.csv"

with open(MODEL_PATH, "rb") as f:
    models = pickle.load(f)

df = pd.read_csv(DATA_PATH)
df["date"] = pd.to_datetime(df["date"])


class ForecastRequest(BaseModel):
    item: int
    days: int
    lead_time: int
    holding_cost: float
    ordering_cost: float


@app.post("/forecast")
def forecast(req: ForecastRequest):

    model = models[req.item]

    future = model.make_future_dataframe(periods=req.days)
    fc = model.predict(future)

    history = df[df["item"] == req.item].tail(180)
    forecast = fc.tail(req.days)

    avg_sales = forecast["yhat"].mean()
    std_sales = history["sales"].std()

    safety_stock = calculate_safety_stock(std_sales, req.lead_time)
    reorder_point = calculate_reorder_point(avg_sales, req.lead_time, safety_stock)
    annual_demand = avg_sales * 365
    eoq = calculate_eoq(annual_demand, req.ordering_cost, req.holding_cost)

    return {
        "avg_sales": float(avg_sales),
        "safety_stock": safety_stock,
        "reorder_point": reorder_point,
        "eoq": eoq,
        "forecast": forecast[["ds", "yhat"]].to_dict(orient="records")
    }