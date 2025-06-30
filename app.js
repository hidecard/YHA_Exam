let currentExamId = "";
let currentQuestionIndex = 0;
let totalQuestions = 0;
let examStartTime = null;
let currentTheme = "light";
let examTimer = null;
let timeRemaining = 3600; // 1 hour in seconds
let isOnline = navigator.onLine;
let isExamActive = false;
let tabSwitchCount = 0;
let tabSwitchLog = [];
let securityEventLog = [];
const API_URL =
  "https://script.google.com/macros/s/AKfycbwP2m20Mb3Jkmp351o-l4NV9j7B8bDytq229agCj53j3OZV0jX-ONCkv7ES03zARvtsWg/exec";

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  initializeTheme();
  hideLoading();
  setupInputValidation();
  setupOfflineMode();
  setupSecurityFeatures();

  // Register service worker for offline support
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(console.error);
  }
});

// Theme functions
function initializeTheme() {
  const savedTheme = localStorage.getItem("examTheme") || "light";
  currentTheme = savedTheme;
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon();
}

function toggleTheme() {
  currentTheme = currentTheme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", currentTheme);
  localStorage.setItem("examTheme", currentTheme);
  updateThemeIcon();
  // Reapply watermark for theme consistency
  addWatermark();

  // Smooth transition effect
  document.body.style.transition = "all 0.3s ease";
  setTimeout(() => {
    document.body.style.transition = "";
  }, 300);
}

function updateThemeIcon() {
  const themeIcon = document.querySelector("#themeToggle i");
  if (themeIcon) {
    themeIcon.className =
      currentTheme === "light" ? "fas fa-moon" : "fas fa-sun";
  }
}

// Loading functions
function showLoading() {
  document.getElementById("loadingOverlay").style.display = "flex";
}

function hideLoading() {
  document.getElementById("loadingOverlay").style.display = "none";
}

// Input validation
function setupInputValidation() {
  const examIdInput = document.getElementById("examId");
  examIdInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      startExam();
    }
  });

  examIdInput.addEventListener("input", function (e) {
    const value = e.target.value.trim();
    const startButton = document.querySelector(".btn-modern.btn-primary");

    if (value.length > 0) {
      startButton.style.opacity = "1";
      startButton.style.pointerEvents = "auto";
    } else {
      startButton.style.opacity = "0.6";
      startButton.style.pointerEvents = "none";
    }
  });
}

// Security Features: Prevent screenshots, right-click, dev tools, and track tab switching
function setupSecurityFeatures() {
  // Disable right-click context menu
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showNotification("Right-click is disabled to protect exam content.", "warning");
    logSecurityEvent("Right-click attempt detected");
  });

  // Detect screenshot and dev tools shortcuts
  document.addEventListener("keydown", (e) => {
    // Screenshot shortcuts: PrintScreen, Ctrl+Shift+S, Cmd+Shift+3/4
    if (
      e.key === "PrintScreen" ||
      (e.ctrlKey && e.shiftKey && e.key === "S") ||
      (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4"))
    ) {
      e.preventDefault();
      showNotification("Screenshots are not allowed during the exam.", "error");
      logSecurityEvent(`Screenshot attempt detected (Key: ${e.key})`);
    }

    // Dev tools shortcuts: F12, Ctrl+Shift+I, Ctrl+Shift+J, Cmd+Opt+I/J
    if (
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
      (e.metaKey && e.altKey && (e.key === "I" || e.key === "J"))
    ) {
      e.preventDefault();
      showNotification("Developer tools are not allowed during the exam.", "error");
      logSecurityEvent(`Dev tools attempt detected (Key: ${e.key})`);
    }
  });

  // Detect tab switching or window focus changes
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && isExamActive) {
      tabSwitchCount++;
      const timestamp = new Date().toLocaleString();
      const logEntry = `Tab switch or focus loss detected at ${timestamp}`;
      tabSwitchLog.push(logEntry);
      showNotification(
        "Warning: Switching tabs or applications is not allowed during the exam.",
        "warning"
      );
      logSecurityEvent(logEntry);
    }
  });

  // Detect developer tools being open (basic heuristic)
  let devToolsOpen = false;
  const devToolsCheck = () => {
    const threshold = 160; // Typical height/width difference when dev tools are open
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > threshold || heightDiff > threshold) {
      if (!devToolsOpen) {
        devToolsOpen = true;
        showNotification("Developer tools detected. Please close them to continue.", "error");
        logSecurityEvent("Developer tools detected");
      }
    } else {
      devToolsOpen = false;
    }
  };

  // Check for dev tools periodically
  if (isExamActive) {
    setInterval(devToolsCheck, 1000);
  }

  // Add watermark
  addWatermark();

  // Prevent text selection and copying
  document.addEventListener("selectstart", (e) => {
    e.preventDefault();
    showNotification("Text selection is disabled during the exam.", "warning");
    logSecurityEvent("Text selection attempt detected");
  });

  // Prevent drag-and-drop (e.g., dragging content to snipping tools)
  document.addEventListener("dragstart", (e) => {
    e.preventDefault();
    showNotification("Dragging content is not allowed during the exam.", "warning");
    logSecurityEvent("Drag attempt detected");
  });
}

// Log security events
function logSecurityEvent(event) {
  const timestamp = new Date().toLocaleString();
  securityEventLog.push(`${timestamp}: ${event}`);
  console.log(`Security Event: ${event}`);
  // Optionally, send to server if online
  if (isOnline) {
    // Example: fetch(`${API_URL}?action=logEvent&event=${encodeURIComponent(event)}`);
  }
}

// // Add watermark
// function addWatermark() {
//   // Remove existing watermark if any
//   const existingWatermark = document.querySelector(".watermark");
//   if (existingWatermark) {
//     existingWatermark.remove();
//   }

//   const watermark = document.createElement("div");
//   watermark.className = "watermark";
//   watermark.textContent = `Exam ID: ${currentExamId || "YHA"} | User: Anonymous | Do Not Copy`;
//   document.body.appendChild(watermark);
// }

// Start exam function
async function startExam() {
  currentExamId = document.getElementById("examId").value.trim();

  if (!currentExamId) {
    showNotification("Please enter an Exam ID", "warning");
    return;
  }

  // Validate exam ID format
  if (currentExamId.length < 2) {
    showNotification("Please enter a valid Exam ID", "error");
    return;
  }

  // Request fullscreen mode
  if (document.documentElement.requestFullscreen) {
    try {
      await document.documentElement.requestFullscreen();
      showNotification("Exam started in fullscreen mode for security.", "info");
    } catch (err) {
      console.error("Fullscreen request failed:", err);
      showNotification("Fullscreen mode recommended for exam security.", "warning");
    }
  }

  showLoading();
  examStartTime = new Date();
  currentQuestionIndex = 0;
  tabSwitchCount = 0;
  tabSwitchLog = [];
  securityEventLog = [];

  // Initialize timer (1 hour default)
  timeRemaining = 3600;
  startTimer();

  try {
    await loadQuestion();
    showExamSection();
    isExamActive = true;
    hideLoading();
    showNotification("Exam started successfully!", "success");
  } catch (error) {
    hideLoading();
    if (!isOnline) {
      showNotification("Starting in offline mode", "warning");
      showExamSection();
      isExamActive = true;
    } else {
      showNotification("Failed to start exam. Please try again.", "error");
    }
    console.error("Start exam error:", error);
  }
}

// Show exam section
function showExamSection() {
  document.getElementById("welcomeSection").style.display = "none";
  document.getElementById("examSection").style.display = "block";
  document.getElementById("currentExamId").textContent = currentExamId;
  updateProgress();
  // Reapply watermark
  addWatermark();
}

// Timer functions
function startTimer() {
  if (examTimer) clearInterval(examTimer);

  examTimer = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    updateTimerBar();

    if (timeRemaining <= 0) {
      clearInterval(examTimer);
      autoSubmitExam();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timerText = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const timerElement = document.getElementById("timerText");
  const timerDisplay = document.getElementById("examTimer");

  if (timerElement) {
    timerElement.textContent = timerText;
  }

  if (timerDisplay) {
    timerDisplay.className = "timer-display";
    if (timeRemaining <= 600) {
      timerDisplay.classList.add("danger");
    } else if (timeRemaining <= 1200) {
      timerDisplay.classList.add("warning");
    }
  }
}

function updateTimerBar() {
  const timerBar = document.getElementById("timerBar");
  if (timerBar) {
    const percentage = (timeRemaining / 3600) * 100;
    timerBar.style.width = `${percentage}%`;

    timerBar.className = "timer-bar";
    if (timeRemaining <= 600) {
      timerBar.classList.add("danger");
    } else if (timeRemaining <= 1200) {
      timerBar.classList.add("warning");
    }
  }
}

function autoSubmitExam() {
  showNotification("Time is up! Exam submitted automatically.", "warning");
  finishExam();
}

// Offline Mode functions
function setupOfflineMode() {
  window.addEventListener("online", () => {
    isOnline = true;
    updateConnectionStatus();
    hideOfflineBanner();
  });

  window.addEventListener("offline", () => {
    isOnline = false;
    updateConnectionStatus();
    showOfflineBanner();
  });

  updateConnectionStatus();
}

function updateConnectionStatus() {
  const statusElement = document.getElementById("connectionStatus");
  const iconElement = document.getElementById("connectionIcon");
  const textElement = document.getElementById("connectionText");

  if (statusElement && iconElement && textElement) {
    if (isOnline) {
      statusElement.className = "connection-status online";
      iconElement.className = "fas fa-wifi";
      textElement.textContent = "Online";
    } else {
      statusElement.className = "connection-status offline";
      iconElement.className = "fas fa-wifi-slash";
      textElement.textContent = "Offline";
    }
  }
}

function showOfflineBanner() {
  document.getElementById("offlineBanner").style.display = "block";
  document.body.style.paddingTop = "60px";
}

function hideOfflineBanner() {
  document.getElementById("offlineBanner").style.display = "none";
  document.body.style.paddingTop = "0";
}

function syncWhenOnline() {
  if (isOnline) {
    showNotification("Connection restored!", "success");
  } else {
    showNotification("Still offline. Please check your connection.", "warning");
  }
}

// Load question function
async function loadQuestion() {
  try {
    showLoading();

    const response = await fetch(
      `${API_URL}?action=getExam&examId=${currentExamId}&questionIndex=${currentQuestionIndex}`,
    );
    const data = await response.json();

    if (data.error) {
      document.getElementById("questionContainer").innerHTML = `
        <div class="alert alert-danger d-flex align-items-center">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <span>${data.error}</span>
        </div>
      `;
      document.getElementById("pdfCard").style.display = "none";
      document.getElementById("resourcesSection").style.display = "none";
      return;
    }

    totalQuestions = data.totalQuestions;
    document.getElementById("totalQuestionsNum").textContent = totalQuestions;

    document.getElementById("questionTitle").textContent =
      `Question ${currentQuestionIndex + 1}`;
    document.getElementById("questionContainer").innerHTML = `
      <h3>Question ${currentQuestionIndex + 1}</h3>
      <p>${data.question}</p>
    `;

    try {
      await loadPDF(data.pdf_link);
    } catch (pdfError) {
      console.error("PDF loading error:", pdfError);
      showNotification("PDF loading failed, but exam can continue", "warning");
    }

    handleResources(data.resource_link);
    updateNavigation();
    updateProgress();

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error("Error loading question:", error);
    document.getElementById("questionContainer").innerHTML = `
      <div class="alert alert-danger d-flex align-items-center">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <span>Error loading question: ${error.message}</span>
      </div>
    `;
    document.getElementById("pdfCard").style.display = "none";
    document.getElementById("resourcesSection").style.display = "none";
  }
}

// PDF loading with pdf.js
async function loadPDF(pdfLink) {
  const pdfCard = document.getElementById("pdfCard");
  const pdfViewer = document.getElementById("pdfViewer");

  if (
    pdfLink &&
    (pdfLink.includes("raw.githubusercontent.com") ||
      pdfLink.includes("drive.google.com"))
  ) {
    pdfCard.style.display = "block";
    pdfViewer.innerHTML =
      '<div class="text-center"><div class="spinner"></div><p>Loading PDF...</p></div>';

    try {
      const pdf = await pdfjsLib.getDocument(pdfLink).promise;
      const numPages = pdf.numPages;
      pdfViewer.innerHTML = "";

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const canvas = document.createElement("canvas");
        canvas.style.marginBottom = "20px";
        pdfViewer.appendChild(canvas);
        const context = canvas.getContext("2d");
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
      }
    } catch (error) {
      console.error("PDF Error:", error);
      pdfViewer.innerHTML = `
        <div class="pdf-fallback">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Unable to load PDF. Please check the resource link.</p>
        </div>
      `;
      showNotification("Error loading PDF", "warning");
    }
  } else {
    pdfCard.style.display = "none";
  }
}

// Handle resources
function handleResources(resourceLink) {
  const resourcesSection = document.getElementById("resourcesSection");
  const downloadBtn = document.getElementById("resourceDownload");

  if (
    resourceLink &&
    (resourceLink.includes("raw.githubusercontent.com") ||
      resourceLink.includes("drive.google.com"))
  ) {
    resourcesSection.style.display = "block";
    downloadBtn.href = resourceLink;
    downloadBtn.style.display = "inline-flex";
    downloadBtn.innerHTML =
      '<i class="fas fa-file-download"></i> Download Resource';
  } else {
    resourcesSection.style.display = "none";
  }
}

// Update navigation
function updateNavigation() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const finishBtn = document.getElementById("finishBtn");

  prevBtn.style.display = currentQuestionIndex > 0 ? "inline-flex" : "none";

  if (currentQuestionIndex < totalQuestions - 1) {
    nextBtn.style.display = "inline-flex";
    finishBtn.style.display = "none";
  } else {
    nextBtn.style.display = "none";
    finishBtn.style.display = "inline-flex";
  }
}

// Update progress
function updateProgress() {
  const currentQuestionNum = document.getElementById("currentQuestionNum");
  const progressFill = document.getElementById("progressFill");

  currentQuestionNum.textContent = currentQuestionIndex + 1;

  const progressPercentage =
    ((currentQuestionIndex + 1) / totalQuestions) * 100;
  progressFill.style.width = `${progressPercentage}%`;
}

// Navigation functions
function nextQuestion() {
  if (currentQuestionIndex < totalQuestions - 1) {
    currentQuestionIndex++;
    loadQuestion();
    scrollToTop();
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    loadQuestion();
    scrollToTop();
  }
}

// Finish exam
function finishExam() {
  isExamActive = false;
  clearInterval(examTimer);
  showExamCompletionReport();
}

// Show exam completion report with security logs
function showExamCompletionReport() {
  const existingModal = document.getElementById("examReportModal");
  if (existingModal) {
    existingModal.remove();
  }

  const totalExamTime = examStartTime
    ? Math.floor((Date.now() - examStartTime.getTime()) / 1000)
    : 0;
  const minutes = Math.floor(totalExamTime / 60);
  const seconds = totalExamTime % 60;

  const modal = document.createElement("div");
  modal.className = "modal fade show";
  modal.style.display = "block";
  modal.id = "examReportModal";
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content modern-modal">
        <div class="modal-header" style="background: var(--success-gradient); color: white;">
          <i class="fas fa-check-circle" style="font-size: 1.5rem; margin-right: 0.5rem;"></i>
          <h5 class="modal-title">Exam Completed</h5>
        </div>
        <div class="modal-body">
          <p>Congratulations! You have successfully completed the exam.</p>
          <div class="exam-summary">
            <div class="summary-item">
              <span class="label">Exam ID:</span>
              <span class="value">${currentExamId}</span>
            </div>
            <div class="summary-item">
              <span class="label">Total Questions:</span>
              <span class="value">${totalQuestions}</span>
            </div>
            <div class="summary-item">
              <span class="label">Total Time:</span>
              <span class="value">${minutes}m ${seconds}s</span>
            </div>
            <div class="summary-item">
              <span class="label">Tab Switches Detected:</span>
              <span class="value">${tabSwitchCount}</span>
            </div>
            ${
              tabSwitchLog.length > 0
                ? `
            <div class="summary-item">
              <span class="label">Tab Switch Log:</span>
              <div class="value">${tabSwitchLog
                .map((log) => `<div>${log}</div>`)
                .join("")}</div>
            </div>`
                : ""
            }
            ${
              securityEventLog.length > 0
                ? `
            <div class="summary-item">
              <span class="label">Security Events:</span>
              <div class="value">${securityEventLog
                .map((log) => `<div>${log}</div>`)
                .join("")}</div>
            </div>`
                : ""
            }
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-modern btn-primary" onclick="restartExam()">
            Take Another Exam
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Exit fullscreen mode if active
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(console.error);
  }
}

// Restart exam
function restartExam() {
  location.reload();
}

// Utility functions
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showNotification(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `notification-toast notification-${type}`;

  const icon = getNotificationIcon(type);
  toast.innerHTML = `<i class="${icon}"></i> ${message}`;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function getNotificationIcon(type) {
  const icons = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle",
  };
  return icons[type] || icons.info;
}

// Notification and watermark styles
const notificationStyles = `
.notification-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  border-radius: var(--border-radius);
  color: white;
  font-weight: 600;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transform: translateX(400px);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-lg);
}

.notification-toast.show {
  transform: translateX(0);
  opacity: 1;
}

.notification-success {
  background: var(--success-color);
}

.notification-error {
  background: var(--danger-color);
}

.notification-warning {
  background: var(--warning-color);
  color: var(--dark-color);
}

.notification-info {
  background: var(--primary-color);
}

.watermark {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  font-size: 1.5rem;
  color: rgba(0, 0, 0, 0.1);
  pointer-events: none;
  z-index: 999;
  white-space: nowrap;
}

[data-theme="dark"] .watermark {
  color: rgba(255, 255, 255, 0.1);
}

.pdf-viewer.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--light-color);
  z-index: 9999;
  padding: 2rem;
  overflow-y: auto;
}

.pdf-viewer canvas {
  width: 100%;
  border: 1px solid var(--gray-200);
  border-radius: var(--border-radius);
  margin-bottom: 1rem;
  pointer-events: none;
}

.pdf-fallback {
  text-align: center;
  padding: 1rem;
  background: var(--gray-100);
  border-radius: var(--border-radius);
  margin-bottom: 1rem;
}

[data-theme="dark"] .pdf-fallback {
  background: var(--gray-200);
}
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);