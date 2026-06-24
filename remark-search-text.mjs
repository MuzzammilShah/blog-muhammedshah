import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';

const SEARCHABLE_TYPES = ['heading', 'paragraph'];

export function remarkSearchText() {
  return function (tree, file) {
    const lines = [];
    let n = 0;

    visit(tree, SEARCHABLE_TYPES, (node, _index, parent) => {
      if (parent?.type === 'listItem') return;

      const text = toString(node).trim();
      if (!text) return;
      n += 1;
      lines.push({ id: `search-${n}`, text });
    });

    file.data.astro.frontmatter.searchLines = lines;
  };
}
