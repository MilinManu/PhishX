import numpy as np
import pandas as pd
import torch
import xgboost as xgb
from transformers import DistilBertTokenizer, DistilBertModel
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from tqdm import tqdm

# --- CONFIGURATION ---
# We use fewer rows (10,000) so this runs fast on your laptop CPU
SAMPLE_SIZE = 10000 
DATASET_PATH = 'malicious_phish.csv'
MODEL_SAVE_PATH = 'phishing_xgboost.model'

print("--- STARTING LOCAL TRAINING ---")

# 1. SETUP CPU
device = torch.device('cpu') # Force CPU to avoid memory crashes on laptop
print(f"Using device: {device}")

# 2. LOAD DATA
if not pd.io.common.file_exists(DATASET_PATH):
    print(f"❌ ERROR: {DATASET_PATH} not found! Please download it to this folder.")
    exit()

print("Loading dataset...")
df = pd.read_csv(DATASET_PATH)
df['label'] = df['type'].apply(lambda x: 0 if x == 'benign' else 1)

# Balance the dataset (50% safe, 50% phishing) to make it smarter
safe = df[df['label'] == 0].sample(n=SAMPLE_SIZE//2, random_state=42)
phish = df[df['label'] == 1].sample(n=SAMPLE_SIZE//2, random_state=42)
df = pd.concat([safe, phish])

urls = df['url'].tolist()
labels = df['label'].tolist()
print(f"Training on {len(urls)} balanced examples.")

# 3. BERT FEATURES
print("Loading BERT (this might take a minute)...")
tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
bert_model = DistilBertModel.from_pretrained('distilbert-base-uncased').to(device)

def get_bert_embeddings(url_list, batch_size=16):
    embeddings = []
    # Using small batch size (16) to be safe on laptop RAM
    for i in tqdm(range(0, len(url_list), batch_size), desc="Processing URLs"):
        batch = url_list[i : i + batch_size]
        inputs = tokenizer(batch, padding=True, truncation=True, max_length=128, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = bert_model(**inputs)
        embeddings.extend(outputs.last_hidden_state[:, 0, :].numpy())
    return np.array(embeddings)

print("Extracting features from URLs...")
X = get_bert_embeddings(urls)
y = np.array(labels)

# 4. TRAIN XGBOOST
print("Training XGBoost Classifier...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Using JSON format for saving, which is more compatible
xgb_model = xgb.XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, use_label_encoder=False, eval_metric='logloss')
xgb_model.fit(X_train, y_train)

# 5. EVALUATE
preds = xgb_model.predict(X_test)
acc = accuracy_score(y_test, preds)
print(f"\n✅ Training Complete! Accuracy: {acc*100:.2f}%")

# Save using JSON format to prevent "Unknown file format" errors
xgb_model.save_model(MODEL_SAVE_PATH)
print(f"Model saved to {MODEL_SAVE_PATH}")