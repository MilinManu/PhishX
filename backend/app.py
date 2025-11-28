from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback
import xgboost as xgb
import torch
import requests
import numpy as np
from transformers import DistilBertTokenizer, DistilBertModel

# Keep your existing whitelist function if you still have that file.
# If not, you can remove this import and the check below.
try:
    from feature_extractor_111 import check_whitelist
except ImportError:
    # Fallback if the file is missing
    def check_whitelist(url): return False

app = Flask(__name__)
CORS(app)

# --- 1. SETUP: LOAD MODELS (Global Scope) ---
print("Initializing AI Engine...")

# A. Load XGBoost Model
try:
    # We use the XGBClassifier wrapper to load the saved model
    xgb_model = xgb.XGBClassifier()
    xgb_model.load_model('phishing_xgboost.model') # Ensure this file exists
    print("✅ XGBoost Model loaded.")
except Exception as e:
    print(f"❌ Error loading XGBoost model: {e}")
    xgb_model = None

# B. Load BERT (DistilBERT)
try:
    print("⏳ Loading BERT Tokenizer & Model (this may take a moment)...")
    tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
    bert_model = DistilBertModel.from_pretrained('distilbert-base-uncased')
    bert_model.eval() # Set to evaluation mode (faster, no training)
    print("✅ BERT Model loaded.")
except Exception as e:
    print(f"❌ Error loading BERT: {e}")
    bert_model = None

# --- 2. HELPER FUNCTIONS ---

def unshorten_url(url):
    """
    Follows redirects (bit.ly, tinyurl) to find the actual destination.
    """
    try:
        response = requests.head(url, allow_redirects=True, timeout=3)
        return response.url
    except:
        return url

def get_bert_embedding(url):
    """
    Converts URL string -> Token IDs -> 768-dim Vector
    """
    # Tokenize
    inputs = tokenizer(
        [url], 
        padding=True, 
        truncation=True, 
        max_length=128, 
        return_tensors="pt"
    )
    
    # Get Embeddings
    with torch.no_grad(): # Disable gradient calculation for speed
        outputs = bert_model(**inputs)
        
    # Extract [CLS] token (the first vector) and convert to numpy
    return outputs.last_hidden_state[:, 0, :].numpy()

# --- 3. THE API ROUTE ---

@app.route('/analyze', methods=['POST'])
def analyze():
    if not xgb_model or not bert_model:
        return jsonify({'error': 'AI models are not fully loaded'}), 500
        
    try:
        data = request.get_json()
        raw_url = data.get('url', '')

        if not raw_url:
            return jsonify({'error': 'No URL provided'}), 400

        # Step A: Whitelist Check (Fast Path)
        if check_whitelist(raw_url): 
            return jsonify({
                'status': 'Safe', 
                'score': 100.0, 
                'url': raw_url,
                'method': 'Whitelist'
            })
            
        # Step B: Unshorten URL (Hidden Trap Check)
        final_url = unshorten_url(raw_url)
        
        # Step C: Extract Features using BERT
        # This replaces the old 'extract_111_features' function
        embedding_vector = get_bert_embedding(final_url)

        # Step D: Predict with XGBoost
        # predict_proba returns [[prob_safe, prob_phishing]]
        probabilities = xgb_model.predict_proba(embedding_vector)[0]
        prediction = xgb_model.predict(embedding_vector)[0]

        is_phishing = prediction == 1
        
        # Calculate score (Confidence %)
        # Convert numpy types to Python floats for JSON serialization
        if is_phishing:
            status = 'Phishing'
            score = float(probabilities[1] * 100)
        else:
            status = 'Safe'
            score = float(probabilities[0] * 100)

        return jsonify({
            'status': status,
            'score': round(score, 2),
            'url': final_url, # Return the resolved URL so user sees where they actually went
            'original_url': raw_url,
            'method': 'BERT+XGBoost'
        })

    except Exception as e:
        print(traceback.format_exc()) 
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

if __name__ == '__main__':
    print("🚀 Starting Flask server (Hybrid BERT-XGBoost Engine)...")
    app.run(port=5000, debug=True)