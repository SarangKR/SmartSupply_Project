import pandas as pd
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error
import pickle
import os

TRAIN_FILE = '../data/processed_train.csv'
TEST_FILE = '../data/processed_test.csv'
MODEL_SAVE_PATH = '../models/prophet_models.pkl'

print("Loading datasets..")
train_df = pd.read_csv(TRAIN_FILE)
test_df = pd.read_csv(TEST_FILE)

train_df['date'] = pd.to_datetime(train_df['date'])
test_df['date'] = pd.to_datetime(test_df['date'])

item_list = train_df['item'].unique()

trained_models = {}

print(f"Found {len(item_list)} items to train. Starting training..")

for item_id in item_list:
    print(f"Training model for Item {item_id}...")

    item_train = train_df[train_df['item'] == item_id].copy()
    item_test = test_df[test_df['item'] == item_id].copy()

    prophet_train = item_train[['date', 'sales']].rename(columns={'date': 'ds', 'sales': 'y'})
    prophet_test = item_test[['date', 'sales']].rename(columns={'date': 'ds', 'sales': 'y'})

    model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)

    model.fit(prophet_train)

    forecast = model.predict(prophet_test[['ds']])

    y_true = prophet_test['y'].values
    y_pred = forecast['yhat'].values

    mae = mean_absolute_error(y_true, y_pred)

    print(f" -> Item {item_id} Performance: MAE = {mae:.2f} (On average, error is off by {mae:.2f} units)")

    trained_models[item_id] = model


os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)

with open(MODEL_SAVE_PATH, 'wb') as f:
    pickle.dump(trained_models, f)

print(f"All models saved successfully to {MODEL_SAVE_PATH}")
