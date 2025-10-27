// A utility function to calculate the pixel coordinates of the caret in a text input or textarea.
// This is a simplified version of libraries like `textarea-caret`.

// The properties that we copy into a mirrored div.
const properties = [
  'box-sizing',
  'width', 'height',
  'overflow-x', 'overflow-y',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'font-family', 'font-size', 'font-weight', 'font-style',
  'line-height', 'letter-spacing', 'word-spacing',
  'text-align', 'text-transform', 'text-indent', 'text-decoration',
  'white-space', 'word-wrap'
];

let is_firefox: boolean | undefined;

function isFirefox() {
  if (is_firefox === undefined) {
    is_firefox = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox');
  }
  return is_firefox;
}

export default function getCaretCoordinates(element: HTMLInputElement | HTMLTextAreaElement, position: number) {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(element);

  // Copy styles
  style.whiteSpace = 'pre-wrap';
  if (element.nodeName !== 'INPUT') {
    style.wordWrap = 'break-word'; // only for textarea
  }
  
  style.position = 'absolute';
  style.visibility = 'hidden';

  properties.forEach(prop => {
    style[prop as any] = computed[prop as any];
  });
  
  if (isFirefox()) {
    // Firefox lies about box-sizing, so we need to fix it.
    if (element.scrollHeight > parseInt(computed.height)) {
        style.overflowY = 'scroll';
    }
  } else {
    style.overflow = 'hidden'; // for Chrome to not show scrollbars
  }

  div.textContent = element.value.substring(0, position);
  
  const span = document.createElement('span');
  // Wrapping character in a span that we can measure.
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + parseInt(computed['borderTopWidth']),
    left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
    height: parseInt(computed['lineHeight'])
  };

  document.body.removeChild(div);

  return coordinates;
}