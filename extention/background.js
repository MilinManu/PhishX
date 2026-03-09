// background.js
// Service worker for PhishX Chrome extension

const API_URL = "http://localhost:5000/analyze";

// Listen for messages from content scripts / popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_URL") {
    const { url } = message;

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Backend error: ${res.status} ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        // Backend: status ("Safe"/"Phishing"), score(0-100), details, warnings …

        const rawScore =
          typeof data.score === "number" ? data.score : null; // 0–100

        // Map backend -> UI verdict
        let verdict = "unknown";

        if (data.status === "Phishing") {
          verdict = "phishing";
        } else if (data.status === "Safe") {
          if (rawScore !== null && rawScore < 70) {
            // Safe but low score -> treat as suspicious in UI
            verdict = "suspicious";
          } else {
            verdict = "safe";
          }
        }

        // Convert to 0–1 for UI
        let score = null;
        if (rawScore !== null) {
          score = rawScore / 100;
        }

        let reason = data.details || "";
        if (!reason && Array.isArray(data.warnings) && data.warnings.length) {
          reason = data.warnings.join("; ");
        }

        sendResponse({
          ok: true,
          data: {
            verdict,
            score,
            reason,
            raw: data
          }
        });
      })
      .catch((err) => {
        console.error("Error calling backend:", err);
        sendResponse({
          ok: false,
          error: err.message || "Unknown error"
        });
      });

    // Important: keep channel open for async response
    return true;
  }

  // For any other message types:
  return false;
});
