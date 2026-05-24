/**
 * Tell TypeScript that PNG/SVG/JPEG/JPG/WebP imports inside the admin
 * bundle resolve to a string URL at build time. Strapi's admin
 * webpack handles the actual asset processing.
 */
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.jpeg' {
  const src: string;
  export default src;
}
declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.webp' {
  const src: string;
  export default src;
}
