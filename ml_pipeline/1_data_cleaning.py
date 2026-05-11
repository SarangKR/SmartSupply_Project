import pandas as pd
import numpy as np
import os

INPUT_FILE = '../data/raw_sales.csv'
OUTPUT_TRAIN = '../data/processed_train.csv'
OUTPUT_TEST  = '../data/processed_test.csv'

SELECTED_STORE = 1
SELECTED_ITEMS = [1, 2, 3, 4, 5]

print("Loading raw data..")
df = pd.read_csv(INPUT_FILE)

df['date'] = pd.to_datetime(df['date'])

print(f"Original Dataset Size: {df.shape[0]} rows")

print(f"Filtering for Store {SELECTED_STORE} and Items {SELECTED_ITEMS}...")

df_filtered = df[
    (df['store'] == SELECTED_STORE) &
    (df['item'].isin(SELECTED_ITEMS))
].copy()

print(f"Filtered Dataset Size: {df_filtered.shape[0]} rows")

print("Generating Time Features..")

df_filtered['year'] = df_filtered['date'].dt.year
df_filtered['month'] = df_filtered['date'].dt.month
df_filtered['day'] = df_filtered['date'].dt.day
df_filtered['day_of_week'] = df_filtered['date'].dt.dayofweek
df_filtered['is_weekend'] = df_filtered['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)

df_filtered = df_filtered.sort_values(by=['item', 'date'])


print("Splitting into Train and Test sets..")

split_date = '2017-10-01'

train_df = df_filtered[df_filtered['date'] < split_date]
test_df = df_filtered[df_filtered['date'] >= split_date]


os.makedirs(os.path.dirname(OUTPUT_TRAIN), exist_ok=True)

train_df.to_csv(OUTPUT_TRAIN, index=False)
test_df.to_csv(OUTPUT_TEST, index=False)

print("\nSUCCESS! Data processing complete.")
print(f"Training Data Saved to: {OUTPUT_TRAIN} ({train_df.shape[0]} rows)")
print(f"Testing Data Saved to:  {OUTPUT_TEST} ({test_df.shape[0]} rows)")