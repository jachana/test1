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
  return wrap;
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

export function itemIcon(item, qty) {
  return el('span', { class: 'item-icon', title: item.name }, [
    item.icon,
    qty != null && qty > 1 ? el('span', { class: 'item-qty', text: qty > 9999 ? `${Math.floor(qty / 1000)}k` : String(qty) }) : null,
  ]);
}
