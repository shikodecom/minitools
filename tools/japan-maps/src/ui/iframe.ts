export function setupIframeHeightMessaging(): void {
  if (window.parent === window) return;
  let lastHeight = 0;
  const sendHeight = () => {
    const height = Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
    if (height === lastHeight) return;
    lastHeight = height;
    window.parent.postMessage({ type: 'japan-maps-height', height }, 'https://www.shikode.com');
  };
  const observer = new ResizeObserver(sendHeight);
  observer.observe(document.documentElement);
  observer.observe(document.body);
  window.addEventListener('resize', sendHeight);
  requestAnimationFrame(sendHeight);
}
