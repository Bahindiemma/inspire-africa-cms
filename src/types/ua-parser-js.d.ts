/**
 * Minimal ambient declaration for ua-parser-js v1 (it ships no bundled
 * .d.ts at the resolved entry). Covers only the surface we use.
 */
declare module 'ua-parser-js' {
  export interface UAParserResult {
    browser: { name?: string; version?: string };
    os: { name?: string; version?: string };
    device: { type?: string; vendor?: string; model?: string };
    engine: { name?: string; version?: string };
  }
  export class UAParser {
    constructor(ua?: string);
    getResult(): UAParserResult;
  }
  const _default: typeof UAParser;
  export default _default;
}
