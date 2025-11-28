import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Link, Search, History, Loader2, ServerCrash } from 'lucide-react';

// Main App Component
export default function App() {
  // === STATE ===
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null); // { status: 'Safe' | 'Phishing', score: number, url: string }
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeUrl = async (urlToAnalyze) => {
  try {
    // This URL points to your running Flask server
    // const response = await fetch('https://phishing-website-backend-5sjv.onrender.com/analyze', {
    const response = await fetch('http://127.0.0.1:5000/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: urlToAnalyze }),
    });

    if (!response.ok) {
      // If server gives a 400 or 500 error
      const errorData = await response.json();
      return { error: errorData.error || 'Server returned an error.' };
    }

    // Get the JSON response { status, score, url } from Flask
    const data = await response.json(); 
    return data;

  } catch (err) {
    // This catches network errors (e.g., server is not running)
    console.error('Fetch error:', err);
    return { error: 'Could not connect to the analysis server. Is it running?' };
  }
};

  // === EVENT HANDLERS ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Simple URL validation
    if (!url.trim() || !url.includes('.')) {
      setError('Please enter a valid URL (e.g., example.com)');
      return;
    }

    // Add http:// if no protocol is present for a more realistic "check"
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }

    setIsLoading(true);

    const analysisResult = await analyzeUrl(fullUrl);

    if (analysisResult.error) {
      setError(analysisResult.error);
      setResult({ status: 'Error', score: 0, url: fullUrl });
    } else {
      setResult(analysisResult);
      // Add to history, ensuring no duplicates at the top
      setHistory((prevHistory) => [
        analysisResult,
        ...prevHistory.filter((item) => item.url !== analysisResult.url),
      ]);
    }

    setIsLoading(false);
    setUrl(''); // Clear input after submission
  };

  // === RENDER ===
  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-gray-100 dark:bg-gray-900 font-inter p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 lg:p-10 transition-all">
        
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Phishing Website Detector
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Enter a URL to check if it's safe or a phishing attempt.
          </p>
        </header>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Website URL
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Link className="h-5 w-5 text-gray-400" />
              </span>
              <input
                type="text"
                id="url-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="example.com"
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              <span className="ml-2.5">{isLoading ? 'Analyzing...' : 'Check URL'}</span>
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>

        {/* --- Results Section --- */}
        {isLoading && <LoadingIndicator />}
        {result && !isLoading && <ResultCard result={result} />}

        {/* --- History Section --- */}
        {history.length > 0 && <HistoryList history={history} />}
      </div>
    </div>
  );
}

// --- Sub-components ---

function LoadingIndicator() {
  return (
    <div className="text-center p-8 my-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
      <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-200">
        Analyzing URL...
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Our AI is checking for suspicious patterns.
      </p>
    </div>
  );
}

function ResultCard({ result }) {
  const { status, score, url } = result;

  const isPhishing = status === 'Phishing';
  const isSafe = status === 'Safe';
  const isError = status === 'Error';

  const bgColor = isSafe ? 'bg-green-100 dark:bg-green-900' : isPhishing ? 'bg-red-100 dark:bg-red-900' : 'bg-yellow-100 dark:bg-yellow-900';
  const borderColor = isSafe ? 'border-green-300 dark:border-green-700' : isPhishing ? 'border-red-300 dark:border-red-700' : 'border-yellow-300 dark:border-yellow-700';
  const textColor = isSafe ? 'text-green-800 dark:text-green-100' : isPhishing ? 'text-red-800 dark:text-red-100' : 'text-yellow-800 dark:text-yellow-100';
  const scoreColor = isSafe ? 'bg-green-500' : 'bg-red-500';
  const Icon = isSafe ? ShieldCheck : isPhishing ? ShieldAlert : ServerCrash;

  return (
    <div className={`my-6 p-6 rounded-lg border ${bgColor} ${borderColor} ${textColor} shadow-md`}>
      <div className="flex flex-col sm:flex-row items-center">
        <Icon className={`h-16 w-16 sm:h-20 sm:w-20 mr-0 sm:mr-6 mb-4 sm:mb-0 flex-shrink-0 ${isError ? 'text-yellow-600 dark:text-yellow-300' : ''}`} />
        <div className="flex-grow text-center sm:text-left">
          <h2 className={`text-2xl sm:text-3xl font-bold ${isError ? 'text-yellow-700 dark:text-yellow-200' : ''}`}>{status}</h2>
          <p className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-300 break-all mt-1 mb-3">
            {url}
          </p>
          
          {isError ? (
             <p className="text-base font-semibold text-yellow-700 dark:text-yellow-200">Analysis could not be completed.</p>
          ) : (
            <>
              {/* Probability Score Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 my-2">
                <div
                  className={`${scoreColor} h-2.5 rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${score}%` }}
                ></div>
              </div>
              <p className="text-sm font-semibold">
                {score}% {status === 'Safe' ? 'Probability of being Safe' : 'Probability of being Phishing'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryList({ history }) {
  return (
    <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
      <h3 className="flex items-center text-2xl font-semibold text-gray-800 dark:text-white mb-4">
        <History className="h-6 w-6 mr-3" />
        Analysis History
      </h3>
      <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
        {history.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 break-all truncate mr-4">
              {item.url}
            </span>
            <span
              className={`text-sm font-bold px-3 py-1 rounded-full text-xs ${
                item.status === 'Safe'
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                  : item.status === 'Phishing'
                  ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
              }`}
            >
              {item.status} ({item.score}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
