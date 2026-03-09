import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score, f1_score
import xgboost as xgb
from transformers import BertTokenizer, BertModel
import torch
from tqdm import tqdm
import pickle
import matplotlib.pyplot as plt
import seaborn as sns

class PhishingDetector:
    def __init__(self, model_name='bert-base-uncased', max_length=128):
        """
        Initialize the Phishing Detector with BERT + XGBoost
        
        Args:
            model_name: BERT model variant to use
            max_length: Maximum sequence length for BERT
        """
        self.max_length = max_length
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        
        # Load BERT tokenizer and model
        print(f"Loading BERT model: {model_name}")
        self.tokenizer = BertTokenizer.from_pretrained(model_name)
        self.bert_model = BertModel.from_pretrained(model_name)
        self.bert_model.to(self.device)
        self.bert_model.eval()
        
        # XGBoost classifier
        self.xgb_model = None
        
    def extract_bert_features(self, texts, batch_size=16):
        """
        Extract BERT embeddings from texts
        
        Args:
            texts: List of text strings (URLs)
            batch_size: Batch size for processing
            
        Returns:
            numpy array of BERT embeddings
        """
        embeddings = []
        
        with torch.no_grad():
            for i in tqdm(range(0, len(texts), batch_size), desc="Extracting BERT features"):
                batch_texts = texts[i:i + batch_size]
                
                # Tokenize
                encoded = self.tokenizer(
                    batch_texts,
                    padding=True,
                    truncation=True,
                    max_length=self.max_length,
                    return_tensors='pt'
                )
                
                # Move to device
                input_ids = encoded['input_ids'].to(self.device)
                attention_mask = encoded['attention_mask'].to(self.device)
                
                # Get BERT outputs
                outputs = self.bert_model(input_ids=input_ids, attention_mask=attention_mask)
                
                # Use [CLS] token embedding (first token)
                cls_embeddings = outputs.last_hidden_state[:, 0, :].cpu().numpy()
                embeddings.append(cls_embeddings)
        
        return np.vstack(embeddings)
    
    def train(self, X_train, y_train, X_val=None, y_val=None, xgb_params=None):
        """
        Train the model
        
        Args:
            X_train: Training texts (URLs)
            y_train: Training labels (0: legitimate, 1: phishing)
            X_val: Validation texts (optional)
            y_val: Validation labels (optional)
            xgb_params: XGBoost parameters
        """
        print("\n" + "="*60)
        print("STEP 1: Extracting BERT features from training data")
        print("="*60)
        train_features = self.extract_bert_features(X_train)
        print(f"Training features shape: {train_features.shape}")
        
        eval_set = None
        if X_val is not None and y_val is not None:
            print("\nExtracting BERT features from validation data...")
            val_features = self.extract_bert_features(X_val)
            eval_set = [(train_features, y_train), (val_features, y_val)]
        
        print("\n" + "="*60)
        print("STEP 2: Training XGBoost classifier")
        print("="*60)
        
        if xgb_params is None:
            xgb_params = {
                'objective': 'binary:logistic',
                'max_depth': 8,
                'learning_rate': 0.1,
                'n_estimators': 200,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'eval_metric': 'logloss',
                'random_state': 42,
                'tree_method': 'hist',
                'use_label_encoder': False
            }
        
        self.xgb_model = xgb.XGBClassifier(**xgb_params)
        
        if eval_set:
            self.xgb_model.fit(
                train_features, 
                y_train,
                eval_set=eval_set,
                verbose=True
            )
        else:
            self.xgb_model.fit(train_features, y_train)
        
        print("\n✓ Training completed!")
    
    def predict(self, X_test):
        """
        Make predictions
        
        Args:
            X_test: Test texts (URLs)
            
        Returns:
            Predictions (0: legitimate, 1: phishing)
        """
        if self.xgb_model is None:
            raise ValueError("Model not trained yet. Call train() first.")
        
        print("Extracting BERT features from test data...")
        test_features = self.extract_bert_features(X_test)
        
        print("Making predictions...")
        predictions = self.xgb_model.predict(test_features)
        
        return predictions
    
    def predict_proba(self, X_test):
        """
        Get prediction probabilities
        
        Args:
            X_test: Test texts
            
        Returns:
            Probability scores
        """
        if self.xgb_model is None:
            raise ValueError("Model not trained yet. Call train() first.")
        
        test_features = self.extract_bert_features(X_test)
        probabilities = self.xgb_model.predict_proba(test_features)
        
        return probabilities
    
    def evaluate(self, X_test, y_test):
        """
        Evaluate the model
        
        Args:
            X_test: Test texts
            y_test: True labels
        """
        predictions = self.predict(X_test)
        probabilities = self.predict_proba(X_test)
        
        print("\n" + "="*60)
        print("MODEL EVALUATION RESULTS")
        print("="*60)
        
        accuracy = accuracy_score(y_test, predictions)
        f1 = f1_score(y_test, predictions)
        roc_auc = roc_auc_score(y_test, probabilities[:, 1])
        
        print(f"\n📊 Overall Metrics:")
        print(f"   Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
        print(f"   F1-Score:  {f1:.4f}")
        print(f"   ROC-AUC:   {roc_auc:.4f}")
        
        print("\n📋 Classification Report:")
        print(classification_report(y_test, predictions, 
                                   target_names=['Legitimate', 'Phishing'],
                                   digits=4))
        
        print("\n📈 Confusion Matrix:")
        cm = confusion_matrix(y_test, predictions)
        print(cm)
        print(f"\nTrue Negatives:  {cm[0][0]} | False Positives: {cm[0][1]}")
        print(f"False Negatives: {cm[1][0]} | True Positives:  {cm[1][1]}")
        
        return {
            'accuracy': accuracy,
            'f1_score': f1,
            'roc_auc': roc_auc,
            'confusion_matrix': cm
        }
    
    def plot_confusion_matrix(self, X_test, y_test):
        """Plot confusion matrix"""
        predictions = self.predict(X_test)
        cm = confusion_matrix(y_test, predictions)
        
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                    xticklabels=['Legitimate', 'Phishing'],
                    yticklabels=['Legitimate', 'Phishing'])
        plt.title('Confusion Matrix')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.tight_layout()
        plt.savefig('confusion_matrix.png', dpi=300, bbox_inches='tight')
        print("Confusion matrix saved as 'confusion_matrix.png'")
        plt.show()
    
    def save_model(self, path='phishing_detector.pkl'):
        """Save the XGBoost model"""
        if self.xgb_model is None:
            raise ValueError("Model not trained yet.")
        
        with open(path, 'wb') as f:
            pickle.dump(self.xgb_model, f)
        print(f"✓ Model saved to {path}")
    
    def load_model(self, path='phishing_detector.pkl'):
        """Load a saved XGBoost model"""
        with open(path, 'rb') as f:
            self.xgb_model = pickle.load(f)
        print(f"✓ Model loaded from {path}")


# Main execution with PhiUSIIL Dataset
if __name__ == "__main__":
    print("="*60)
    print("PHISHING WEBSITE DETECTOR")
    print("BERT + XGBoost | PhiUSIIL Dataset")
    print("="*60)
    
    # Step 1: Load PhiUSIIL Dataset from UCI ML Repository
    print("\n📥 Loading PhiUSIIL Dataset from UCI ML Repository...")
    
    try:
        from ucimlrepo import fetch_ucirepo
        
        # Fetch dataset
        phishing_data = fetch_ucirepo(id=967)
        
        # Get features and targets
        X = phishing_data.data.features
        y = phishing_data.data.targets
        
        print(f"✓ Dataset loaded successfully!")
        print(f"   Total samples: {len(X)}")
        print(f"   Features shape: {X.shape}")
        
        # The dataset has URL as one of the features
        # We'll use the URL column for BERT
        if 'url' in X.columns:
            urls = X['url'].tolist()
        elif 'URL' in X.columns:
            urls = X['URL'].tolist()
        else:
            # If URL column name is different, print columns to identify
            print(f"Available columns: {X.columns.tolist()}")
            # Use the first column as URL
            urls = X.iloc[:, 0].tolist()
        
        # Convert targets to binary labels (0 or 1)
        if isinstance(y, pd.DataFrame):
            labels = y.iloc[:, 0].tolist()
        else:
            labels = y.tolist()
        
        # Ensure binary labels
        labels = [1 if label == 1 or label == 'phishing' else 0 for label in labels]
        
        print(f"\n📊 Label Distribution:")
        unique, counts = np.unique(labels, return_counts=True)
        for label, count in zip(unique, counts):
            label_name = "Phishing" if label == 1 else "Legitimate"
            print(f"   {label_name}: {count} ({count/len(labels)*100:.2f}%)")
        
    except ImportError:
        print("❌ Error: ucimlrepo not installed")
        print("   Install it using: pip install ucimlrepo")
        exit(1)
    except Exception as e:
        print(f"❌ Error loading dataset: {e}")
        print("\n   Alternative: Download manually from:")
        print("   https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset")
        exit(1)
    
    # Step 2: Optional - Use subset for faster training/testing
    USE_SUBSET = True  # Set to False for full dataset
    
    if USE_SUBSET:
        print("\n⚠️  Using subset of data for faster training...")
        subset_size = 10000
        if len(urls) > subset_size:
            indices = np.random.choice(len(urls), subset_size, replace=False)
            urls = [urls[i] for i in indices]
            labels = [labels[i] for i in indices]
            print(f"   Using {subset_size} samples")
    
    # Step 3: Split data
    print("\n🔀 Splitting data...")
    X_train, X_temp, y_train, y_temp = train_test_split(
        urls, labels,
        test_size=0.3,
        random_state=42,
        stratify=labels
    )
    
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp,
        test_size=0.5,
        random_state=42,
        stratify=y_temp
    )
    
    print(f"   Training samples:   {len(X_train)}")
    print(f"   Validation samples: {len(X_val)}")
    print(f"   Testing samples:    {len(X_test)}")
    
    # Step 4: Initialize detector
    print("\n🤖 Initializing BERT + XGBoost Detector...")
    detector = PhishingDetector(
        model_name='bert-base-uncased',
        max_length=128
    )
    
    # Step 5: Configure XGBoost parameters
    xgb_params = {
        'objective': 'binary:logistic',
        'max_depth': 8,
        'learning_rate': 0.1,
        'n_estimators': 200,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'eval_metric': ['logloss', 'error'],
        'random_state': 42,
        'tree_method': 'hist',
        'use_label_encoder': False
    }
    
    # Step 6: Train model
    print("\n🎯 Training model...")
    detector.train(X_train, y_train, X_val, y_val, xgb_params=xgb_params)
    
    # Step 7: Evaluate on test set
    print("\n🔍 Evaluating on test set...")
    results = detector.evaluate(X_test, y_test)
    
    # Step 8: Test on sample URLs
    print("\n" + "="*60)
    print("TESTING ON SAMPLE URLs")
    print("="*60)
    
    sample_urls = [
        'https://www.google.com',
        'https://www.paypal.com',
        'http://paypal-security-check.tk/login.php',
        'https://secure-login-verify.ru/account',
        'https://www.github.com',
        'http://bit.ly/3x4mp1e',
    ]
    
    predictions = detector.predict(sample_urls)
    probabilities = detector.predict_proba(sample_urls)
    
    for url, pred, prob in zip(sample_urls, predictions, probabilities):
        label = "🚨 PHISHING" if pred == 1 else "✅ LEGITIMATE"
        confidence = prob[pred] * 100
        print(f"\nURL: {url}")
        print(f"Prediction: {label}")
        print(f"Confidence: {confidence:.2f}%")
    
    # Step 9: Save model
    print("\n💾 Saving model...")
    detector.save_model('phishing_detector_phiusiil.pkl')
    
    print("\n" + "="*60)
    print("✓ TRAINING COMPLETE!")
    print("="*60)
    print(f"\nModel Accuracy: {results['accuracy']*100:.2f}%")
    print(f"F1-Score: {results['f1_score']:.4f}")
    print(f"ROC-AUC: {results['roc_auc']:.4f}")