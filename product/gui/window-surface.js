let windowsInitialized = false;
let dragState = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setRect(windowEl, rect) {
  windowEl.style.left = `${rect.left}px`;
  windowEl.style.top = `${rect.top}px`;
  windowEl.style.width = `${rect.width}px`;
  windowEl.style.height = `${rect.height}px`;
}

function clampWindowToShell(shell, windowEl) {
  const shellRect = shell.getBoundingClientRect();
  const windowRect = windowEl.getBoundingClientRect();
  const width = clamp(windowRect.width, 280, shellRect.width - 24);
  const height = clamp(windowRect.height, 220, shellRect.height - 88);
  const left = clamp(windowRect.left - shellRect.left, 12, shellRect.width - width - 12);
  const top = clamp(windowRect.top - shellRect.top, 64, shellRect.height - height - 12);
  setRect(windowEl, { left, top, width, height });
}

function initializeWindows(shell) {
  if (windowsInitialized) return;
  windowsInitialized = true;

  const inspector = shell.querySelector('[data-floating-window="inspector"]');
  const documents = shell.querySelector('[data-floating-window="documents"]');
  if (!inspector || !documents) return;

  const shellRect = shell.getBoundingClientRect();
  const inspectorWidth = Math.min(410, shellRect.width - 48);
  const inspectorHeight = Math.min(Math.max(360, shellRect.height * 0.68), shellRect.height - 100);
  const documentsWidth = Math.min(760, shellRect.width - 48);
  const documentsHeight = Math.min(Math.max(280, shellRect.height * 0.42), shellRect.height - 110);

  setRect(inspector, {
    left: Math.max(12, shellRect.width - inspectorWidth - 18),
    top: 72,
    width: inspectorWidth,
    height: inspectorHeight,
  });

  setRect(documents, {
    left: Math.max(12, (shellRect.width - documentsWidth) / 2),
    top: Math.max(88, shellRect.height - documentsHeight - 18),
    width: documentsWidth,
    height: documentsHeight,
  });

  window.addEventListener('resize', () => {
    clampWindowToShell(shell, inspector);
    clampWindowToShell(shell, documents);
  });
}

document.addEventListener('mousedown', (event) => {
  const shell = document.querySelector('.app-shell');
  if (!shell) return;
  initializeWindows(shell);

  const dragHandle = event.target.closest('[data-window-drag]');
  if (!dragHandle || event.button !== 0) return;

  const windowEl = dragHandle.closest('[data-floating-window]');
  if (!windowEl) return;

  const shellRect = shell.getBoundingClientRect();
  const windowRect = windowEl.getBoundingClientRect();

  dragState = {
    shell,
    windowEl,
    startX: event.clientX,
    startY: event.clientY,
    left: windowRect.left - shellRect.left,
    top: windowRect.top - shellRect.top,
  };

  windowEl.classList.add('dragging');
  event.preventDefault();
});

document.addEventListener('mousemove', (event) => {
  if (!dragState) return;

  const shellRect = dragState.shell.getBoundingClientRect();
  const windowRect = dragState.windowEl.getBoundingClientRect();
  const nextLeft = dragState.left + (event.clientX - dragState.startX);
  const nextTop = dragState.top + (event.clientY - dragState.startY);
  const left = clamp(nextLeft, 12, shellRect.width - windowRect.width - 12);
  const top = clamp(nextTop, 64, shellRect.height - windowRect.height - 12);

  dragState.windowEl.style.left = `${left}px`;
  dragState.windowEl.style.top = `${top}px`;
});

document.addEventListener('mouseup', () => {
  if (!dragState) return;
  dragState.windowEl.classList.remove('dragging');
  dragState = null;
});

requestAnimationFrame(() => {
  const shell = document.querySelector('.app-shell');
  if (shell) initializeWindows(shell);
});
