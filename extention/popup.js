// === STARFIELD ANIMATION ===
class Starfield {
  constructor() {
    this.canvas = document.getElementById('starfield');
    this.ctx = this.canvas.getContext('2d');
    this.stars = [];
    this.mouse = { x: 0, y: 0 };
    this.numStars = 150;
    
    this.init();
  }
  
  init() {
    this.resize();
    this.createStars();
    this.animate();
    
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }
  
  resize() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }
  
  createStars() {
    this.stars = [];
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        z: Math.random() * 4,
        baseX: Math.random() * this.canvas.width,
        baseY: Math.random() * this.canvas.height
      });
    }
  }
  
  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.stars.forEach(star => {
      // Calculate distance from mouse
      const dx = this.mouse.x - star.x;
      const dy = this.mouse.y - star.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Move star based on mouse proximity
      const maxDistance = 150;
      if (distance < maxDistance) {
        const force = (maxDistance - distance) / maxDistance;
        star.x -= dx * force * 0.03;
        star.y -= dy * force * 0.03;
      } else {
        // Slowly return to base position
        star.x += (star.baseX - star.x) * 0.01;
        star.y += (star.baseY - star.y) * 0.01;
      }
      
      // Keep stars in bounds
      if (star.x < 0) star.x = this.canvas.width;
      if (star.x > this.canvas.width) star.x = 0;
      if (star.y < 0) star.y = this.canvas.height;
      if (star.y > this.canvas.height) star.y = 0;
      
      // Draw star
      const size = star.z;
      const opacity = 0.3 + (star.z / 4) * 0.5;
      
      this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Add glow for larger stars
      if (star.z > 2) {
        this.ctx.fillStyle = `rgba(59, 130, 246, ${opacity * 0.3})`;
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, size + 1, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
    
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize starfield
const starfield = new Starfield();

// === MAIN EXTENSION LOGIC ===
const urlEl = document.getElementById("url");
const statusSummaryEl = document.getElementById("statusSummary");
const scoreRingEl = document.getElementById("scoreRing");
const detailsEl = document.getElementById("details");
const warningsEl = document.getElementById("warnings");
const checkBtn = document.getElementById("checkBtn");
const advancedToggle = document.getElementById("advancedToggle");
const advancedContent = document.getElementById("advancedContent");

let currentUrl = null;
let lastRawResponse = null;

// Get active tab when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  currentUrl = tab && tab.url ? tab.url : null;

  if (!currentUrl || !currentUrl.startsWith("http")) {
    urlEl.textContent = "Cannot scan this type of page.";
    renderStatus({
      verdict: "unknown",
      score: null,
      reason: "Only regular http/https pages are supported.",
      raw: null
    });
    checkBtn.disabled = true;
    return;
  }

  urlEl.textContent = currentUrl;
  runCheck();
});

checkBtn.addEventListener("click", () => {
  if (!currentUrl) return;
  runCheck();
});

advancedToggle.addEventListener("click", () => {
  if (!lastRawResponse) return;
  advancedContent.classList.toggle("open");
});

function runCheck() {
  checkBtn.disabled = true;
  detailsEl.innerHTML = '<span style="color: #3b82f6;">⟳ Analyzing URL with AI-powered engine...</span>';
  warningsEl.innerHTML = "";
  advancedContent.classList.remove("open");
  advancedContent.textContent = "";

  // Add loading animation to button
  checkBtn.innerHTML = `
    <span class="phx-btn-icon">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <polyline points="23 4 23 10 17 10"></polyline>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
      </svg>
    </span>
    <span>SCANNING</span>
  `;

  chrome.runtime.sendMessage(
    { type: "CHECK_URL", url: currentUrl },
    (response) => {
      checkBtn.disabled = false;
      checkBtn.innerHTML = `
        <span class="phx-btn-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </span>
        <span>SCAN</span>
      `;

      if (chrome.runtime.lastError) {
        renderStatus({
          verdict: "unknown",
          score: null,
          reason: "Background error: " + chrome.runtime.lastError.message,
          raw: null
        });
        return;
      }

      if (!response) {
        renderStatus({
          verdict: "unknown",
          score: null,
          reason: "No response from background service.",
          raw: null
        });
        return;
      }

      if (!response.ok) {
        renderStatus({
          verdict: "unknown",
          score: null,
          reason: "Error: " + response.error,
          raw: null
        });
        return;
      }

      const { verdict, score, reason, raw } = response.data;
      lastRawResponse = raw || null;

      renderStatus({ verdict, score, reason, raw });

      if (raw) {
        advancedContent.textContent = JSON.stringify(raw, null, 2);
      }
    }
  );
}

function renderStatus({ verdict, score, reason, raw }) {
  // Badge
  let badgeClass = "phx-badge-unknown";
  let icon = "❔";
  let label = "Unknown";

  if (verdict === "safe") {
    badgeClass = "phx-badge-safe";
    icon = "✅";
    label = "Safe";
  } else if (verdict === "phishing") {
    badgeClass = "phx-badge-phishing";
    icon = "❌";
    label = "Phishing";
  } else if (verdict === "suspicious") {
    badgeClass = "phx-badge-suspicious";
    icon = "⚠️";
    label = "Suspicious";
  }

  statusSummaryEl.innerHTML = `
    <div class="phx-badge ${badgeClass}">
      <span class="phx-badge-icon">${icon}</span>
      <span>${label}</span>
    </div>
  `;

  // Score circle
  scoreRingEl.innerHTML = "";
  const ring = document.createElement("div");
  let ringClass = "phx-score-ring";

  if (verdict === "safe") ringClass += " phx-score-safe";
  else if (verdict === "phishing") ringClass += " phx-score-phishing";
  else if (verdict === "suspicious") ringClass += " phx-score-suspicious";

  ring.className = ringClass;

  const scoreText =
    typeof score === "number" ? `${(score * 100).toFixed(0)}%` : "--";
  ring.textContent = scoreText;
  scoreRingEl.appendChild(ring);

  // Details
  let detailsText = reason || "";
  if (!detailsText && raw && raw.details) {
    detailsText = raw.details;
  }
  detailsEl.textContent =
    detailsText || "No additional details were provided by the engine.";

  // Warnings
  warningsEl.innerHTML = "";
  if (raw && Array.isArray(raw.warnings) && raw.warnings.length) {
    raw.warnings.forEach((w) => {
      const li = document.createElement("li");
      li.textContent = w;
      warningsEl.appendChild(li);
    });
  }
}

// Add spinning animation style
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);