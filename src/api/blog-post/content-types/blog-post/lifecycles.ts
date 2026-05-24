/**
 * Auto-compute `readMinutes` from the Dynamic Zone body before write.
 * Editors don't have to fill it in; if they do, their value wins.
 */
const WPM = 220;

function countWordsInBody(body: any[]): number {
  if (!Array.isArray(body)) return 0;
  let words = 0;
  for (const block of body) {
    switch (block.__component) {
      case 'blocks.lede':
      case 'blocks.heading':
      case 'blocks.callout':
      case 'blocks.quote':
        words += String(block.text || block.title || '').split(/\s+/).length;
        break;
      case 'blocks.paragraph':
        // Blocks-editor structure: { text: [{ type, children: [{ text }] }] }
        if (Array.isArray(block.text)) {
          for (const node of block.text) {
            const children = node?.children ?? [];
            for (const c of children) words += String(c?.text || '').split(/\s+/).length;
          }
        }
        break;
      case 'blocks.list':
        if (Array.isArray(block.items)) {
          for (const item of block.items) words += String(item).split(/\s+/).length;
        }
        break;
      default:
        break;
    }
  }
  return words;
}

function compute(data: any) {
  if (typeof data.readMinutes === 'number' && data.readMinutes > 0) return;
  const w = countWordsInBody(data.body || []);
  if (w > 0) data.readMinutes = Math.max(1, Math.round(w / WPM));
}

export default {
  beforeCreate({ params }: any) {
    compute(params.data);
  },
  beforeUpdate({ params }: any) {
    if (params.data?.body) compute(params.data);
  },
};
