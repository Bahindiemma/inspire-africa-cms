'use strict';

/**
 * Blog Post `category` changes from a fixed enumeration (a `category` column
 * on `blog_posts`) to a relation to the new Category collection.
 *
 * Strapi runs this file BEFORE its schema sync, and the sync then drops the
 * old `category` column without warning. So this migration copies every
 * row's category into `blog_category_stash`, a table Strapi has never managed
 * and therefore never drops. `src/bootstrap/migrate-blog-categories.ts` turns
 * the stash into Category entries and links each draft and published row.
 *
 * Runs once (tracked in `strapi_migrations`). Safe on a fresh database: with
 * no `blog_posts.category` column there is nothing to keep, so it does nothing.
 */
module.exports = {
  async up(knex) {
    const hasPosts = await knex.schema.hasTable('blog_posts');
    if (!hasPosts) return;
    const hasCategory = await knex.schema.hasColumn('blog_posts', 'category');
    if (!hasCategory) return;

    if (!(await knex.schema.hasTable('blog_category_stash'))) {
      await knex.schema.createTable('blog_category_stash', (t) => {
        t.increments('id');
        t.integer('blog_post_id').notNullable();
        t.string('document_id', 255);
        t.string('locale', 255);
        t.string('category', 255).notNullable();
        t.datetime('applied_at').nullable();
      });
    }

    const rows = await knex('blog_posts')
      .select('id', 'document_id', 'locale', 'category')
      .whereNotNull('category')
      .andWhere('category', '<>', '');

    if (rows.length) {
      await knex('blog_category_stash').insert(
        rows.map((r) => ({
          blog_post_id: r.id,
          document_id: r.document_id,
          locale: r.locale,
          category: r.category,
        }))
      );
    }
  },

  async down() {
    throw new Error('Down migration is not supported; restore from the pre-category backup.');
  },
};
