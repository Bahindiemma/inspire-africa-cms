/**
 * Auto-compute `readMinutes` from the Dynamic Zone body before write.
 * Editors don't have to fill it in; if they do, their value wins.
 *
 * In Strapi 5 the admin's saves usually reach this hook with the body already
 * turned into component references (no text), so the same computation also
 * runs earlier, in the document-service hook in src/bootstrap/rich-text-sync.ts,
 * where the text is still there. This hook stays for direct DB-level writes.
 */
import { countWordsInBody } from '../../../../utils/rich-text';

const WPM = 220;

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
