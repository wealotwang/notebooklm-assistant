
console.log("[NLM Timeline] Script loaded. Waiting for DOM...");

const TIMELINE_CONFIG = {
  scrollContainerSelector: '.chat-panel-content',
  userTurnSelector: '.from-user-container',
  barId: 'nlm-timeline-bar',
  paddingRight: '40px',
  maxRetries: 30, // 30 seconds max wait
  retryInterval: 1000
};

let timelineState = {
  container: null,
  bar: null,
  track: null,
  slider: null,
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
    // 1. Inject UI
    injectTimelineUI();

    // 2. Adjust Layout
    container.style.paddingRight = TIMELINE_CONFIG.paddingRight;
    container.style.boxSizing = 'border-box';
    console.log(`[NLM Timeline] Added padding-right: ${TIMELINE_CONFIG.paddingRight} to container.`);

    // 3. Setup Observers
    setupObservers(container);
    setupListeners(container);

    // 4. Initial Render
    recalculateMarkers();

    console.log("[NLM Timeline] Initialization complete.");
  } catch (err) {
    console.error("[NLM Timeline] Error during initialization:", err);
  }
}

// --- UI Injection ---
function injectTimelineUI() {
  if (document.getElementById(TIMELINE_CONFIG.barId)) {
    console.log("[NLM Timeline] UI already exists, skipping injection.");
    return;
  }

  const bar = document.createElement('div');
  bar.id = TIMELINE_CONFIG.barId;
  bar.className = 'nlm-timeline-bar';
  
  const track = document.createElement('div');
  track.className = 'nlm-timeline-track';
  
  const slider = document.createElement('div');
  slider.className = 'nlm-timeline-slider';
  
  track.appendChild(slider);
  bar.appendChild(track);
  document.body.appendChild(bar);

  timelineState.bar = bar;
  timelineState.track = track;
  timelineState.slider = slider;
  console.log("[NLM Timeline] UI Injected into body.");
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
  
  // Debug info
  // console.log(`[NLM Timeline] Geometry: H=${totalHeight}, View=${viewportHeight}, Scroll=${scrollTop}`);

  if (totalHeight <= viewportHeight) {
    timelineState.bar.style.display = 'none';
    // console.log("[NLM Timeline] Content matches viewport, hiding bar.");
    return;
  }

  // Calculate relative top for elements
  // The logic: we want the element's position relative to the "start" of the scrolling content.
  // container.scrollTop + rect.top - containerRect.top gives the offset from the top of the scrollable area.
  const containerRect = timelineState.container.getBoundingClientRect();

  userTurns.forEach((turn, index) => {
    const rect = turn.getBoundingClientRect();
    
    // Calculate absolute offset from the very top of the scrollable content
    const offsetFromTop = scrollTop + (rect.top - containerRect.top);
    
    // Normalize (0 to 1)
    let n = offsetFromTop / totalHeight;
    n = Math.max(0, Math.min(1, n));

    // console.log(`[NLM Timeline] Turn ${index}: Top=${offsetFromTop}, n=${n.toFixed(3)}`);

    const dot = document.createElement('div');
    dot.className = 'nlm-timeline-dot';
    dot.style.setProperty('--n', n);
    dot.title = `Question ${index + 1}`;
    
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log(`[NLM Timeline] Scrolling to Question ${index + 1} at ${offsetFromTop}px`);
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
      // console.log("[NLM Timeline] Content mutation detected, scheduling recalc.");
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
     // console.log("[NLM Timeline] Resize detected.");
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
