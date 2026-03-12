from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
import traceback
import pickle
import requests
import numpy as np
from urllib.parse import urlparse

API_URL = "https://router.huggingface.co/hf-inference/models/google-bert/bert-base-uncased"

headers = {
    "Authorization": f"Bearer {os.getenv('HF_TOKEN')}"
}

app = Flask(__name__)
CORS(app)  # Enable CORS for React Frontend

# --- 1. WHITELIST CONFIGURATION ---
# These sites are automatically marked as SAFE to prevent AI errors.
WHITELIST = [
    "google.com", "www.google.com", 
    "youtube.com", "www.youtube.com",
    "facebook.com", "www.facebook.com",
    "amazon.com", "www.amazon.com",
    "wikipedia.org", "www.wikipedia.org",
    "instagram.com", "www.instagram.com",
    "linkedin.com", "www.linkedin.com",
    "github.com", "www.github.com",
    "microsoft.com", "www.microsoft.com",
    "netflix.com", "www.netflix.com",
    "whatsapp.com", "www.whatsapp.com",
    "twitter.com", "www.twitter.com", "x.com", "www.x.com",
    "reddit.com", "www.reddit.com",
    "apple.com", "www.apple.com",
    "paypal.com", "www.paypal.com",
    # Indian popular sites
    "ixigo.com", "www.ixigo.com",
    "makemytrip.com", "www.makemytrip.com",
    "flipkart.com", "www.flipkart.com",
    "myntra.com", "www.myntra.com",
    "swiggy.com", "www.swiggy.com",
    "zomato.com", "www.zomato.com",
    "paytm.com", "www.paytm.com",
    "phonepe.com", "www.phonepe.com",
    "irctc.co.in", "www.irctc.co.in",
    # Indian State Transport Corporations
    "keralartc.com", "www.keralartc.com",
    "ksrtc.in", "www.ksrtc.in",
    "msrtc.gov.in", "www.msrtc.gov.in",
    "tsrtc.in", "www.tsrtc.in",
    "apsrtc.in", "www.apsrtc.in",
]

# --- TRUSTED TLDs (Government, Education, Official) ---
TRUSTED_TLDS = [
    '.gov', '.gov.in', '.gov.uk', '.gov.au', '.gov.ca',  # Government
    '.nic.in',  # Indian National Informatics Centre (government sites)
    '.edu', '.edu.in', '.ac.uk', '.edu.au', '.ac.in',  # Education
    '.mil',  # Military
    '.int',  # International organizations
]

# --- KNOWN BRAND DOMAINS (for typosquatting detection) ---
BRAND_DOMAINS = {
    'paypal': 'paypal.com',
    'google': 'google.com',
    'amazon': 'amazon.com',
    'microsoft': 'microsoft.com',
    'apple': 'apple.com',
    'facebook': 'facebook.com',
    'netflix': 'netflix.com',
    'instagram': 'instagram.com',
    'linkedin': 'linkedin.com',
    'twitter': 'twitter.com',
    'github': 'github.com'
}

# --- KNOWN PHISHING DOMAINS (update this list regularly) ---
KNOWN_PHISHING_PATTERNS = [
    'coincoele.com',
    'pay-pal',
    'paypa-l',  # Added
    'paypa1',
    'g00gle',
    'go-ogle',
    'amaz0n',
    'micros0ft',
    'app1e',
    'netf1ix',
    'faceb00k',
    '824555.com',
    'goog1e',
    'googIe',
]

# --- 2. LOAD AI MODELS ---
print("⏳ Loading AI Models... Please wait.")
try:
    # Load XGBoost model (trained with PhiUSIIL dataset)
    with open('phishing_detector_phiusiil.pkl', 'rb') as f:
        xgb_model = pickle.load(f)
    print("✅ XGBoost Model Loaded from phishing_detector_phiusiil.pkl")

    # Load BERT tokenizer and model
    tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
    bert_model = BertModel.from_pretrained('bert-base-uncased')
    bert_model.eval()  # Set to evaluation mode
    
    # Use GPU if available
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    bert_model.to(device)
    print(f"✅ BERT Model Loaded (using {device})")

except FileNotFoundError:
    print("❌ CRITICAL ERROR: Could not find 'phishing_detector_phiusiil.pkl'")
    print("Make sure you have run the training script first!")
    xgb_model = None
    bert_model = None
    tokenizer = None
    device = None
except Exception as e:
    print(f"❌ CRITICAL ERROR: Could not load models. {str(e)}")
    print(traceback.format_exc())
    xgb_model = None
    bert_model = None
    tokenizer = None
    device = None

# --- 3. HELPER FUNCTIONS ---

def is_whitelisted(url):
    """Checks if the domain is in our trusted list - EXACT MATCH OR VALID SUBDOMAIN."""
    try:
        # Extract domain (e.g., https://google.com/maps -> google.com)
        parsed_uri = urlparse(url)
        domain = parsed_uri.netloc
        if not domain: 
            # Handle cases like "google.com" without http://
            domain = url.split('/')[0]
        
        # Remove 'www.' for cleaner check
        clean_domain = domain.replace('www.', '').lower()
        
        # EXACT match check
        for safe_site in WHITELIST:
            safe_site_clean = safe_site.replace('www.', '').lower()
            if clean_domain == safe_site_clean:
                return True
        
        # Check for valid subdomains of whitelisted sites
        # e.g., classroom.google.com, mail.google.com should be safe
        for safe_site in WHITELIST:
            safe_site_clean = safe_site.replace('www.', '').lower()
            # Check if it ends with .safe_site (e.g., ends with .google.com)
            if clean_domain.endswith('.' + safe_site_clean):
                # Make sure it's a real subdomain, not typosquatting
                # e.g., "evil.google.com" is OK, but "google.com.evil.com" is NOT
                parts = clean_domain.split('.')
                safe_parts = safe_site_clean.split('.')
                
                # Domain should end with the safe site's parts
                if len(parts) > len(safe_parts):
                    # Check if the last parts match exactly
                    if parts[-len(safe_parts):] == safe_parts:
                        return True
        
        # Check for trusted TLDs (government, education, etc.)
        for tld in TRUSTED_TLDS:
            if clean_domain.endswith(tld):
                return True
        
        return False
    except:
        return False

def detect_typosquatting(url):
    """Detect typosquatting attempts (e.g., pay-pal.com instead of paypal.com)"""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or url.split('/')[0]
        domain = domain.replace('www.', '').lower()
        
        # First, check if this is a legitimate subdomain of a whitelisted site
        for safe_site in WHITELIST:
            safe_site_clean = safe_site.replace('www.', '').lower()
            # Check if it's a valid subdomain (e.g., classroom.google.com)
            if domain.endswith('.' + safe_site_clean):
                parts = domain.split('.')
                safe_parts = safe_site_clean.split('.')
                # Verify it's a real subdomain structure
                if len(parts) > len(safe_parts) and parts[-len(safe_parts):] == safe_parts:
                    return False, None  # It's legitimate, not typosquatting
        
        # Check against known phishing patterns
        for pattern in KNOWN_PHISHING_PATTERNS:
            if pattern in domain:
                return True, f"Domain matches known phishing pattern: {pattern}"
        
        # Check for suspicious patterns in domain
        for brand, real_domain in BRAND_DOMAINS.items():
            real_domain_base = real_domain.split('.')[0]  # e.g., 'google' from 'google.com'
            
            # Remove common TLDs to get the core domain
            domain_base = domain.replace('.com', '').replace('.net', '').replace('.org', '').replace('.co.uk', '').replace('.in', '')
            
            # Skip if this is a legitimate subdomain
            if domain.endswith('.' + real_domain):
                continue
            
            # Check if domain contains the brand name with modifications
            if brand in domain_base or real_domain_base in domain_base:
                # Don't flag if it's the exact legitimate domain
                if domain == real_domain or domain == 'www.' + real_domain:
                    continue
                
                # Calculate similarity - if very close but not exact, it's typosquatting
                # Common typosquatting patterns:
                suspicious_patterns = [
                    '-' in domain_base,  # pay-pal.com, go-ogle.com, paypa-l.com
                    brand.replace('a', '4') in domain_base,  # p4ypal.com
                    brand.replace('o', '0') in domain_base,  # g00gle.com, micros0ft.com
                    brand.replace('l', '1') in domain_base,  # paypa1.com, goog1e.com
                    brand.replace('i', '1') in domain_base,  # m1crosoft.com
                    brand.replace('e', '3') in domain_base,  # n3tflix.com, googl3.com
                    real_domain_base.replace('o', '0') in domain_base,  # g00gle
                    real_domain_base.replace('l', '1') in domain_base,  # goog1e
                ]
                
                # Check for character substitutions and additions
                if any(suspicious_patterns):
                    return True, f"Possible typosquatting of {real_domain}"
                
                # NEW: Check for brands with hyphen in middle (paypa-l, pay-pal, etc.)
                # Remove hyphen from domain and check similarity
                domain_no_hyphen = domain_base.replace('-', '')
                
                # Check if removing hyphen makes it very similar to brand
                if '-' in domain_base and len(domain_no_hyphen) >= len(brand):
                    # Count matching characters
                    matches = sum(1 for a, b in zip(domain_no_hyphen[:len(brand)], brand) if a == b)
                    similarity = matches / len(brand)
                    
                    # If > 80% similar with hyphen inserted, it's typosquatting
                    if similarity > 0.8:
                        return True, f"Possible typosquatting of {real_domain} (hyphen insertion)"
                
                # Check if domain is brand + extra characters (goggle, gooogle, etc.)
                if domain_base != real_domain_base and (
                    len(domain_base) - len(real_domain_base) <= 3 and 
                    brand in domain_base
                ):
                    return True, f"Possible typosquatting of {real_domain} (character manipulation)"
        
        return False, None
    except:
        return False, None

def unshorten_url(url):
    """Follows redirects (bit.ly, tinyurl) to find the real URL."""
    try:
        if not url.startswith('http'):
            url = 'http://' + url
        
        # Follow redirects with a timeout
        response = requests.head(url, allow_redirects=True, timeout=3)
        return response.url
    except:
        return url

def get_bert_embedding(text):

    payload = {
        "inputs": text
    }

    response = requests.post(
        API_URL,
        headers=headers,
        json=payload
    )

    result = response.json()

    return result

def extract_url_features(url):
    """Extract additional URL-based features for better detection."""
    features = {}
    
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or url.split('/')[0]
        
        # URL length features
        features['url_length'] = len(url)
        features['domain_length'] = len(domain)
        
        # Check if it's a trusted TLD (government, education)
        features['is_trusted_tld'] = any(domain.lower().endswith(tld) for tld in TRUSTED_TLDS)
        
        # Suspicious characters
        features['has_ip'] = any(c.isdigit() for c in domain.replace('.', ''))
        features['num_dots'] = url.count('.')
        features['num_hyphens'] = url.count('-')
        features['num_underscores'] = url.count('_')
        features['num_slashes'] = url.count('/')
        features['num_at'] = url.count('@')
        
        # Protocol check
        features['has_https'] = url.startswith('https://')
        
        # Suspicious TLDs
        suspicious_tlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.ru', '.xyz', '.top', '.club', '.work', '.pw', '.cc']
        features['suspicious_tld'] = any(url.lower().endswith(tld) for tld in suspicious_tlds)
        
        # Check for misleading patterns
        features['has_hyphen_in_domain'] = '-' in domain and not domain.startswith('www.')
        features['excessive_subdomains'] = domain.count('.') > 3
        
        # Suspicious keywords in path
        suspicious_keywords = ['login', 'verify', 'account', 'secure', 'update', 'confirm', 'signin', 'member', 'admin', 'user']
        features['suspicious_keywords'] = any(keyword in url.lower() for keyword in suspicious_keywords)
        
        # Check if domain is purely numeric or mostly numeric
        domain_without_tld = domain.split('.')[0] if '.' in domain else domain
        features['numeric_domain'] = domain_without_tld.replace('-', '').replace('_', '').isdigit()
        features['mostly_numeric_domain'] = sum(c.isdigit() for c in domain_without_tld) > len(domain_without_tld) * 0.7
        
        # Check for IP address instead of domain
        try:
            parts = domain.split('.')
            if len(parts) == 4 and all(part.isdigit() and 0 <= int(part) <= 255 for part in parts):
                features['is_ip_address'] = True
            else:
                features['is_ip_address'] = False
        except:
            features['is_ip_address'] = False
        
    except:
        # Return default features on error
        features = {k: 0 for k in features.keys()}
    
    return features

def calculate_phishing_risk_score(url_features, url):
    """Calculate risk score based on URL features (0-100, higher = more risky)"""
    risk_score = 0
    
    # TRUSTED TLDs get negative risk (safety bonus)
    if url_features.get('is_trusted_tld'):
        return 0  # Government/education sites are trusted - return immediately with 0 risk
    
    # Check if this is a legitimate subdomain of a trusted site
    parsed = urlparse(url)
    domain = (parsed.netloc or url.split('/')[0]).replace('www.', '').lower()
    
    for safe_site in WHITELIST:
        safe_site_clean = safe_site.replace('www.', '').lower()
        # If it's a valid subdomain of a whitelisted site, return 0 risk
        if domain.endswith('.' + safe_site_clean):
            parts = domain.split('.')
            safe_parts = safe_site_clean.split('.')
            if len(parts) > len(safe_parts) and parts[-len(safe_parts):] == safe_parts:
                return 0  # Legitimate subdomain - no risk
    
    # CRITICAL RED FLAGS (very high scores)
    if url_features.get('numeric_domain') or url_features.get('is_ip_address'):
        risk_score += 50  # Numeric domains or IP addresses are extremely suspicious
    if url_features.get('mostly_numeric_domain'):
        risk_score += 35
    
    # High priority flags
    if url_features.get('suspicious_tld'):
        risk_score += 30
    
    # HYPHEN IN DOMAIN - Very suspicious for brand impersonation
    if url_features.get('has_hyphen_in_domain'):
        # Extract domain to check if it looks like a brand
        domain_for_check = domain
        
        # If domain contains hyphen and looks like it's trying to mimic a brand, high score
        common_brands = ['google', 'paypal', 'amazon', 'microsoft', 'apple', 'facebook', 
                        'netflix', 'instagram', 'twitter', 'linkedin', 'github', 'yahoo']
        
        # Remove hyphens and check if it matches a brand (go-ogle -> googIe)
        domain_no_hyphen = domain_for_check.replace('-', '')
        for brand in common_brands:
            if brand in domain_no_hyphen or domain_no_hyphen.startswith(brand[:4]):
                risk_score += 40  # Very high score for brand + hyphen
                break
        else:
            risk_score += 25  # Regular hyphen penalty
    
    if not url_features.get('has_https'):
        risk_score += 20
    if url_features.get('num_at') > 0:
        risk_score += 20
    if url_features.get('url_length', 0) > 100:
        risk_score += 15
    if url_features.get('excessive_subdomains'):
        risk_score += 20
    if url_features.get('suspicious_keywords') and url_features.get('has_hyphen_in_domain'):
        risk_score += 25
    
    # Additional checks for obfuscated/suspicious paths
    url_lower = url.lower()
    
    # Suspicious path patterns
    suspicious_paths = [
        '/scripts/', '/cgi-bin/', '/temp/', '/tmp/', 
        '?redirect=', '?url=', '?continue=', '?next=',
        '/smiles/', '/default.aspx', '/paginas/',
        '/member/', '/admin/', '/user/', '/app/'
    ]
    if any(pattern in url_lower for pattern in suspicious_paths):
        risk_score += 15
    
    # Suspicious query parameters (common in phishing)
    suspicious_params = ['uid=', 'user=', 'id=', 'login=', 'pass=', 'password=', 'token=']
    if any(param in url_lower for param in suspicious_params):
        risk_score += 20
    
    # Multiple query parameters with redirect patterns
    if ('?' in url and url.count('/') > 5):
        risk_score += 15
    
    # Check for weird combinations of language codes and paths
    if ('/pt-br/' in url_lower or '/en-us/' in url_lower) and '/scripts/' in url_lower:
        risk_score += 20
    
    # Suspicious file extensions in path
    if any(ext in url_lower for ext in ['.aspx?', '.php?', '.jsp?']):
        risk_score += 15
    
    # Check for "guest" or "test" in parameters (common in malware sites)
    if 'guest' in url_lower or 'test' in url_lower:
        risk_score += 15
    
    return min(risk_score, 100)

# --- 4. API ROUTES ---

@app.route('/analyze', methods=['POST'])
def analyze():
    """Main endpoint for URL analysis"""
    if not xgb_model or not bert_model or not tokenizer:
        return jsonify({
            'error': 'AI models are not loaded. Check server logs.',
            'details': 'Make sure phishing_detector_phiusiil.pkl exists in the current directory.'
        }), 500
        
    try:
        data = request.get_json()
        raw_url = data.get('url', '').strip()

        if not raw_url:
            return jsonify({'error': 'URL is empty'}), 400

        # STEP 1: Check Whitelist (Fast & Accurate) - EXACT MATCH ONLY
        if is_whitelisted(raw_url):
            return jsonify({
                'status': 'Safe', 
                'score': 100.0, 
                'url': raw_url,
                'method': 'Verified Whitelist',
                'confidence': 'Very High',
                'details': 'This domain is on our trusted whitelist.'
            })
        
        # STEP 1.5: Check for typosquatting BEFORE unshortening
        is_typosquat, typosquat_msg = detect_typosquatting(raw_url)
        if is_typosquat:
            return jsonify({
                'status': 'Phishing',
                'score': 95.0,
                'url': raw_url,
                'method': 'Typosquatting Detection',
                'confidence': 'Very High',
                'details': f'⚠️ {typosquat_msg}. This appears to be impersonating a legitimate brand.',
                'warnings': ['Domain impersonation detected', 'Typosquatting attempt']
            })
            
        # STEP 2: Unshorten URL (Security Check)
        final_url = unshorten_url(raw_url)
        
        # STEP 3: Check if unshortened URL is whitelisted
        if final_url != raw_url and is_whitelisted(final_url):
            return jsonify({
                'status': 'Safe', 
                'score': 100.0, 
                'url': final_url,
                'original_url': raw_url,
                'method': 'Verified Whitelist (After Unshortening)',
                'confidence': 'Very High',
                'details': 'Shortened URL redirects to a trusted domain.'
            })
        
        # STEP 4: AI Analysis (BERT + XGBoost)
        print(f"🔍 Analyzing: {final_url}")
        
        # Extract URL features first
        url_features = extract_url_features(final_url)
        risk_score = calculate_phishing_risk_score(url_features, final_url)
        
        # If risk score is very high from features alone, flag as phishing
        if risk_score >= 50:  # Lowered from 60 to catch more threats
            print(f"⚠️ High risk score from URL features: {risk_score}")
            return jsonify({
                'status': 'Phishing',
                'score': float(risk_score),
                'confidence': 'Very High' if risk_score >= 70 else 'High',
                'url': final_url,
                'original_url': raw_url if final_url != raw_url else None,
                'method': 'URL Pattern Analysis + AI',
                'details': '⚠️ This URL exhibits multiple suspicious characteristics indicating a phishing/malware attempt.',
                'warnings': [
                    w for w in [
                        '🚨 NUMERIC DOMAIN - Extremely suspicious!' if url_features.get('numeric_domain') else None,
                        '🚨 IP ADDRESS instead of domain name' if url_features.get('is_ip_address') else None,
                        'Mostly numeric domain name' if url_features.get('mostly_numeric_domain') else None,
                        'Suspicious top-level domain' if url_features.get('suspicious_tld') else None,
                        'Hyphen in domain name (possible impersonation)' if url_features.get('has_hyphen_in_domain') else None,
                        '🔓 No HTTPS encryption - INSECURE!' if not url_features.get('has_https') else None,
                        'Contains @ symbol' if url_features.get('num_at') > 0 else None,
                        'Unusually long URL' if url_features.get('url_length', 0) > 100 else None,
                        'Excessive subdomains' if url_features.get('excessive_subdomains') else None,
                        'Suspicious path structure detected' if '/scripts/' in final_url.lower() or '/member/' in final_url.lower() else None,
                        'Complex redirect patterns' if '?' in final_url and final_url.count('/') > 5 else None,
                        'Contains suspicious query parameters (uid, login, etc.)' if any(p in final_url.lower() for p in ['uid=', 'login=', 'pass=']) else None
                    ] if w
                ]
            })
        
        # Get BERT embedding
        embedding_vector = get_bert_embedding(final_url)
        
        # Get predictions
        probabilities = xgb_model.predict_proba(embedding_vector)[0]
        prediction = xgb_model.predict(embedding_vector)[0]

        # Map Prediction to Result
        # 0 = Legitimate, 1 = Phishing
        is_phishing = prediction == 1
        
        # Combine AI prediction with risk score
        ai_confidence = float(probabilities[1 if is_phishing else 0] * 100)
        
        # Trust AI more for borderline cases with legitimate characteristics
        has_https = final_url.startswith('https://')
        parsed = urlparse(final_url)
        domain = (parsed.netloc or final_url.split('/')[0]).replace('www.', '').lower()
        
        # Check if domain looks legitimate (not numeric, not IP, has proper structure)
        looks_legitimate = (
            not url_features.get('numeric_domain') and
            not url_features.get('is_ip_address') and
            not url_features.get('suspicious_tld') and
            has_https and
            not url_features.get('has_hyphen_in_domain')
        )
        
        # If AI says safe but risk score is moderate-high, override
        if not is_phishing and risk_score >= 30:
            # But if domain looks legitimate and AI is confident, trust the AI
            if looks_legitimate and ai_confidence > 70:
                # Trust the AI for legitimate-looking domains
                is_phishing = False
                final_score = ai_confidence
                method = 'BERT + XGBoost AI (High Confidence)'
            else:
                # Override to phishing if significant risk factors present
                is_phishing = True
                final_score = max(ai_confidence, risk_score, 70)
                method = 'URL Pattern Analysis (AI Override)'
                print(f"⚠️ Overriding AI prediction - Risk Score: {risk_score}, AI Confidence: {ai_confidence}")
        elif is_phishing and risk_score >= 50:
            # Boost confidence if both AI and patterns agree
            final_score = min(95, (ai_confidence + risk_score) / 2 + 10)
            method = 'Combined Analysis (High Confidence)'
        else:
            final_score = ai_confidence
            method = 'BERT + XGBoost AI (PhiUSIIL Dataset)'
        
        if is_phishing:
            status = 'Phishing'
            score = final_score
            confidence = 'Very High' if score > 95 else 'High' if score > 85 else 'Medium'
            details = '⚠️ This URL shows strong indicators of phishing. Proceed with extreme caution!'
        else:
            status = 'Safe'
            score = final_score
            confidence = 'Very High' if score > 95 else 'High' if score > 85 else 'Medium'
            details = '✅ This URL appears to be legitimate based on our analysis.'
        
        # Add warnings based on URL features
        warnings = []
        if url_features.get('numeric_domain') or url_features.get('is_ip_address'):
            warnings.append('🚨 CRITICAL: Numeric domain or IP address - highly suspicious!')
        if url_features.get('suspicious_tld'):
            warnings.append('Suspicious top-level domain detected')
        if url_features.get('has_hyphen_in_domain'):
            warnings.append('Hyphen in domain name (possible brand impersonation)')
        if not url_features.get('has_https'):
            warnings.append('🔓 No HTTPS encryption - connection is insecure!')
        if url_features.get('num_at') > 0:
            warnings.append('Contains @ symbol (potential obfuscation)')
        if url_features.get('url_length') > 100:
            warnings.append('Unusually long URL')
        if url_features.get('excessive_subdomains'):
            warnings.append('Excessive subdomains detected')
        if '/member/' in final_url.lower() or '/admin/' in final_url.lower():
            warnings.append('Suspicious admin/member path detected')
        if any(p in final_url.lower() for p in ['uid=', 'user=', 'login=']):
            warnings.append('Contains suspicious authentication parameters')

        response_data = {
            'status': status,
            'score': round(score, 2),
            'confidence': confidence,
            'url': final_url,
            'method': method,
            'details': details,
            'model_accuracy': '98.27%'
        }
        
        # Add original URL if different
        if final_url != raw_url:
            response_data['original_url'] = raw_url
            response_data['note'] = 'URL was unshortened for analysis'
        
        # Add warnings if any
        if warnings:
            response_data['warnings'] = warnings

        print(f"✅ Result: {status} (Score: {score:.2f}%)")
        return jsonify(response_data)

    except Exception as e:
        print("❌ Error during analysis:")
        print(traceback.format_exc()) 
        return jsonify({
            'error': f'Analysis failed: {str(e)}',
            'details': 'Please check if the URL format is valid and try again.'
        }), 500

@app.route('/batch-analyze', methods=['POST'])
def batch_analyze():
    """Endpoint for analyzing multiple URLs at once"""
    if not xgb_model or not bert_model or not tokenizer:
        return jsonify({'error': 'AI models are not loaded'}), 500
    
    try:
        data = request.get_json()
        urls = data.get('urls', [])
        
        if not urls or not isinstance(urls, list):
            return jsonify({'error': 'Please provide a list of URLs'}), 400
        
        if len(urls) > 50:
            return jsonify({'error': 'Maximum 50 URLs per batch request'}), 400
        
        results = []
        for url in urls:
            url = url.strip()
            if not url:
                continue
                
            try:
                # Quick whitelist check
                if is_whitelisted(url):
                    results.append({
                        'url': url,
                        'status': 'Safe',
                        'score': 100.0,
                        'method': 'Whitelist'
                    })
                    continue
                
                # AI analysis
                final_url = unshorten_url(url)
                embedding = get_bert_embedding(final_url)
                probabilities = xgb_model.predict_proba(embedding)[0]
                prediction = xgb_model.predict(embedding)[0]
                
                is_phishing = prediction == 1
                status = 'Phishing' if is_phishing else 'Safe'
                score = float(probabilities[1 if is_phishing else 0] * 100)
                
                results.append({
                    'url': url,
                    'status': status,
                    'score': round(score, 2)
                })
            except Exception as e:
                results.append({
                    'url': url,
                    'status': 'Error',
                    'error': str(e)
                })
        
        return jsonify({'results': results, 'total': len(results)})
        
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': f'Batch analysis failed: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    models_loaded = all([xgb_model, bert_model, tokenizer])
    
    return jsonify({
        'status': 'healthy' if models_loaded else 'unhealthy',
        'models_loaded': models_loaded,
        'model_accuracy': '98.27%' if models_loaded else 'N/A',
        'dataset': 'PhiUSIIL (235K URLs)',
        'device': str(device) if device else 'N/A'
    })

@app.route('/', methods=['GET'])
def home():
    """API documentation endpoint"""
    return jsonify({
        'name': 'PhishX Phishing Detection API',
        'version': '2.0',
        'model': 'BERT + XGBoost',
        'dataset': 'PhiUSIIL Dataset (235K URLs)',
        'accuracy': '98.27%',
        'endpoints': {
            '/analyze': {
                'method': 'POST',
                'description': 'Analyze a single URL',
                'body': {'url': 'string'}
            },
            '/batch-analyze': {
                'method': 'POST',
                'description': 'Analyze multiple URLs (max 50)',
                'body': {'urls': ['string', 'string']}
            },
            '/health': {
                'method': 'GET',
                'description': 'Check API health status'
            }
        }
    })

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 PhishX Backend Server")
    print("="*60)
    if xgb_model and bert_model:
        print("✅ All models loaded successfully!")
        print(f"✅ Model Accuracy: 98.27%")
        print(f"✅ Using device: {device}")
    else:
        print("❌ Models failed to load - check error messages above")
    print("="*60)
    
    import os
    port = int(os.environ.get("PORT", 5000))

    print(f"🌐 Server running on port {port}")
    print("="*60 + "\n")

    app.run(host="0.0.0.0", port=port)