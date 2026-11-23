'use strict';

/**
 * Three fixed lists become editor-managed relations (2026-11-24):
 *
 *   job_postings.sector               → Sector collection
 *   job_postings.destination_country  → Corridor collection
 *   components_cards_testimonials.flag → Testimonial Label collection
 *
 * Strapi runs this file BEFORE its schema sync, and the sync then drops each
 * old column without warning. So every non-empty value is copied into
 * `list_field_stash`, a table Strapi never manages and never drops.
 * `src/bootstrap/migrate-list-fields.ts` links each row to the matching entry.
 *
 * Runs once (tracked in `strapi_migrations`). On a database without those
 * columns (fresh install, or already migrated) it does nothing.
 */
const FIELDS = [
  { table: 'job_postings', column: 'sector' },
  { table: 'job_postings', column: 'destination_country' },
  { table: 'components_cards_testimonials', column: 'flag' },
];

const STASH = 'list_field_stash';

module.exports = {
  async up(knex) {
    for (const { table, column } of FIELDS) {
      if (!(await knex.schema.hasTable(table))) continue;
      if (!(await knex.schema.hasColumn(table, column))) continue;

      if (!(await knex.schema.hasTable(STASH))) {
        await knex.schema.createTable(STASH, (t) => {
          t.increments('id');
          t.string('table_name', 255).notNullable();
          t.integer('row_id').notNullable();
          t.string('field', 255).notNullable();
          t.string('value', 255).notNullable();
          t.datetime('applied_at').nullable();
        });
      }

      const rows = await knex(table)
        .select('id', column)
        .whereNotNull(column)
        .andWhere(column, '<>', '');
      if (rows.length) {
        await knex(STASH).insert(
          rows.map((r) => ({ table_name: table, row_id: r.id, field: column, value: r[column] }))
        );
      }
    }
  },

  async down() {
    throw new Error('Down migration is not supported; restore from the pre-lists backup.');
  },
};
