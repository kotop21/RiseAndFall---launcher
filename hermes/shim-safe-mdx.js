/**
 * Hermes has no ESM, so safe-mdx's dynamic import() cannot parse.
 * Chat still paints with native <markdown>; this stub drops the MDX stress row.
 */
exports.SafeMdxRenderer = function SafeMdxRenderer() {
  return null
}
exports.mdxParse = function mdxParse() {
  return { type: 'root', children: [] }
}
