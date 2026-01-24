
console.log("[NLM Timeline] Script loaded. Waiting for DOM...");

const TIMELINE_CONFIG = {
  scrollContainerSelector: '.chat-panel-content',
  userTurnSelector: '.from-user-container',
  userTextSelector: '.message-text-content p', // Confirmed selector
  barId: 'nlm-timeline-bar',
  tooltipId: 'nlm-timeline-tooltip',
  paddingRight: '40px',
  maxRetries: 30, // 30 seconds max wait
  retryInterval: 1000
};

let timelineState = {
  container: null,
  bar: null,
  track: null,
  slider: null,
  tooltip: null,
  markers: [],
  isScrolling: false,
  observer: null,
  resizeObserver: null,
  debounceTimer: null,
  initRetryCount: 0
};

// --- Initialization Logic ---

function startInitialization() {
  // 1. First immediate check
  const container = document.querySelector(TIMELINE_CONFIG.scrollContainerSelector);
  if (container) {
    console.log("[NLM Timeline] Container found immediately.");
    initTimeline(container);
    return;
  }

  // 2. If not found, use MutationObserver to watch body for it
  console.log("[NLM Timeline] Container not found. Starting DOM Sentinel...");
  
  const sentinelObserver = new MutationObserver((mutations, obs) => {
    const container = document.querySelector(TIMELINE_CONFIG.scrollContainerSelector);
    if (container) {
      console.log("[NLM Timeline] Container detected by Sentinel!");
      obs.disconnect(); // Stop watching body
      initTimeline(container);
    }
  });

  sentinelObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 3. Fallback timeout to stop observer if it never happens (safety break)
  setTimeout(() => {
    if (!timelineState.container) {
      console.warn("[NLM Timeline] Timeout: Container selector never matched:", TIMELINE_CONFIG.scrollContainerSelector);
      sentinelObserver.disconnect();
    }
  }, 30000);
}

function initTimeline(container) {
  if (timelineState.container === container) return;
  timelineState.container = container;

  console.log("[NLM Timeline] Initializing UI...");

  try {
    // 1. Prepare Parent Container
    const parent = container.parentElement;
    if (!parent) {
      console.error("[NLM Timeline] Container has no parent!");
      return;
    }

    // Force relative positioning on parent so absolute children align to it
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
      parent.style.position = 'relative';
      console.log("[NLM Timeline] Set parent position to relative.");
    }

    // 2. Inject UI into Parent
    injectTimelineUI(parent);

    // 3. Adjust Layout
    container.style.paddingRight = TIMELINE_CONFIG.paddingRight;
    container.style.boxSizing = 'border-box';
    console.log(`[NLM Timeline] Added padding-right: ${TIMELINE_CONFIG.paddingRight} to container.`);

    // 4. Setup Observers
    setupObservers(container);
    setupListeners(container);

    // 5. Initial Render
    recalculateMarkers();

    console.log("[NLM Timeline] Initialization complete.");
  } catch (err) {
    console.error("[NLM Timeline] Error during initialization:", err);
  }
}

// --- UI Injection ---
function injectTimelineUI(targetParent) {
  // Cleanup old elements
  const oldBar = document.getElementById(TIMELINE_CONFIG.barId);
  if (oldBar) oldBar.remove();
  const oldTooltip = document.getElementById(TIMELINE_CONFIG.tooltipId);
  if (oldTooltip) oldTooltip.remove();

  // Create Bar
  const bar = document.createElement('div');
  bar.id = TIMELINE_CONFIG.barId;
  bar.className = 'nlm-timeline-bar';
  
  const track = document.createElement('div');
  track.className = 'nlm-timeline-track';
  
  const slider = document.createElement('div');
  slider.className = 'nlm-timeline-slider';
  
  // Create Tooltip (hidden by default)
  const tooltip = document.createElement('div');
  tooltip.id = TIMELINE_CONFIG.tooltipId;
  tooltip.className = 'nlm-timeline-tooltip';
  
  track.appendChild(slider);
  bar.appendChild(track);
  
  // Inject bar into parent
  targetParent.appendChild(bar);
  
  // Inject tooltip into bar (so it positions relative to bar)
  // Or inject into track? Absolute positioning relative to bar works best.
  bar.appendChild(tooltip);

  timelineState.bar = bar;
  timelineState.track = track;
  timelineState.slider = slider;
  timelineState.tooltip = tooltip;
  console.log("[NLM Timeline] UI Injected into chat panel parent.");
}

// --- Logic ---
function recalculateMarkers() {
  if (!timelineState.container || !timelineState.track) return;

  const userTurns = Array.from(timelineState.container.querySelectorAll(TIMELINE_CONFIG.userTurnSelector));
  console.log(`[NLM Timeline] Found ${userTurns.length} user turns.`);

  // Clear existing dots
  const existingDots = timelineState.track.querySelectorAll('.nlm-timeline-dot');
  existingDots.forEach(dot => dot.remove());
  
  timelineState.markers = [];

  if (userTurns.length === 0) {
    timelineState.bar.style.display = 'none';
    return;
  } else {
    timelineState.bar.style.display = 'flex';
  }

  const totalHeight = timelineState.container.scrollHeight;
  const viewportHeight = timelineState.container.clientHeight;
  const scrollTop = timelineState.container.scrollTop;
  
  if (totalHeight <= viewportHeight) {
    timelineState.bar.style.display = 'none';
    return;
  }

  const containerRect = timelineState.container.getBoundingClientRect();

  userTurns.forEach((turn, index) => {
    const rect = turn.getBoundingClientRect();
    const offsetFromTop = scrollTop + (rect.top - containerRect.top);
    
    // Normalize (0 to 1)
    let n = offsetFromTop / totalHeight;
    n = Math.max(0, Math.min(1, n));

    // Extract Text
    let tooltipText = `Question ${index + 1}`;
    const textEl = turn.querySelector(TIMELINE_CONFIG.userTextSelector);
    if (textEl && textEl.textContent) {
        let rawText = textEl.textContent.trim();
        if (rawText.length > 50) {
            rawText = rawText.substring(0, 50) + '...';
        }
        tooltipText = rawText;
    }

    // Create Dot (Triangle)
    const dot = document.createElement('div');
    dot.className = 'nlm-timeline-dot';
    dot.style.setProperty('--n', n);
    // dot.title = tooltipText; // Removed native title in favor of custom tooltip
    
    // Hover Events for Tooltip
    dot.addEventListener('mouseenter', () => showTooltip(tooltipText, n));
    dot.addEventListener('mouseleave', () => hideTooltip());
    
    // Click to scroll
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log(`[NLM Timeline] Scrolling to Question ${index + 1}`);
      timelineState.container.scrollTo({
        top: offsetFromTop - 20, 
        behavior: 'smooth'
      });
    });

    timelineState.track.appendChild(dot);
    
    timelineState.markers.push({
      element: turn,
      top: offsetFromTop,
      n: n,
      dot: dot
    });
  });

  updateSlider();
}

function showTooltip(text, n) {
    if (!timelineState.tooltip) return;
    
    timelineState.tooltip.textContent = text;
    // Position tooltip vertically aligned with the dot
    // Dot top is calc(12px + (100% - 24px) * n)
    // We can use the same calc or just set top style
    timelineState.tooltip.style.top = `calc(12px + (100% - 24px) * ${n})`;
    
    timelineState.tooltip.classList.add('visible');
}

function hideTooltip() {
    if (!timelineState.tooltip) return;
    timelineState.tooltip.classList.remove('visible');
}

function updateSlider() {
  if (!timelineState.container || !timelineState.slider) return;

  const { scrollTop, scrollHeight, clientHeight } = timelineState.container;
  const n = scrollTop / scrollHeight;
  const h = clientHeight / scrollHeight;

  const topPct = n * 100;
  const heightPct = h * 100;

  timelineState.slider.style.display = 'block';
  timelineState.slider.style.top = `${topPct}%`;
  timelineState.slider.style.height = `${heightPct}%`;
}

// --- Listeners ---
function setupListeners(container) {
  container.addEventListener('scroll', () => {
    if (timelineState.debounceTimer) cancelAnimationFrame(timelineState.debounceTimer);
    timelineState.debounceTimer = requestAnimationFrame(() => {
      updateSlider();
      highlightActiveDot();
    });
  });
}

function setupObservers(container) {
  console.log("[NLM Timeline] Setting up internal observers...");
  
  // Mutation Observer for content changes
  timelineState.observer = new MutationObserver((mutations) => {
    const hasRelevantChange = mutations.some(m => 
      m.addedNodes.length > 0 || 
      (m.target && m.target.classList && m.target.classList.contains('from-user-container'))
    );

    if (hasRelevantChange) {
      if (timelineState.debounceTimer) clearTimeout(timelineState.debounceTimer);
      timelineState.debounceTimer = setTimeout(recalculateMarkers, 300);
    }
  });

  timelineState.observer.observe(container, {
    childList: true,
    subtree: true
  });

  // Resize Observer
  timelineState.resizeObserver = new ResizeObserver(() => {
     recalculateMarkers();
  });
  timelineState.resizeObserver.observe(container);
}

function highlightActiveDot() {
  const center = timelineState.container.scrollTop + timelineState.container.clientHeight / 2;
  
  let closest = null;
  let minDiff = Infinity;

  timelineState.markers.forEach(m => {
    const diff = Math.abs(m.top - center);
    if (diff < minDiff) {
      minDiff = diff;
      closest = m;
    }
    m.dot.classList.remove('active');
  });

  if (closest) {
    closest.dot.classList.add('active');
  }
}

// Start
startInitialization();
