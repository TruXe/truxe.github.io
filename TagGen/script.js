/**
 * GitHub Badge Generator
 * Generates Shields.io-style SVG badges with live preview and Markdown output.
 */

(function () {
  'use strict';

  // --- Constants ---
  const BADGE_HEIGHT = 22;
  const BADGE_RADIUS = 4;
  const PADDING_X = 10;
  const ICON_SIZE = 14;
  const ICON_GAP = 6;
  const FONT_SIZE = 11;
  const FONT_FAMILY = 'DejaVu Sans,Verdana,Geneva,sans-serif';

  // Simple SVG icons (path d for 14x14 viewBox)
  const ICONS = {
    windows: '<path fill="currentColor" d="M0 3.5L6 2.8v4.4L0 7.7V3.5zm6 5.8l6-.8v4.4l-6 .7v-4.3zm-6 2.2l6-.7v4.5L0 14v-4.5zM13 2L7 2.8v4.4l6-.9V2zm0 6.5l-6 .8v4.3l6-.7V8.5z"/>',
    linux: '<path fill="currentColor" d="M7 2c-.5 0-1 .2-1.4.5L4.3 4.5C3.5 4.2 2.7 4 2 4c-1.1 0-2 .9-2 2s.9 2 2 2c.7 0 1.3-.2 1.8-.5l1.2 1.5c-.4.3-.8.5-1.3.5v2h1v-2c.5 0 .9-.2 1.3-.5l1.2 1.5c.5.3 1.1.5 1.8.5 1.1 0 2-.9 2-2s-.9-2-2-2c-.7 0-1.3.2-1.8.5L9.3 5.5c.4-.3.8-.5 1.3-.5V3h-1V2zm-4 4.5c.8 0 1.5.7 1.5 1.5S3.8 9.5 3 9.5 1.5 8.8 1.5 8s.7-1.5 1.5-1.5zm6 0c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5.7-1.5 1.5-1.5z"/>',
    macos: '<path fill="currentColor" d="M11.5 2H9.2L7 5.5 4.8 2H2.5L5.2 7 2 12h2.3l2.2-3.5L8.7 12h2.3L8 7l3.5-5zM2 14h10v1.5H2V14z"/>',
    github: '<path fill="currentColor" d="M7 1C3.7 1 1 3.7 1 7c0 2.7 1.7 4.9 4.1 5.8.3.1.4-.1.4-.3v-1c-1.7.4-2-1-2-1-.3-.7-.7-1-.7-1--.5-.4.1-.3.1-.3.6.1 1 .5 1 .5.5.8 1.3.6 1.6.5 0-.3.2-.5.4-.6-1.5-.2-3-.7-3-3.2 0-.7.3-1.3.6-1.8-.1-.2-.3-1 .1-1.9 0 0 .5-.2 1.6.7.5-.1 1-.2 1.5-.2s1 .1 1.5.2c1.1-.9 1.6-.7 1.6-.7.4.9.2 1.7.1 1.9.4.5.6 1.1.6 1.8 0 2.5-1.5 3-3 3.2.2.2.4.6.4 1.1v1.6c0 .2.1.4.4.3C12.3 11.9 14 9.7 14 7c0-3.3-2.7-6-6-6z"/>',
    docker: '<path fill="currentColor" d="M12 5.5H9.5V4H12v1.5zM8.5 5.5H6V4h2.5v1.5zM12 8H9.5V6.5H12V8zM8.5 8H6V6.5h2.5V8zM4.5 5.5H2V4h2.5v1.5zM4.5 8H2V6.5h2.5V8zM8.5 9.5H6V8h2.5v1.5zM12 9.5H9.5V8H12v1.5zM8.5 11H6v-1.5h2.5V11zM4.5 11H2v-1.5h2.5V11zM9.5 11H12v-1.5H9.5V11zM1 2h13v10H1V2z"/>',
    node: '<path fill="currentColor" d="M7 2L4 4v6l3 2 3-2V4L7 2zm.5 8.5L5.5 9.5V6l2 1.5 2-1.5v3.5l-2 1.5z"/>'
  };

  // --- DOM refs (set in init) ---
  let labelInput, statusInput, labelColor, statusColor, labelColorHex, statusColorHex, iconSelect;
  let previewContainer, svgOutput, mdOutput, mdImgOutput, urlOutput, rawLinkOutput, rawGithubUrlOutput;
  let currentDataUri = '';
  let currentRawGithubUrl = '';

  /**
   * Normalize hex color to #rrggbb (expand shorthand, lowercase).
   */
  function normalizeColor(hex) {
    if (!hex || typeof hex !== 'string') return '#555555';
    hex = hex.trim().replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) return '#555555';
    return '#' + hex.toLowerCase();
  }

  /**
   * Measure text width in SVG (approximate with character count * avg width).
   */
  function measureText(text) {
    if (!text) return 0;
    const avgCharWidth = 6.2;
    return Math.ceil(text.length * avgCharWidth);
  }

  /**
   * Build the badge SVG string (Shields.io style: two rounded halves).
   */
  function generateSVG(options) {
    const label = String(options.label || 'badge').trim() || 'badge';
    const status = String(options.status || 'passing').trim() || 'passing';
    const labelColor = normalizeColor(options.labelColor || '#555555');
    const statusColor = normalizeColor(options.statusColor || '#4c1');
    const icon = options.icon || 'none';

    const hasIcon = icon !== 'none' && ICONS[icon];
    const iconWidth = hasIcon ? ICON_SIZE + ICON_GAP : 0;
    const labelTextWidth = measureText(label);
    const statusTextWidth = measureText(status);

    const labelPartWidth = PADDING_X * 2 + labelTextWidth + iconWidth;
    const statusPartWidth = PADDING_X * 2 + statusTextWidth;
    const totalWidth = labelPartWidth + statusPartWidth;
    const r = BADGE_RADIUS;
    const h = BADGE_HEIGHT;

    // Left path (label): rounded on left only
    const leftPath = `M ${r} 0 L ${labelPartWidth} 0 L ${labelPartWidth} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
    // Right path (status): rounded on right only
    const rightPath = `M ${labelPartWidth} 0 L ${totalWidth - r} 0 Q ${totalWidth} 0 ${totalWidth} ${r} L ${totalWidth} ${h - r} Q ${totalWidth} ${h} ${totalWidth - r} ${h} L ${labelPartWidth} ${h} Z`;

    const iconSvg = hasIcon
      ? `<g transform="translate(${PADDING_X},${(h - ICON_SIZE) / 2})" fill="#fff">${ICONS[icon]}</g>`
      : '';

    const labelTextX = hasIcon ? PADDING_X + ICON_SIZE + ICON_GAP + labelTextWidth / 2 : PADDING_X + labelTextWidth / 2;
    const statusTextX = labelPartWidth + statusPartWidth / 2;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${h}" viewBox="0 0 ${totalWidth} ${h}">
  <path fill="${labelColor}" d="${leftPath}"/>
  <path fill="${statusColor}" d="${rightPath}"/>
  ${iconSvg}
  <g fill="#fff" font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}" font-weight="bold">
    <text x="${labelTextX}" y="${h / 2 + 4}" text-anchor="middle">${escapeXml(label)}</text>
    <text x="${statusTextX}" y="${h / 2 + 4}" text-anchor="middle">${escapeXml(status)}</text>
  </g>
</svg>`;

    return svg;
  }

  function escapeXml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Encode SVG for use in data URI (percent-encode for URL safety in Markdown).
   */
  function encodeSVG(svgString) {
    return encodeURIComponent(svgString)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22')
      .replace(/%20/g, '+');
  }

  /**
   * Update the live preview and all output blocks.
   */
  function updatePreview() {
    const label = labelInput.value.trim() || 'badge';
    const status = statusInput.value.trim() || 'passing';
    const labelColorVal = labelColor.value || '#555555';
    const statusColorVal = statusColor.value || '#4c1';
    const icon = iconSelect.value;

    const svg = generateSVG({
      label,
      status,
      labelColor: labelColorVal,
      statusColor: statusColorVal,
      icon
    });

    // Live preview: inject SVG
    previewContainer.innerHTML = svg;

    // Keep hex inputs in sync
    labelColorHex.value = normalizeColor(labelColorVal);
    statusColorHex.value = normalizeColor(statusColorVal);

    // Outputs
    const encoded = encodeSVG(svg);
    const dataUri = 'data:image/svg+xml;utf8,' + encoded;
    currentDataUri = dataUri;

    svgOutput.querySelector('code').textContent = svg;
    mdOutput.querySelector('code').textContent = `![${label} ${status}](${dataUri})`;
    mdImgOutput.querySelector('code').textContent = `<img src="${dataUri}" alt="${escapeXml(label + ' ' + status)}" />`;

    // Raw image link for README (show truncated in UI, full value on copy)
    if (rawLinkOutput) {
      const display = dataUri.length > 120 ? dataUri.slice(0, 120) + '...' : dataUri;
      rawLinkOutput.querySelector('code').textContent = display;
    }

    // Raw GitHub URL template (user adds SVG to their repo, then uses this URL)
    const badgeFileName = `badge-${label}-${status}.svg`.replace(/\s+/g, '-').toLowerCase();
    const repoMatch = window.location.hostname.match(/^([a-zA-Z0-9-]+)\.github\.io$/);
    const userOrOrg = repoMatch ? repoMatch[1] : 'USER';
    const repoName = userOrOrg + '.github.io';
    const branch = 'main';
    currentRawGithubUrl = `https://raw.githubusercontent.com/${userOrOrg}/${repoName}/${branch}/badges/${badgeFileName}`;
    if (rawGithubUrlOutput) {
      rawGithubUrlOutput.querySelector('code').textContent = currentRawGithubUrl;
    }

    // Share URL
    const params = new URLSearchParams();
    params.set('label', label);
    params.set('status', status);
    params.set('color1', (labelColorVal || '').replace(/^#/, ''));
    params.set('color2', (statusColorVal || '').replace(/^#/, ''));
    if (icon && icon !== 'none') params.set('icon', icon);
    const shareUrl = window.location.origin + window.location.pathname + '?' + params.toString();
    urlOutput.querySelector('code').textContent = shareUrl;

    updateShareUrl(shareUrl);
  }

  let shareUrl = '';

  function updateShareUrl(url) {
    shareUrl = url;
  }

  /**
   * Copy text to clipboard; show brief feedback on button.
   */
  function copyToClipboard(text, buttonEl) {
    if (!text) return;
    const btn = buttonEl || document.activeElement;
    navigator.clipboard.writeText(text).then(
      function () {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        btn.disabled = true;
        setTimeout(function () {
          btn.textContent = orig;
          btn.disabled = false;
        }, 1500);
      },
      function () {
        if (btn) btn.textContent = 'Copy failed';
      }
    );
  }

  /**
   * Download the current badge as .svg file.
   */
  function downloadSVG() {
    const label = labelInput.value.trim() || 'badge';
    const status = statusInput.value.trim() || 'passing';
    const svg = generateSVG({
      label,
      status,
      labelColor: labelColor.value,
      statusColor: statusColor.value,
      icon: iconSelect.value
    });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `badge-${label}-${status}.svg`.replace(/\s+/g, '-');
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /**
   * Apply URL params to form and refresh.
   */
  function applyUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const label = params.get('label');
    const status = params.get('status');
    const color1 = params.get('color1');
    const color2 = params.get('color2');
    const icon = params.get('icon');

    if (label != null) labelInput.value = label;
    if (status != null) statusInput.value = status;
    if (color1) {
      const c = color1.startsWith('#') ? color1 : '#' + color1;
      labelColor.value = c;
      labelColorHex.value = normalizeColor(c);
    }
    if (color2) {
      const c = color2.startsWith('#') ? color2 : '#' + color2;
      statusColor.value = c;
      statusColorHex.value = normalizeColor(c);
    }
    if (icon && iconSelect.querySelector(`option[value="${icon}"]`)) {
      iconSelect.value = icon;
    }
    updatePreview();
  }

  /**
   * Sync color picker and hex input (both directions).
   */
  function bindColorSync() {
    function syncToHex(picker, hexInput) {
      hexInput.value = normalizeColor(picker.value);
      updatePreview();
    }
    function syncToPicker(hexInput, picker) {
      const normalized = normalizeColor(hexInput.value);
      hexInput.value = normalized;
      if (/^#[0-9a-f]{6}$/i.test(normalized)) {
        picker.value = normalized;
      }
      updatePreview();
    }

    labelColor.addEventListener('input', function () {
      syncToHex(labelColor, labelColorHex);
    });
    statusColor.addEventListener('input', function () {
      syncToHex(statusColor, statusColorHex);
    });
    labelColorHex.addEventListener('change', function () {
      syncToPicker(labelColorHex, labelColor);
    });
    labelColorHex.addEventListener('input', function () {
      syncToPicker(labelColorHex, labelColor);
    });
    statusColorHex.addEventListener('change', function () {
      syncToPicker(statusColorHex, statusColor);
    });
    statusColorHex.addEventListener('input', function () {
      syncToPicker(statusColorHex, statusColor);
    });
  }

  /**
   * Theme toggle (dark/light).
   */
  function initTheme() {
    const stored = localStorage.getItem('github-badge-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.textContent = theme === 'dark' ? 'Light' : 'Dark';
      themeBtn.addEventListener('click', function () {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? '' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('github-badge-theme', next === 'dark' ? 'dark' : 'light');
        themeBtn.textContent = next === 'dark' ? 'Light' : 'Dark';
      });
    }
  }

  /**
   * Initialize DOM refs, bind inputs, URL params, and buttons.
   */
  function init() {
    labelInput = document.getElementById('label-input');
    statusInput = document.getElementById('status-input');
    labelColor = document.getElementById('label-color');
    statusColor = document.getElementById('status-color');
    labelColorHex = document.getElementById('label-color-hex');
    statusColorHex = document.getElementById('status-color-hex');
    iconSelect = document.getElementById('icon-select');
    previewContainer = document.getElementById('preview-container');
    svgOutput = document.getElementById('svg-output');
    mdOutput = document.getElementById('md-output');
    mdImgOutput = document.getElementById('md-img-output');
    urlOutput = document.getElementById('url-output');
    rawLinkOutput = document.getElementById('raw-link-output');
    rawGithubUrlOutput = document.getElementById('raw-github-url-output');

    ['input', 'change'].forEach(function (ev) {
      labelInput.addEventListener(ev, updatePreview);
      statusInput.addEventListener(ev, updatePreview);
      iconSelect.addEventListener(ev, updatePreview);
    });

    bindColorSync();
    initTheme();
    applyUrlParams();

    document.getElementById('copy-raw-link-btn').addEventListener('click', function () {
      copyToClipboard(currentDataUri, this);
    });
    var copyRawLinkInline = document.getElementById('copy-raw-link-inline');
    if (copyRawLinkInline) copyRawLinkInline.addEventListener('click', function () {
      copyToClipboard(currentDataUri, this);
    });
    var copyRawGithubUrlBtn = document.getElementById('copy-raw-github-url-btn');
    if (copyRawGithubUrlBtn) copyRawGithubUrlBtn.addEventListener('click', function () {
      copyToClipboard(currentRawGithubUrl || (rawGithubUrlOutput && rawGithubUrlOutput.querySelector('code').textContent), this);
    });
    document.getElementById('copy-svg-btn').addEventListener('click', function () {
      copyToClipboard(svgOutput.querySelector('code').textContent, this);
    });
    document.getElementById('copy-md-btn').addEventListener('click', function () {
      copyToClipboard(mdOutput.querySelector('code').textContent, this);
    });
    document.getElementById('copy-svg-inline').addEventListener('click', function () {
      copyToClipboard(svgOutput.querySelector('code').textContent, this);
    });
    document.getElementById('copy-md-inline').addEventListener('click', function () {
      copyToClipboard(mdOutput.querySelector('code').textContent, this);
    });
    document.getElementById('copy-md-img-inline').addEventListener('click', function () {
      copyToClipboard(mdImgOutput.querySelector('code').textContent, this);
    });
    document.getElementById('copy-url-btn').addEventListener('click', function () {
      copyToClipboard(shareUrl || urlOutput.querySelector('code').textContent, this);
    });
    document.getElementById('download-svg-btn').addEventListener('click', downloadSVG);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
