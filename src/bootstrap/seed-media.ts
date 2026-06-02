/**
 * Seed the Strapi Media Library with the site's images so that EVERY
 * visitor-facing image lives in the CMS (not as a static file in the
 * Next.js app). The image files are bundled under `public/seed-media/`
 * and uploaded once on (re)seed via the upload plugin.
 *
 * After upload we attach the resulting media to the `photo` field of the
 * hero / audience-card / blog sections. `photoUrl` is left in place as a
 * pure last-resort fallback (the frontend reads `photo.url ?? photoUrl`),
 * so a failed upload can never blank a hero — but when the upload
 * succeeds, the rendered image is served from Strapi and an editor
 * replacing it in the Media Library syncs to the live site.
 *
 * Idempotent: a file already present in the Media Library (matched by
 * name) is reused rather than re-uploaded.
 */
import fs from 'fs';
import path from 'path';

// photoUrl value (as written in the seed) → file path under public/seed-media
function seedFileFor(photoUrl: string): string | null {
  // e.g. "/images/home-hero-healthcare.jpg"        → "home-hero-healthcare.jpg"
  //      "/images/blog/gulf-corridor-rebar.jpg"     → "blog/gulf-corridor-rebar.jpg"
  const m = photoUrl.match(/^\/images\/(.+)$/);
  return m ? m[1] : null;
}

function mimeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  return 'image/jpeg';
}

function mediaDir(strapi: any): string {
  const root = strapi?.dirs?.app?.root ?? process.cwd();
  return path.join(root, 'public', 'seed-media');
}

/**
 * Upload one image (idempotent by file name). Returns the media file id,
 * or null if the source file is missing or the upload fails.
 */
async function uploadOnce(
  strapi: any,
  relPath: string,
  alt: string
): Promise<number | null> {
  const fileName = path.basename(relPath);
  try {
    const existing = await strapi.db
      .query('plugin::upload.file')
      .findOne({ where: { name: fileName } });
    if (existing) return existing.id;

    const abs = path.join(mediaDir(strapi), relPath);
    if (!fs.existsSync(abs)) {
      strapi.log.warn(`[seed-media] source not found, skipping: ${relPath}`);
      return null;
    }
    const stats = fs.statSync(abs);
    const uploaded = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        data: { fileInfo: { name: fileName, alternativeText: alt || fileName, caption: '' } },
        files: {
          filepath: abs,
          originalFilename: fileName,
          mimetype: mimeFor(fileName),
          size: stats.size,
        },
      });
    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    if (file?.id) {
      strapi.log.info(`[seed-media] uploaded ${fileName} (id ${file.id})`);
      return file.id;
    }
    return null;
  } catch (e: any) {
    strapi.log.warn(`[seed-media] upload failed for ${fileName}: ${e?.message}`);
    return null;
  }
}

/**
 * Upload every image referenced by a `photoUrl` anywhere in the supplied
 * page section trees (+ the blog hero map). Returns a map of
 * photoUrl → media file id for the ones that succeeded.
 */
export async function seedMediaLibrary(
  strapi: any,
  photoUrls: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const unique = Array.from(new Set(photoUrls.filter(Boolean)));
  for (const url of unique) {
    const rel = seedFileFor(url);
    if (!rel) continue;
    const id = await uploadOnce(strapi, rel, '');
    if (id) out.set(url, id);
  }
  strapi.log.info(`[seed-media] ${out.size}/${unique.length} images linked from the Media Library`);
  return out;
}

/**
 * Upload EVERY image bundled under public/seed-media (recursively) into
 * the Media Library and return a map keyed by the `/images/<rel>` form
 * used in the seed's photoUrl fields + blog hero map. Idempotent.
 */
export async function seedAllMedia(strapi: any): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const root = mediaDir(strapi);
  if (!fs.existsSync(root)) {
    strapi.log.warn(`[seed-media] dir not found: ${root} — images stay on photoUrl fallback`);
    return out;
  }
  const walk = (dir: string, prefix: string) => {
    const rels: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) rels.push(...walk(path.join(dir, entry.name), rel));
      else if (/\.(jpe?g|png|webp|gif|svg)$/i.test(entry.name)) rels.push(rel);
    }
    return rels;
  };
  for (const rel of walk(root, '')) {
    const id = await uploadOnce(strapi, rel, '');
    if (id) out.set(`/images/${rel}`, id);
  }
  strapi.log.info(`[seed-media] Media Library has ${out.size} seeded images`);
  return out;
}

/** Collect every photoUrl found on hero + audience-card sections. */
export function collectPhotoUrls(sections: any[]): string[] {
  const urls: string[] = [];
  for (const s of sections ?? []) {
    if (typeof s?.photoUrl === 'string') urls.push(s.photoUrl);
    for (const c of s?.cards ?? []) {
      if (typeof c?.photoUrl === 'string') urls.push(c.photoUrl);
    }
  }
  return urls;
}

/**
 * Return a deep-ish copy of `sections` with `photo` (media id) attached
 * wherever a `photoUrl` maps to an uploaded file. `photoUrl` is kept as a
 * fallback. Safe to call when idMap is empty (returns sections unchanged).
 */
export function attachSectionPhotos(sections: any[], idMap: Map<string, number>): any[] {
  return (sections ?? []).map((s) => {
    const next: any = { ...s };
    if (typeof s?.photoUrl === 'string' && idMap.has(s.photoUrl)) {
      next.photo = idMap.get(s.photoUrl);
    }
    if (Array.isArray(s?.cards)) {
      next.cards = s.cards.map((c: any) => {
        if (typeof c?.photoUrl === 'string' && idMap.has(c.photoUrl)) {
          return { ...c, photo: idMap.get(c.photoUrl) };
        }
        return c;
      });
    }
    return next;
  });
}
