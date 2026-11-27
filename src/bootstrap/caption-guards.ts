import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

/**
 * A photo with a caption shows it under the photo. Publishing is refused while
 * a photo that shows its caption has none. A photo whose "Show caption" switch
 * is off needs no caption, since none is shown. Drafts can still be saved, so
 * an editor can work on a page and add the caption before it goes live.
 *
 *  - Page: the hero photo, every audience card and every testimonial card with
 *    a photo needs "Photo caption" (unless its "Show caption" is off). The
 *    hero's yellow bar (photoCaptionTitle / photoCaptionSub) is an optional
 *    tagline, not the caption.
 *  - Blog Post: the cover image needs "Image caption" (unless "Show caption" is
 *    off); every Image block in the body needs its caption (unless its "Show
 *    caption" is off).
 *
 * The fields are deliberately not `required` in the schemas: that would block
 * saving every existing entry. A caption is not the photographer credit (the
 * "Photo By:" overlay) and not the alt text.
 *
 * Registered as a document-service middleware: covers the admin's single and
 * bulk publish and the REST API.
 */
const PAGE = 'api::page.page';
const BLOG = 'api::blog-post.blog-post';

const filled = (v: unknown) => typeof v === 'string' && v.trim() !== '';
const hasPhoto = (photo: any, photoUrl?: unknown) => !!photo || filled(photoUrl);

function listOf(items: string[]): string {
  const unique = [...new Set(items)];
  const shown = unique.slice(0, 5).join('; ');
  return unique.length > 5 ? `${shown}; and ${unique.length - 5} more` : shown;
}

/** Plain-English names of the photos on a page draft that have no caption. */
export function missingPageCaptions(sections: any[]): string[] {
  const missing: string[] = [];
  for (const s of sections ?? []) {
    if (s.__component === 'sections.hero') {
      if (!s.centered && s.showCaption !== false && hasPhoto(s.photo, s.photoUrl) && !filled(s.photoCaption)) {
        missing.push('the hero photo ("Photo caption")');
      }
    } else if (s.__component === 'sections.audiences') {
      for (const c of s.cards ?? []) {
        if (c.showCaption !== false && hasPhoto(c.photo, c.photoUrl) && !filled(c.photoCaption)) {
          missing.push(`the photo on the "${c.title || 'untitled'}" card ("Photo caption")`);
        }
      }
    } else if (s.__component === 'sections.testimonials') {
      for (const c of s.items ?? []) {
        if (hasPhoto(c.photo) && !filled(c.photoCaption)) {
          missing.push(`the photo on ${c.name ? `${c.name}'s` : 'a'} testimonial card ("Photo caption")`);
        }
      }
    }
  }
  return missing;
}

/** Plain-English names of the photos on a blog post draft that have no caption. */
export function missingPostCaptions(post: any): string[] {
  const missing: string[] = [];
  if (post?.heroImage && post.showHeroCaption !== false && !filled(post.heroImageCaption)) {
    missing.push('the cover image ("Image caption")');
  }
  (post?.body ?? []).forEach((b: any, i: number) => {
    if (b.__component === 'blocks.image' && b.image && b.showCaption !== false && !filled(b.caption)) {
      missing.push(`the Image block ${i + 1} in the body ("caption")`);
    }
  });
  return missing;
}

function refuse(missing: string[]): never {
  throw new errors.ValidationError(
    `Every photo on the website needs a caption. Add one before publishing: ${listOf(missing)}. ` +
      `A caption is one short line saying what the photo shows. It is not the photographer credit.`
  );
}

export function registerCaptionGuards(strapi: Core.Strapi) {
  strapi.documents.use(async (ctx: any, next: any) => {
    if (ctx.action !== 'publish') return next();
    const { documentId, locale } = ctx.params ?? {};
    if (!documentId) return next();

    if (ctx.uid === PAGE) {
      const draft: any = await strapi.documents(PAGE).findOne({
        documentId,
        locale,
        status: 'draft',
        populate: {
          sections: {
            on: {
              'sections.hero': { populate: { photo: { fields: ['id'] } } },
              'sections.audiences': { populate: { cards: { populate: { photo: { fields: ['id'] } } } } },
              'sections.testimonials': { populate: { items: { populate: { photo: { fields: ['id'] } } } } },
            },
          },
        },
      } as any);
      const missing = missingPageCaptions(draft?.sections ?? []);
      if (missing.length) refuse(missing);
    }

    if (ctx.uid === BLOG) {
      const draft: any = await strapi.documents(BLOG).findOne({
        documentId,
        locale,
        status: 'draft',
        populate: {
          heroImage: { fields: ['id'] },
          body: { on: { 'blocks.image': { populate: { image: { fields: ['id'] } } } } },
        },
      } as any);
      const missing = missingPostCaptions(draft);
      if (missing.length) refuse(missing);
    }

    return next();
  });
}
