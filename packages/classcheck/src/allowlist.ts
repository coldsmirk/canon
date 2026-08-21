/**
 * Class selectors defined by one hand-written stylesheet. Comments are stripped first, so prose
 * about `.readout` cannot vouch for a name the stylesheet never defines. The lookbehind keeps
 * `.5` out of `p-1.5` and `.foo` out of `url(x).foo`-style fragments.
 */
export function classSelectorsIn(css: string): string[] {
  const stripped = css.replaceAll(/\/\*[\s\S]*?\*\//g, "");

  return stripped.matchAll(/(?<![\w)])\.(?<name>-?[_a-z][\w-]*)/gi)
    .map(match => match.groups?.name ?? "")
    .toArray();
}

/**
 * `group` and `peer` (plus their named `group/x` forms) mark an element for a descendant's variant
 * to read. They generate no CSS of their own, so the language server has nothing to say about them
 * — silence there is not a typo.
 */
export function isMarkerClass(token: string): boolean {
  return /^(?:group|peer)(?:\/[\w-]+)?$/.test(token);
}
