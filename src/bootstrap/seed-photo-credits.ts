/**
 * Photo credits — materialise an attribution onto every photograph in the
 * Media Library, so the website can render "Photo By: …" over each image.
 *
 * The website reads the credit from a file's `caption` and, when that is
 * empty, derives one from the filename (see the site's `lib/cms/credit.ts`).
 * This seeder writes the derived value into `caption` so that:
 *
 *   - editors can SEE the credit in the Media Library, and correct it there;
 *   - the credit is data, not a filename side effect, once it is set.
 *
 * Two hard rules:
 *
 *   1. **Never overwrite a caption an editor has written.** Only empty
 *      captions are filled.
 *   2. **Never invent an attribution.** A photograph whose photographer we
 *      do not know gets no credit at all. Crediting the wrong person is
 *      worse than crediting nobody.
 *
 * Run it with RESEED_CREDITS=true (see src/index.ts), then recreate the
 * container without the flag. It is idempotent — a second run is a no-op.
 */
import type { Core } from '@strapi/strapi';

/**
 * Explicit credits for files whose NAME does not carry one.
 *
 * Key: the exact filename in the Media Library. Value: the credit line
 * exactly as it should read after "Photo By:".
 *
 * The photographs uploaded before the naming convention existed
 * (`workers-hero-nurse.jpg`, `Picture 1.jpg`, `PES.png`, …) are not listed:
 * their photographers are not recorded anywhere, so they stay uncredited
 * until someone who knows supplies the names. Add them here, or simply set
 * the caption in the admin UI — both work, and the admin UI wins.
 */
const EXPLICIT_CREDITS: Record<string, string> = {
  // Example of the shape; harmless if the file is not present.
  // 'workers-hero-nurse.jpg': 'Jane Doe / Unsplash',
};

/** Sources recognised as the trailing token of a house-convention filename. */
const KNOWN_SOURCES = ['unsplash', 'pexels', 'pixabay', 'freepik', 'shutterstock', 'getty', 'istock'];

/**
 * `Benjamin-Lehman-Unsplash.jpg` -> `Benjamin Lehman / Unsplash`.
 * Anything that is not clearly a credit returns null.
 *
 * Kept deliberately identical to the site's lib/cms/credit.ts, so a file
 * reads the same whether or not this seeder has run.
 */
function creditFromFilename(name: string): string | null {
  const base = name.replace(/\.[a-z0-9]+$/i, '').replace(/_[a-f0-9]{10,}$/i, '');
  const parts = base.split(/[-_]+/).filter(Boolean);
  if (parts.length < 3) return null;

  const source = parts[parts.length - 1] ?? '';
  if (!KNOWN_SOURCES.includes(source.toLowerCase())) return null;

  const nameParts = parts.slice(0, -1);
  if (nameParts.length < 2 || !nameParts.every((p) => /^[A-Za-z']+$/.test(p))) return null;

  const person = nameParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  const src = source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
  return `${person} / ${src}`;
}

export async function seedPhotoCredits(strapi: Core.Strapi) {
  const files: Array<{ id: number; name: string; caption?: string | null; mime?: string }> =
    await strapi.db.query('plugin::upload.file').findMany({ limit: 1000 });

  let written = 0;
  let kept = 0;
  let unknown = 0;

  for (const f of files) {
    // Brand assets are not photographs — the logo and favicon get no credit.
    if (!f.mime?.startsWith('image/')) continue;
    if (/^inspire-africa-(logo|favicon)/i.test(f.name)) continue;

    if (f.caption && f.caption.trim()) {
      kept++;
      continue;
    }

    const credit = EXPLICIT_CREDITS[f.name] ?? creditFromFilename(f.name);
    if (!credit) {
      unknown++;
      strapi.log.debug(`[seed-photo-credits] no known photographer for "${f.name}" — left blank.`);
      continue;
    }

    await strapi.db.query('plugin::upload.file').update({
      where: { id: f.id },
      data: { caption: credit },
    });
    written++;
    strapi.log.info(`[seed-photo-credits] "${f.name}" -> ${credit}`);
  }

  strapi.log.info(
    `[seed-photo-credits] DONE. ${written} credited, ${kept} already had a caption, ` +
      `${unknown} left blank (photographer unknown).`,
  );
}
