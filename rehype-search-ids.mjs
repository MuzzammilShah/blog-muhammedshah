import { visit } from 'unist-util-visit';

const SEARCHABLE_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p']);

function elementText(node) {
  let text = '';
  visit(node, 'text', (textNode) => {
    text += textNode.value;
  });
  return text.trim();
}

export function rehypeSearchIds() {
  return function (tree) {
    let n = 0;

    visit(tree, 'element', (node, _index, parent) => {
      if (!SEARCHABLE_TAGS.has(node.tagName)) return;
      if (parent?.tagName === 'li') return;
      if (!elementText(node)) return;

      n += 1;
      node.properties ??= {};
      if (!node.properties.id) {
        node.properties.id = `search-${n}`;
      }
    });
  };
}
