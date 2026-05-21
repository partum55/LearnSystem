export const WIDGET_IFRAME_MIN_HEIGHT = 200;
export const WIDGET_IFRAME_MAX_HEIGHT = 1200;
export const WIDGET_IFRAME_DEFAULT_HEIGHT = 400;

const AUTO_RESIZE_SCRIPT_MARKER = 'data-lms-widget-autoresize';

const AUTO_RESIZE_SCRIPT = `<script ${AUTO_RESIZE_SCRIPT_MARKER}>
(function () {
  const postHeight = () => {
    const doc = document.documentElement;
    const body = document.body;
    const height = Math.max(
      doc ? doc.scrollHeight : 0,
      doc ? doc.offsetHeight : 0,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0
    );
    window.parent?.postMessage({ type: 'resize', height }, '*');
  };

  const requestPost = () => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(postHeight);
      return;
    }
    postHeight();
  };

  window.addEventListener('load', () => {
    postHeight();
    setTimeout(postHeight, 50);
    setTimeout(postHeight, 300);
  });
  window.addEventListener('resize', requestPost);

  if (typeof ResizeObserver !== 'undefined' && document.documentElement) {
    const observer = new ResizeObserver(requestPost);
    observer.observe(document.documentElement);
  }

  if (typeof MutationObserver !== 'undefined' && document.documentElement) {
    const mutationObserver = new MutationObserver(requestPost);
    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }

  requestPost();
})();
</script>`;

export const clampWidgetIframeHeight = (height: number): number => {
  return Math.min(Math.max(height, WIDGET_IFRAME_MIN_HEIGHT), WIDGET_IFRAME_MAX_HEIGHT);
};

export const withWidgetAutoResize = (html: string): string => {
  if (!html || !html.trim()) return html;
  if (html.includes(AUTO_RESIZE_SCRIPT_MARKER)) return html;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${AUTO_RESIZE_SCRIPT}</body>`);
  }

  return `${html}\n${AUTO_RESIZE_SCRIPT}`;
};
