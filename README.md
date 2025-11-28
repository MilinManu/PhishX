# 🛡️ PhishX - AI-Powered Phishing Website Detector

![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![React](https://img.shields.io/badge/Frontend-React-61DAFB)
![Flask](https://img.shields.io/badge/Backend-Flask-green)
![ML](https://img.shields.io/badge/AI-BERT%20%2B%20XGBoost-orange)

## 📌 Project Overview
**PhishX** is a next-generation Phishing Website Detector designed to identify malicious URLs with high precision. Unlike traditional systems that rely on static blacklists, PhishX utilizes a **Hybrid AI Architecture**.

It combines **Deep Learning (BERT)** to understand the *semantic context* of a URL and **XGBoost** for high-speed, accurate classification. The system features a modern **React Frontend** for user interaction and a robust **Flask Backend** that serves the AI engine.

---

## 🚀 Key Features
* **Hybrid Intelligence:** Combines **DistilBERT** (for natural language understanding of URLs) and **XGBoost** (for robust classification).
* **Smart Unshortening:** Automatically resolves shortened links (e.g., `bit.ly`, `tinyurl`) to detect hidden threats.
* **Real-time Analysis:** Optimized for low-latency inference.
* **Whitelist System:** Instant verification for known safe domains (Google, Facebook) to save compute resources.

---

## 🧠 How PhishX Works
The system follows a 3-stage pipeline to analyze every URL:



1.  **URL Resolution:** Checks if the URL is shortened and follows redirects to the final destination.
2.  **Feature Extraction (BERT):** The URL is fed into a pre-trained **DistilBERT** model to generate a 768-dimensional embedding vector.
3.  **Classification (XGBoost):** This vector is passed to the **XGBoost** classifier to predict `Safe` or `Phishing`.

---

## ⚙️ Installation & Setup

Follow these steps to set up PhishX locally.

### Step 1: Clone the Repository
```bash
git clone [https://github.com/MilinManu/PhishX.git](https://github.com/MilinManu/PhishX.git)
cd phishing-website-detector
```

### Step 2: Backend Setup (Python)
You need to set up the Python environment inside the `backend` folder.

```bash
# 1. Navigate to the backend folder
cd backend

# 2. Create a virtual environment
python -m venv venv

# 3. Activate the environment
# For Windows:
venv\Scripts\activate
# For Mac/Linux:
source venv/bin/activate

# 4. Install Python dependencies
pip install -r requirements.txt
```
> **Note:** This installs large libraries like PyTorch and Transformers. Please ensure a stable internet connection.

### Step 3: Frontend Setup (React)
You need to install the Node modules in the **main directory** (root).

```bash
# 1. Open a NEW terminal (or go back to the root folder)
cd ..

# 2. Install dependencies
npm install
```

---

## ▶️ Running PhishX
This project requires running the Backend and Frontend simultaneously. Open **two separate terminal windows**.

### Terminal 1: Start Backend API
```bash
cd backend
# Ensure venv is activated (you should see (venv) in your terminal)
python app.py
```
*The Flask server will start at `http://127.0.0.1:5000`*

> **Troubleshooting:** If the app crashes immediately, ensure the trained model file (`phishing_xgboost.model`) is present inside the `backend/` folder.

### Terminal 2: Start Frontend UI
```bash
# Run this from the main project directory
npm run dev
```
*The React app should now be running (usually at `http://localhost:5173` or `http://localhost:3000`).*

---

## 🔌 API Usage
If you want to use the PhishX engine without the React frontend, you can send POST requests directly.

**Endpoint:** `POST /analyze`

**Request Body:**
```json
{
    "url": "[http://secure-login-apple-id.com.update.xyz](http://secure-login-apple-id.com.update.xyz)"
}
```

**Response:**
```json
{
    "status": "Phishing",
    "score": 98.45,
    "url": "[http://secure-login-apple-id.com.update.xyz](http://secure-login-apple-id.com.update.xyz)",
    "method": "BERT+XGBoost"
}
```

---

## 👤 Author
**Milin**
*Pre-Final Year CSE Student*
[GitHub Profile](https://github.com/YOUR_USERNAME)
