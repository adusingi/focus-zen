/**
 * Caret helpers for the one-line text fields of the list. ↑ and ↓ move to
 * the line above or below only when the caret is on the first or last
 * visual line of a field, so a long wrapped item can still be edited with
 * the arrow keys.
 */

export function placeCaretAtEnd(element) {
  element.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** The box of the caret in `element`, or null when there is no caret there or it has no box. */
function caretBox(element) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!element.contains(range.startContainer)) return null;

  const box = range.getBoundingClientRect();
  if (box.height) return box;

  // A collapsed caret often has no box: at the edge of a text node, or when it
  // sits between child nodes (as after `placeCaretAtEnd`). Measure the
  // character next to the caret instead.
  const position = textPosition(range.startContainer, range.startOffset);
  if (!position) return null;

  const { node, offset } = position;
  const probe = document.createRange();
  const start = Math.min(offset, node.length - 1);
  probe.setStart(node, start);
  probe.setEnd(node, start + 1);
  const probeBox = probe.getBoundingClientRect();
  return probeBox.height ? probeBox : null;
}

/** The same caret position as a non-empty text node and an offset in it, or null. */
function textPosition(container, offset) {
  if (container.nodeType === Node.TEXT_NODE) {
    return container.length ? { node: container, offset } : null;
  }

  // Between child nodes: use the end of the text before the caret, or else the
  // start of the text after it.
  const before = lastText(container.childNodes[offset - 1]);
  if (before) return { node: before, offset: before.length };

  const after = firstText(container.childNodes[offset]);
  return after ? { node: after, offset: 0 } : null;
}

function lastText(node) {
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) return node.length ? node : null;
  for (let child = node.lastChild; child; child = child.previousSibling) {
    const found = lastText(child);
    if (found) return found;
  }
  return null;
}

function firstText(node) {
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) return node.length ? node : null;
  for (let child = node.firstChild; child; child = child.nextSibling) {
    const found = firstText(child);
    if (found) return found;
  }
  return null;
}

/** Which visual line the caret is on, and how many lines the field has. */
function caretLine(element) {
  const box = caretBox(element);
  if (!box) return null;

  const field = element.getBoundingClientRect();
  const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
  const lines = Math.max(1, Math.round(field.height / lineHeight));
  const middle = box.top + box.height / 2 - field.top;
  const line = Math.min(lines - 1, Math.max(0, Math.floor(middle / lineHeight)));
  return { line, lines };
}

/** True when ↑ should leave the field. An empty field, or one we cannot measure, counts as one line. */
export function caretOnFirstLine(element) {
  const position = caretLine(element);
  if (position) return position.line === 0;
  return window.getSelection()?.isCollapsed ?? true;
}

/** True when ↓ should leave the field. */
export function caretOnLastLine(element) {
  const position = caretLine(element);
  if (position) return position.line === position.lines - 1;
  return window.getSelection()?.isCollapsed ?? true;
}
