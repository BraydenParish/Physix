export const createOverlay = (): HTMLDivElement => {
  const overlay = document.createElement('div');
  overlay.id = 'overlay';
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.background = 'rgba(0, 0, 0, 0.5)';
  overlay.style.color = '#fff';
  overlay.style.fontSize = '16px';
  overlay.style.cursor = 'pointer';
  overlay.textContent = 'Click to start (Esc to release mouse)';
  return overlay;
};
