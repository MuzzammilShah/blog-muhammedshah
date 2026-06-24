/** Splits text on `backtick` spans so titles can render inline code without parsing full Markdown. */
export function splitInlineCode(text: string): Array<{ code: boolean; value: string }> {
  return text
    .split(/`([^`]+)`/g)
    .map((value, i) => ({ code: i % 2 === 1, value }))
    .filter((part) => part.value !== '');
}
