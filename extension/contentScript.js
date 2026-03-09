// contentScript.js – PHISHX branded banner

(function () {
  if (window.top !== window.self) return;
  injectPhishXStyles();
  checkCurrentPage();
})();

function injectPhishXStyles() {
  if (document.getElementById("phishx-banner-style")) return;

  const style = document.createElement("style");
  style.id = "phishx-banner-style";
  style.textContent = `
    @keyframes phishx-slide-in {
      from { 
        transform: translateX(30px); 
        opacity: 0; 
      }
      to { 
        transform: translateX(0); 
        opacity: 1; 
      }
    }
    
    @keyframes phishx-glow {
      0%, 100% { box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55); }
      50% { box-shadow: 0 18px 45px rgba(59, 130, 246, 0.3); }
    }

    #phishx-banner {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      padding: 16px 20px;
      border-radius: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.6);
      color: #f9fafb;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      max-width: 380px;
      cursor: pointer;
      animation: phishx-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
    }
    
    #phishx-banner:hover {
      transform: translateY(-2px);
    }

    .phishx-banner-safe {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95));
      border-color: rgba(34, 197, 94, 0.3);
    }
    
    .phishx-banner-phishing {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95));
      border-color: rgba(239, 68, 68, 0.3);
      animation: phishx-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1), phishx-glow 2s ease-in-out infinite;
    }
    
    .phishx-banner-suspicious {
      background: linear-gradient(135deg, rgba(249, 115, 22, 0.95), rgba(234, 88, 12, 0.95));
      border-color: rgba(249, 115, 22, 0.3);
    }
    
    .phishx-banner-unknown {
      background: linear-gradient(135deg, rgba(31, 41, 55, 0.95), rgba(17, 24, 39, 0.95));
      border-color: rgba(59, 130, 246, 0.2);
    }

    .phishx-banner-icon {
      font-size: 24px;
      margin-top: 2px;
      filter: drop-shadow(0 0 8px currentColor);
    }
    
    .phishx-banner-main {
      flex: 1;
    }
    
    .phishx-banner-title {
      font-weight: 700;
      font-size: 15px;
      margin-bottom: 4px;
      letter-spacing: 0.02em;
    }
    
    .phishx-banner-sub {
      opacity: 0.9;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .phishx-banner-close {
      margin-left: 8px;
      font-size: 18px;
      opacity: 0.7;
      transition: opacity 0.2s ease;
      padding: 4px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.2);
    }
    
    .phishx-banner-close:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.3);
    }
    
    .phishx-banner-branding {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 11px;
      opacity: 0.8;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    
    .phishx-banner-logo {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
    }
  `;
  document.documentElement.appendChild(style);
}

function checkCurrentPage() {
  const url = window.location.href;

  chrome.runtime.sendMessage({ type: "CHECK_URL", url }, (response) => {
    if (chrome.runtime.lastError) {
      showBanner({
        verdict: "unknown",
        score: null,
        reason: "Could not contact PHISHX backend."
      });
      return;
    }

    if (!response) {
      showBanner({
        verdict: "unknown",
        score: null,
        reason: "No response from background script."
      });
      return;
    }

    if (!response.ok) {
      showBanner({
        verdict: "unknown",
        score: null,
        reason: "Error: " + response.error
      });
      return;
    }

    const { verdict, score, reason } = response.data;
    showBanner({ verdict, score, reason });
  });
}

function showBanner({ verdict, score, reason }) {
  const existing = document.getElementById("phishx-banner");
  if (existing) existing.remove();

  let variantClass = "phishx-banner-unknown";
  let icon = "❔";
  let title = "Unknown Website";

  if (verdict === "safe") {
    variantClass = "phishx-banner-safe";
    icon = "✅";
    title = "Safe Website";
  } else if (verdict === "phishing") {
    variantClass = "phishx-banner-phishing";
    icon = "🚨";
    title = "Phishing Website Detected!";
  } else if (verdict === "suspicious") {
    variantClass = "phishx-banner-suspicious";
    icon = "⚠️";
    title = "Suspicious Website";
  }

  const banner = document.createElement("div");
  banner.id = "phishx-banner";
  banner.className = variantClass;

  const scoreText =
    typeof score === "number" ? `Threat Score: ${(score * 100).toFixed(1)}%` : "";

  const reasonText =
    reason && reason.length > 140 ? reason.slice(0, 137) + "…" : reason || "";

  banner.innerHTML = `
    <div class="phishx-banner-icon">${icon}</div>
    <div class="phishx-banner-main">
      <div class="phishx-banner-title">${title}</div>
      <div class="phishx-banner-sub">
        ${scoreText ? scoreText + "<br>" : ""}
        ${reasonText}
      </div>
      <div class="phishx-banner-branding">
        <div class="phishx-banner-logo">🛡</div>
        <span>PROTECTED BY PHISHX</span>
      </div>
    </div>
    <div class="phishx-banner-close">✕</div>
  `;

  banner.addEventListener("click", () => {
    banner.style.animation = "phishx-slide-in 0.2s ease reverse";
    setTimeout(() => banner.remove(), 200);
  });

  document.body.appendChild(banner);
}