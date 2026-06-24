export interface SearchLine {
  id: string;
  text: string;
}

export interface PostIndexEntry {
  slug: string;
  title: string;
  tags: string[];
  lines: SearchLine[];
}

export type MatchType = 'title' | 'tag' | 'line';

export interface SearchResult {
  slug: string;
  title: string;
  matchType: MatchType;
  lineId?: string;
  snippet: {
    before: string;
    match: string;
    after: string;
  };
}

const SNIPPET_CONTEXT = 40;

function buildSnippet(text: string, query: string) {
  const offset = text.toLowerCase().indexOf(query.toLowerCase());
  const start = Math.max(0, offset - SNIPPET_CONTEXT);
  const end = Math.min(text.length, offset + query.length + SNIPPET_CONTEXT);

  return {
    before: (start > 0 ? '…' : '') + text.slice(start, offset),
    match: text.slice(offset, offset + query.length),
    after: text.slice(offset + query.length, end) + (end < text.length ? '…' : ''),
  };
}

export function searchPosts(index: PostIndexEntry[], query: string): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const needle = trimmed.toLowerCase();
  const results: SearchResult[] = [];

  for (const post of index) {
    if (post.title.toLowerCase().includes(needle)) {
      results.push({
        slug: post.slug,
        title: post.title,
        matchType: 'title',
        snippet: buildSnippet(post.title, trimmed),
      });
      continue;
    }

    const matchedTag = post.tags.find((tag) => tag.toLowerCase().includes(needle));
    if (matchedTag) {
      results.push({
        slug: post.slug,
        title: post.title,
        matchType: 'tag',
        snippet: buildSnippet(matchedTag, trimmed),
      });
      continue;
    }

    const matchedLine = post.lines.find((line) => line.text.toLowerCase().includes(needle));
    if (matchedLine) {
      results.push({
        slug: post.slug,
        title: post.title,
        matchType: 'line',
        lineId: matchedLine.id,
        snippet: buildSnippet(matchedLine.text, trimmed),
      });
    }
  }

  const tierRank: Record<MatchType, number> = { title: 0, tag: 1, line: 2 };
  return results.sort((a, b) => tierRank[a.matchType] - tierRank[b.matchType]);
}
