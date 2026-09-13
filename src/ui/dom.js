import { hasSprite } from '../data/sprites.js';

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'style') node.setAttribute('style', value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function bar(ratio, { className = '', label = '' } = {}) {
  const fill = el('div', { class: `bar-fill ${className}`, style: `width:${Math.max(0, Math.min(1, ratio)) * 100}%` });
  const text = el('span', { class: 'bar-label', text: label });
  const wrap = el('div', { class: 'bar' }, [fill, text]);
  wrap.setFill = (r, l) => {
    fill.style.width = `${Math.max(0, Math.min(1, r)) * 100}%`;
    if (l != null) text.textContent = l;
  };
  /** Toggle a CSS state on the fill without the caller reaching inside. */
  wrap.setState = (name, active) => fill.classList.toggle(name, !!active);
  wrap.setCritical = (active) => wrap.setState('critical', active);
  /** Replay a one-shot animation: removing and re-adding the class restarts it. */
  wrap.flash = (name) => {
    fill.classList.remove(name);
    void fill.offsetWidth; // forces the style recalc that makes the restart stick
    fill.classList.add(name);
  };
  return wrap;
}

/**
 * A label/value list that is built once and written into, not rebuilt.
 *
 * `replaceChildren` on a list of key/value rows reads well and was most of what
 * the character page did: three of these, twenty-odd rows between them, torn
 * down and recreated ten times a second for values that change once a minute.
 * Pass `[[label, value], ...]` to `set`; only the text that actually differs is
 * touched, and the DOM is only rebuilt if the number of rows changes.
 */
export function kvList({ class: cls = 'derived' } = {}) {
  const node = el('div', { class: cls });
  const keys = [];
  const values = [];

  node.set = (rows) => {
    if (rows.length !== keys.length) {
      keys.length = 0;
      values.length = 0;
      node.replaceChildren(...rows.map(([k, v]) => {
        const key = el('span', { class: 'k', text: String(k) });
        const value = el('span', { class: 'v', text: String(v) });
        keys.push(key);
        values.push(value);
        return el('div', { class: 'kv' }, [key, value]);
      }));
      return;
    }
    rows.forEach(([k, v], i) => {
      if (keys[i].textContent !== String(k)) keys[i].textContent = String(k);
      if (values[i].textContent !== String(v)) values[i].textContent = String(v);
    });
  };
  return node;
}

export function card(title, children, props = {}) {
  return el('section', { class: `card ${props.class ?? ''}` }, [
    title ? el('h3', { class: 'card-title', html: title }) : null,
    ...[].concat(children),
  ]);
}

export function button(label, onClick, { class: cls = '', ...rest } = {}) {
  return el('button', { class: `btn ${cls}`.trim(), onClick, ...rest }, label);
}

export function clear(node) {
  while (node.firstChild) node.firstChild.remove();
  return node;
}

/** The item's sprite where we have one, its emoji where we do not. */
export function itemGlyph(item, { class: cls = '' } = {}) {
  return hasSprite(item.id)
    ? el('span', { class: `sprite spr-${item.id} ${cls}`.trim(), title: item.name })
    : el('span', { class: `glyph ${cls}`.trim(), text: item.icon, title: item.name });
}

export function itemIcon(item, qty) {
  return el('span', { class: 'item-icon', title: item.name }, [
    itemGlyph(item),
    qty != null && qty > 1 ? el('span', { class: 'item-qty', text: qty > 9999 ? `${Math.floor(qty / 1000)}k` : String(qty) }) : null,
  ]);
}
