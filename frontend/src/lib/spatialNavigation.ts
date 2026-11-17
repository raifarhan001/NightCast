/**
 * NightCast Smart TV & Android TV Spatial Navigation Engine
 * ---------------------------------------------------------
 * Full 2D D-Pad / Directional Navigation for 10-foot TV experience.
 * Supports Android TV, Tizen (Samsung), webOS (LG), Fire TV, Apple TV,
 * and standard keyboard D-Pad remotes.
 */

export type Direction = "up" | "down" | "left" | "right";

// Standard TV and Keyboard Key Codes
export const TV_KEY_MAP = {
  UP: ["ArrowUp", "Up"],
  DOWN: ["ArrowDown", "Down"],
  LEFT: ["ArrowLeft", "Left"],
  RIGHT: ["ArrowRight", "Right"],
  SELECT: ["Enter", "Select", "Accept"],
  BACK: ["Escape", "Backspace", "GoBack"],
  PLAY_PAUSE: ["MediaPlayPause", "MediaPlay", "MediaPause", "Play", "Pause"],
};

// Numerical keyCodes for TV WebViews (Tizen, webOS, Android TV)
export const TV_NUM_KEY_CODES = {
  UP: [38, 19], // 38: ArrowUp, 19: KEYCODE_DPAD_UP
  DOWN: [40, 20], // 40: ArrowDown, 20: KEYCODE_DPAD_DOWN
  LEFT: [37, 21], // 37: ArrowLeft, 21: KEYCODE_DPAD_LEFT
  RIGHT: [39, 22], // 39: ArrowRight, 22: KEYCODE_DPAD_RIGHT
  SELECT: [13, 23, 10009], // 13: Enter, 23: KEYCODE_DPAD_CENTER, 10009: Tizen Select
  BACK: [27, 8, 461, 10009, 4], // 27: Esc, 8: Backspace, 461: webOS Back, 10009: Tizen Return, 4: Android Back
  PLAY_PAUSE: [179],
};

const FOCUSABLE_SELECTOR = [
  "a[href]:not([tabindex='-1'])",
  "button:not([disabled]):not([tabindex='-1'])",
  "input:not([disabled]):not([type='hidden']):not([tabindex='-1'])",
  "select:not([disabled]):not([tabindex='-1'])",
  "textarea:not([disabled]):not([tabindex='-1'])",
  "[tabindex='0']:not([disabled])",
  "[role='button']:not([disabled]):not([aria-disabled='true']):not([tabindex='-1'])",
  "[data-focusable='true']",
].join(", ");

/**
 * Checks if the user agent is a Smart TV, Android TV, or console.
 */
export function isTvUserAgent(): boolean {
  if (typeof window === "undefined" || !navigator.userAgent) return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("smart-tv") ||
    ua.includes("smarttv") ||
    ua.includes("googletv") ||
    ua.includes("android tv") ||
    ua.includes("tizen") ||
    ua.includes("webos") ||
    ua.includes("web0s") ||
    ua.includes("appletv") ||
    ua.includes("hbbtv") ||
    ua.includes("crkey") ||
    ua.includes("viera") ||
    ua.includes("vidaa") ||
    ua.includes("playstation") ||
    ua.includes("xbox") ||
    ua.includes("aftt") || // Amazon Fire TV
    ua.includes("aftm") ||
    ua.includes("roku")
  );
}

/**
 * Determines whether an element is visible, non-zero sized, and interactable.
 */
export function isElementVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.classList.contains("sr-only") && document.activeElement !== el) return false;

  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }

  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Finds the currently active dialog/modal container if one is open.
 * Restricts spatial navigation candidates to inside the dialog (focus trap).
 */
export function getActiveModalContainer(): HTMLElement | null {
  if (typeof document === "undefined") return null;

  // Search for open dialogs or modals
  const dialog = document.querySelector<HTMLElement>(
    '[role="dialog"]:not([aria-hidden="true"]), [aria-modal="true"]:not([aria-hidden="true"])'
  );
  if (dialog && isElementVisible(dialog)) {
    return dialog;
  }

  // Check for open category drawer or modal overlay
  const drawer = document.querySelector<HTMLElement>('[data-drawer-open="true"]');
  if (drawer && isElementVisible(drawer)) {
    return drawer;
  }

  return null;
}

/**
 * Retrieves all eligible focusable candidate elements in the current scope.
 */
export function getFocusableElements(rootContainer?: HTMLElement | null): HTMLElement[] {
  const scope = rootContainer || getActiveModalContainer() || document.body;
  if (!scope) return [];

  const rawElements = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return rawElements.filter((el) => isElementVisible(el));
}

/**
 * Finds an ancestor element that is horizontally scrollable.
 */
export function findHorizontalScrollContainer(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflowX = style.overflowX;
    if (
      (overflowX === "auto" || overflowX === "scroll") &&
      parent.scrollWidth > parent.clientWidth + 10
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

/**
 * Smoothly centers and scrolls an element into view.
 */
export function focusAndScrollIntoView(el: HTMLElement) {
  if (!el || typeof window === "undefined") return;

  // 1. Mark element with TV focus attribute
  document.querySelectorAll('[data-tv-focused="true"]').forEach((prev) => {
    if (prev !== el) prev.removeAttribute("data-tv-focused");
  });
  el.setAttribute("data-tv-focused", "true");

  // 2. Focus element without harsh browser jump-scroll
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }

  // 3. Center inside horizontal scroll container (e.g. MovieRow, Hero Thumbnails)
  const scrollContainer = findHorizontalScrollContainer(el);
  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const currentScroll = scrollContainer.scrollLeft;

    // Check if element is near or outside the visible horizontal window of container
    const isOffLeft = elRect.left < containerRect.left + 20;
    const isOffRight = elRect.right > containerRect.right - 20;

    if (isOffLeft || isOffRight) {
      const offsetInContainer = el.offsetLeft;
      const targetScroll = offsetInContainer - containerRect.width / 2 + elRect.width / 2;
      scrollContainer.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }
  } else {
    // Normal scroll into view if outside viewport horizontally
    const rect = el.getBoundingClientRect();
    if (rect.left < 0 || rect.right > window.innerWidth) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }

  // 4. Smooth vertical viewport adjustment (ensuring comfortable 10-foot TV viewing)
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const targetVerticalRatio = 0.42; // place focused element comfortably near upper-center

  if (rect.top < 90 || rect.bottom > vh - 90) {
    const desiredTop = vh * targetVerticalRatio;
    const deltaY = rect.top - desiredTop;
    window.scrollBy({
      top: deltaY,
      behavior: "smooth",
    });
  }
}

/**
 * 2D Geometry Distance Metric:
 * Calculates directional candidate score between currently focused element and candidate.
 * Lower score = better match.
 */
export function calculateSpatialDistance(
  currentRect: DOMRect,
  candRect: DOMRect,
  direction: Direction,
  isSameRow: boolean
): number {
  const curCenterX = currentRect.left + currentRect.width / 2;
  const curCenterY = currentRect.top + currentRect.height / 2;
  const candCenterX = candRect.left + candRect.width / 2;
  const candCenterY = candRect.top + candRect.height / 2;

  let primaryDist = 0;
  let secondaryDist = 0;
  let overlap = 0;

  switch (direction) {
    case "right": {
      // Must be to the right
      if (candCenterX <= curCenterX + 2) return Infinity;
      primaryDist = Math.max(0, candRect.left - currentRect.right);
      secondaryDist = Math.abs(candCenterY - curCenterY);
      overlap = Math.max(
        0,
        Math.min(currentRect.bottom, candRect.bottom) - Math.max(currentRect.top, candRect.top)
      );
      break;
    }
    case "left": {
      // Must be to the left
      if (candCenterX >= curCenterX - 2) return Infinity;
      primaryDist = Math.max(0, currentRect.left - candRect.right);
      secondaryDist = Math.abs(candCenterY - curCenterY);
      overlap = Math.max(
        0,
        Math.min(currentRect.bottom, candRect.bottom) - Math.max(currentRect.top, candRect.top)
      );
      break;
    }
    case "down": {
      // Must be below
      if (candCenterY <= curCenterY + 2) return Infinity;
      primaryDist = Math.max(0, candRect.top - currentRect.bottom);
      secondaryDist = Math.abs(candCenterX - curCenterX);
      overlap = Math.max(
        0,
        Math.min(currentRect.right, candRect.right) - Math.max(currentRect.left, candRect.left)
      );
      break;
    }
    case "up": {
      // Must be above
      if (candCenterY >= curCenterY - 2) return Infinity;
      primaryDist = Math.max(0, currentRect.top - candRect.bottom);
      secondaryDist = Math.abs(candCenterX - curCenterX);
      overlap = Math.max(
        0,
        Math.min(currentRect.right, candRect.right) - Math.max(currentRect.left, candRect.left)
      );
      break;
    }
  }

  // Weightings:
  // Primary axis distance has higher weight to maintain direction.
  // Overlap bonus prioritizes items squarely aligned in the same lane/row.
  const isHorizontal = direction === "left" || direction === "right";
  const primaryWeight = isHorizontal ? 2.5 : 2.0;
  const secondaryWeight = 1.0;

  let score = primaryDist * primaryWeight + secondaryDist * secondaryWeight;

  if (overlap > 0) {
    score -= isHorizontal ? 80 : 50;
  }

  if (isSameRow && isHorizontal) {
    score -= 100; // Strong preference for next item in the same carousel/row
  }

  return score;
}

/**
 * Finds the best adjacent element in the given direction from current active element.
 */
export function findNextSpatialElement(
  currentEl: HTMLElement,
  direction: Direction
): HTMLElement | null {
  const modalScope = getActiveModalContainer();
  const candidates = getFocusableElements(modalScope);
  if (candidates.length <= 1) return null;

  const currentRect = currentEl.getBoundingClientRect();
  const currentScrollContainer = findHorizontalScrollContainer(currentEl);

  let bestCandidate: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const cand of candidates) {
    if (cand === currentEl) continue;

    const candRect = cand.getBoundingClientRect();
    const isSameContainer =
      currentScrollContainer !== null &&
      findHorizontalScrollContainer(cand) === currentScrollContainer;

    const score = calculateSpatialDistance(currentRect, candRect, direction, isSameContainer);

    if (score < bestScore) {
      bestScore = score;
      bestCandidate = cand;
    }
  }

  // Fallback for vertical navigation if dead-ended due to strict column alignment:
  // Find the closest candidate strictly above or below regardless of X overlap.
  if (!bestCandidate && (direction === "up" || direction === "down")) {
    let nearestDist = Infinity;
    for (const cand of candidates) {
      if (cand === currentEl) continue;
      const candRect = cand.getBoundingClientRect();
      const isBelow = direction === "down" && candRect.top >= currentRect.bottom - 5;
      const isAbove = direction === "up" && candRect.bottom <= currentRect.top + 5;

      if (isBelow || isAbove) {
        const dist = Math.hypot(
          candRect.left + candRect.width / 2 - (currentRect.left + currentRect.width / 2),
          candRect.top + candRect.height / 2 - (currentRect.top + currentRect.height / 2)
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          bestCandidate = cand;
        }
      }
    }
  }

  return bestCandidate;
}

/**
 * Finds and focuses the primary initial interactive element on page/view load.
 */
export function focusInitialInteractiveElement(): boolean {
  if (typeof document === "undefined") return false;

  const modal = getActiveModalContainer();
  if (modal) {
    const modalInitial = modal.querySelector<HTMLElement>(
      '[data-tv-initial="true"], button:not([disabled]):not([aria-label*="close" i]), a[href]'
    );
    if (modalInitial && isElementVisible(modalInitial)) {
      focusAndScrollIntoView(modalInitial);
      return true;
    }
  }

  // 1. Explicit priority element: data-tv-initial="true"
  const explicitInitial = document.querySelector<HTMLElement>(
    '[data-tv-initial="true"]:not([disabled])'
  );
  if (explicitInitial && isElementVisible(explicitInitial)) {
    focusAndScrollIntoView(explicitInitial);
    return true;
  }

  // 2. Primary Hero "Watch now" or primary cinema button
  const heroPrimary = document.querySelector<HTMLElement>(
    'a[href*="/watch/"]:not([tabindex="-1"]), main a.cinema-btn-primary, main button.cinema-btn-primary'
  );
  if (heroPrimary && isElementVisible(heroPrimary)) {
    focusAndScrollIntoView(heroPrimary);
    return true;
  }

  // 3. First movie card or first interactive link in main content
  const firstMainLink = document.querySelector<HTMLElement>(
    'main [data-tv-card="true"], main a[href]:not([href="#"]):not(.sr-only)'
  );
  if (firstMainLink && isElementVisible(firstMainLink)) {
    focusAndScrollIntoView(firstMainLink);
    return true;
  }

  // 4. Header Navigation Links (e.g. Home, Movies)
  const navLink = document.querySelector<HTMLElement>(
    'header nav a[aria-current="page"], header nav a[href="/"], header nav a[href]'
  );
  if (navLink && isElementVisible(navLink)) {
    focusAndScrollIntoView(navLink);
    return true;
  }

  return false;
}

/**
 * Handles the Smart TV Remote "Back" button:
 * - Closes modals/dialogs
 * - Unfocuses active inputs
 * - Closes dropdowns/drawers
 * - Goes back in history or scrolls to top
 */
export function handleSmartTvBack(router: { back: () => void }): boolean {
  if (typeof document === "undefined") return false;

  // 1. Check if a modal/dialog is open
  const openModal = getActiveModalContainer();
  if (openModal) {
    const closeBtn = openModal.querySelector<HTMLElement>(
      'button[aria-label*="close" i], button[title*="close" i], button .lucide-x, [data-close="true"]'
    )?.closest("button") || openModal.querySelector<HTMLElement>('button[aria-label*="close" i]');

    if (closeBtn) {
      closeBtn.click();
      return true;
    }
    // Attempt clicking backdrop if accessible
    if (openModal.parentElement && typeof openModal.parentElement.click === "function") {
      openModal.parentElement.click();
      return true;
    }
  }

  // 2. If an input or textarea is active, blur it
  const active = document.activeElement as HTMLElement | null;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
    active.blur();
    return true;
  }

  // 3. Dispatch global custom event for custom components (e.g. video player or drawer)
  const customEvent = new CustomEvent("nightcast:tv-back", { cancelable: true });
  window.dispatchEvent(customEvent);
  if (customEvent.defaultPrevented) {
    return true;
  }

  // 4. Navigate back in history if not on home root
  if (typeof window !== "undefined") {
    if (window.location.pathname !== "/" && window.history.length > 1) {
      router.back();
      return true;
    }
    // If on home root and scrolled down, smoothly scroll to top
    if (window.scrollY > 40) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    }
  }

  return false;
}
