/**
 * Helpers for Strapi 5 "Blocks" rich text (the editor with bold / italic /
 * link / list buttons).
 *
 * Used by:
 *  - the one-off conversion of old plain-text fields (lede, callout, quote,
 *    list) into rich text, `src/bootstrap/migrate-rich-text.ts`;
 *  - the save hook that keeps those old fields as a plain-text mirror of the
 *    rich text, `src/bootstrap/rich-text-sync.ts`;
 *  - the reading-time count in the Blog Post lifecycle.
 */

export interface RtNode {
  type?: string;
  text?: string;
  url?: string;
  format?: string;
  level?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  children?: RtNode[];
  [key: string]: unknown;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  pound: '£',
  euro: '€',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/**
 * Strapi refuses to save a link that isn't a "/path" or a parseable URL
 * ("Please specify a valid link"). Make old hrefs fit that rule, or return
 * null to keep the words without the link.
 *  - {{whatsappLink}} (legal pages) → https://wa.me/{{whatsappDigits}}; the
 *    website still swaps the {{token}} for the number from Site Setting.
 *  - a bare domain ("www.ilo.org/x") → https://www.ilo.org/x
 */
export function editorSafeUrl(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  if (/^\{\{\s*whatsappLink\s*\}\}$/i.test(u)) return 'https://wa.me/{{whatsappDigits}}';
  if (u.startsWith('/')) return u;
  try {
    // eslint-disable-next-line no-new
    new URL(u);
    return u;
  } catch {
    /* fall through */
  }
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#]|$)/i.test(u)) return `https://${u}`;
  return null;
}

type Marks = Pick<RtNode, 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code'>;

const MARK_TAGS: Record<string, keyof Marks> = {
  strong: 'bold',
  b: 'bold',
  em: 'italic',
  i: 'italic',
  u: 'underline',
  s: 'strikethrough',
  strike: 'strikethrough',
  del: 'strikethrough',
  code: 'code',
};

function textNode(text: string, marks: Marks): RtNode {
  const n: RtNode = { type: 'text', text };
  for (const [k, v] of Object.entries(marks)) if (v) (n as any)[k] = true;
  return n;
}

/**
 * Convert a short run of inline HTML into Blocks inline nodes. Understands
 * exactly what the old fields hold: <a href>, <strong>/<b>, <em>/<i>, <u>,
 * <s>, <code>, <br>, and HTML entities. Any other tag is dropped, keeping its
 * text. Plain text without tags comes back as a single text node.
 */
export function inlineHtmlToNodes(html: string): RtNode[] {
  const out: RtNode[] = [];
  const markStack: Array<keyof Marks> = [];
  let link: RtNode | null = null;

  const marks = (): Marks => {
    const m: Marks = {};
    for (const k of markStack) m[k] = true;
    return m;
  };
  const push = (n: RtNode) => {
    const target = link ? link.children! : out;
    const prev = target[target.length - 1];
    // Merge neighbouring text with identical marks so the editor shows one run.
    if (
      prev &&
      prev.type === 'text' &&
      n.type === 'text' &&
      ['bold', 'italic', 'underline', 'strikethrough', 'code'].every((k) => !!prev[k] === !!n[k])
    ) {
      prev.text = (prev.text ?? '') + (n.text ?? '');
      return;
    }
    target.push(n);
  };

  const re = /<\s*(\/?)\s*([a-z0-9]+)([^>]*)>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m.index > last) push(textNode(decodeEntities(html.slice(last, m.index)), marks()));
    last = re.lastIndex;
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (tag === 'br') {
      push(textNode('\n', marks()));
    } else if (tag === 'a') {
      if (!closing) {
        const href = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[3]);
        const url = editorSafeUrl(decodeEntities((href?.[2] ?? href?.[3] ?? href?.[4] ?? '').trim()));
        if (link) out.push(link);
        // A URL the editor would refuse becomes plain text, so the entry stays saveable.
        link = url ? { type: 'link', url, children: [] } : null;
      } else if (link) {
        if (!link.children!.length) link.children!.push(textNode('', {}));
        out.push(link);
        link = null;
      }
    } else if (MARK_TAGS[tag]) {
      const mark = MARK_TAGS[tag];
      if (!closing) markStack.push(mark);
      else {
        const i = markStack.lastIndexOf(mark);
        if (i >= 0) markStack.splice(i, 1);
      }
    }
  }
  if (last < html.length) push(textNode(decodeEntities(html.slice(last)), marks()));
  if (link) out.push(link);
  // Blocks requires at least one child, and inline nodes must be framed by text.
  if (!out.length) out.push(textNode('', {}));
  return out;
}

/** Old plain/HTML text → Blocks paragraphs. A blank line starts a new paragraph. */
export function textToBlocks(text: string): RtNode[] {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ type: 'paragraph', children: inlineHtmlToNodes(p) }));
}

/** Old list items (array of plain/HTML strings) → one Blocks list. */
export function itemsToListBlocks(items: unknown, ordered: boolean): RtNode[] {
  const arr = Array.isArray(items) ? items.map((x) => String(x ?? '')).filter((x) => x.trim()) : [];
  if (!arr.length) return [];
  return [
    {
      type: 'list',
      format: ordered ? 'ordered' : 'unordered',
      children: arr.map((it) => ({ type: 'list-item', children: inlineHtmlToNodes(it.trim()) })),
    },
  ];
}

/** Concatenated text of one node and its descendants. */
function plainOf(n: RtNode): string {
  if (typeof n.text === 'string') return n.text;
  return (n.children ?? []).map(plainOf).join('');
}

/** Rich text → plain text, one line per paragraph / list item. */
export function blocksToPlain(nodes: unknown): string {
  if (!Array.isArray(nodes)) return '';
  const lines: string[] = [];
  const walk = (list: RtNode[]) => {
    for (const n of list) {
      if (n.type === 'list') walk(n.children ?? []);
      else lines.push(plainOf(n));
    }
  };
  walk(nodes as RtNode[]);
  return lines.map((l) => l.trim()).filter(Boolean).join('\n\n');
}

/** Rich text list → array of plain strings, one per list item (nested items flattened). */
export function blocksToListItems(nodes: unknown): string[] {
  if (!Array.isArray(nodes)) return [];
  const items: string[] = [];
  const walk = (list: RtNode[], inList: boolean) => {
    for (const n of list) {
      if (n.type === 'list') walk(n.children ?? [], true);
      else if (n.type === 'list-item' || !inList) items.push(plainOf(n).trim());
    }
  };
  walk(nodes as RtNode[], false);
  return items.filter(Boolean);
}

/** True when the rich text holds at least one visible character. */
export function hasRichContent(nodes: unknown): boolean {
  return blocksToPlain(nodes).trim().length > 0;
}

/** Word count across rich text, for reading time. */
export function countWords(text: string): number {
  const t = String(text ?? '').trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Words in a blog post's `body` dynamic zone, for reading time. */
export function countWordsInBody(body: any[]): number {
  if (!Array.isArray(body)) return 0;
  let words = 0;
  for (const block of body) {
    // Rich-text `content` (since 2026-11-23) wins over the old plain field.
    if (Array.isArray(block?.content)) {
      words += countWords(blocksToPlain(block.content));
      if (block.__component === 'blocks.callout') words += countWords(block.title);
      continue;
    }
    switch (block?.__component) {
      case 'blocks.lede':
      case 'blocks.heading':
      case 'blocks.callout':
      case 'blocks.quote':
        words += countWords(block.text || block.title || '');
        break;
      case 'blocks.paragraph':
        // Blocks-editor structure: { text: [{ type, children: [{ text }] }] }
        words += countWords(blocksToPlain(block.text));
        break;
      case 'blocks.list':
        if (Array.isArray(block.items)) {
          for (const item of block.items) words += countWords(String(item));
        }
        break;
      default:
        break;
    }
  }
  return words;
}
