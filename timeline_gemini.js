console.log("[Gemini Timeline] Script loaded. Waiting for DOM...");

const TIMELINE_CONFIG = {
  // Target the infinite-scroller which is the scrollable element
  // BUT also include the parent ID just in case, as per v3.0.0.3 logic
  scrollContainerSelector: 'infinite-scroller, #chat-history-scroll-container',
  // User queries in Gemini usually have this class (based on Voyager)
  userTurnSelector: '.user-query-bubble-with-background, user-query', 
  // Text inside the query
  userTextSelector: 'p, .text', 
  barId: 'nlm-timeline-bar',
  tooltipId: 'nlm-timeline-tooltip',
  paddingRight: '40px',
  maxRetries: 30, 
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

// --- Lifecycle Management (Persistent) ---
const TimelineLifecycle = {
  observer: null,
  
  start() {
    console.log("[Gemini Timeline] Starting Lifecycle Manager...");
    
    // Watch the body for major DOM changes (navigation, re-renders)
    this.observer = new MutationObserver(this.handleMutations.bind(this));
    this.observer.observe(document.body, { childList: true, subtree: true });
    
    // Initial check
    this.checkAndRevive();
  },
  
  handleMutations: function(mutations) {
    // Debounce to avoid spamming checks during heavy rendering
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.checkAndRevive();
    }, 500); // 500ms debounce
  },
  
  checkAndRevive() {
    // 1. Is the Scroll Container present?
    const container = document.querySelector(TIMELINE_CONFIG.scrollContainerSelector);
    
    // 2. Is our Timeline Bar present?
    const bar = document.getElementById(TIMELINE_CONFIG.barId);
    
    if (container && !bar) {
      console.log("[Gemini Timeline] Lifecycle: Container found but Timeline missing. Reviving...");
      initTimeline(container);
    } else if (!container && bar) {
       console.log("[Gemini Timeline] Lifecycle: Container lost. Cleaning up Timeline...");
       // Ideally we should remove the bar, but it might be detached already.
       // Let's just reset state.
       timelineState.bar = null;
    }
  }
};

// Start everything
TimelineLifecycle.start();

function initTimeline(container) {
  // Revert to simple container check (v3.0.0.2 style)
  // We trust the querySelector from startInitialization
  
  if (timelineState.container === container) return;
  timelineState.container = container;

  console.log("[Gemini Timeline] Initializing UI...");

  try {
    // 1. Prepare Parent Container
    const parent = container.parentElement;
    if (!parent) {
      console.error("[Gemini Timeline] Container has no parent!");
      return;
    }

    // Force relative positioning on parent so absolute children align to it
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
      parent.style.position = 'relative';
      console.log("[Gemini Timeline] Set parent position to relative.");
    }

    // 2. Inject UI into Parent (v3.0.0.2 style)
    injectTimelineUI(parent);

    // 3. Setup Observers
    setupObservers(container);
    setupListeners(container);

    // 4. Initial Render
    recalculateMarkers();

    console.log("[Gemini Timeline] Initialization complete.");
  } catch (err) {
    console.error("[Gemini Timeline] Error during initialization:", err);
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
  bar.className = 'nlm-timeline-bar gemini-timeline-bar'; // Add Gemini class
  
  // Revert to default absolute positioning (controlled by CSS)
  // v3.0.0.9 used fixed/z-index, we remove that now
  bar.style.position = ''; 
  bar.style.zIndex = ''; 
  
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
  
  // Inject tooltip into bar
  bar.appendChild(tooltip);

  timelineState.bar = bar;
  timelineState.track = track;
  timelineState.slider = slider;
  timelineState.tooltip = tooltip;
  console.log("[Gemini Timeline] UI Injected into parent container.");
}

function updateTimelinePosition() {
    // No-op in v3.0.0.2 architecture (handled by CSS absolute positioning)
}

// --- Logic ---
function recalculateMarkers() {
  if (!timelineState.container || !timelineState.track) return;

  const userTurns = Array.from(timelineState.container.querySelectorAll(TIMELINE_CONFIG.userTurnSelector));
  
  // DIAGNOSTIC LOG
  console.log(`[Gemini Timeline] Diagnostic: Found ${userTurns.length} user turns using selector: ${TIMELINE_CONFIG.userTurnSelector}`);

  // Clear existing dots
  const existingDots = timelineState.track.querySelectorAll('.nlm-timeline-dot');
  existingDots.forEach(dot => dot.remove());
  
  timelineState.markers = [];

  if (userTurns.length === 0) {
    timelineState.bar.style.display = 'none';
    console.log("[Gemini Timeline] Hiding bar (0 turns)");
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

  // Gemini's container might have offsets
  // We use relative calculation based on scrollHeight
  
  userTurns.forEach((turn, index) => {
    // In Gemini, we might need to be careful about offsets.
    // Using offsetTop relative to container is safer than getBoundingClientRect for non-visible elements
    let offsetTop = turn.offsetTop;
    let current = turn.offsetParent;
    while(current && current !== timelineState.container) {
        offsetTop += current.offsetTop;
        current = current.offsetParent;
    }

    // Normalize (0 to 1)
    let n = offsetTop / totalHeight;
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
    
    // Hover Events for Tooltip
    dot.addEventListener('mouseenter', () => showTooltip(tooltipText, n));
    dot.addEventListener('mouseleave', () => hideTooltip());
    
    // Click to scroll
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log(`[Gemini Timeline] Scrolling to Question ${index + 1}`);
      timelineState.container.scrollTo({
        top: offsetTop - 100, // Add some offset for header
        behavior: 'smooth'
      });
    });

    timelineState.track.appendChild(dot);
    
    timelineState.markers.push({
      element: turn,
      top: offsetTop,
      n: n,
      dot: dot
    });
  });

  updateSlider();
}

function showTooltip(text, n) {
    if (!timelineState.tooltip) return;
    
    timelineState.tooltip.textContent = text;
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
  console.log("[Gemini Timeline] Setting up internal observers...");
  
  // Mutation Observer for content changes
  timelineState.observer = new MutationObserver((mutations) => {
    const hasRelevantChange = mutations.some(m => 
      m.addedNodes.length > 0
    );

    if (hasRelevantChange) {
      if (timelineState.debounceTimer) clearTimeout(timelineState.debounceTimer);
      timelineState.debounceTimer = setTimeout(recalculateMarkers, 500); // Increased debounce for Gemini
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

