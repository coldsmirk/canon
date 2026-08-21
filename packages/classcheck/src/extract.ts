import ts from "typescript";

// Attributes / object keys whose value holds class lists: JSX, plain `class` maps (tiptap and
// friends), and component-library `classNames` slot maps (Mantine's Styles API).
const CLASS_ATTRIBUTES = new Set(["class", "className", "classNames"]);

// Call sites whose arguments hold class lists — the eslint-plugin-tailwindcss defaults, so the
// two tools agree on what a class site is.
const CLASS_FUNCTIONS = new Set(["classnames", "classNames", "clsx", "cn", "ctl", "cva", "tv", "tw", "twMerge", "twJoin"]);

/**
 * The subset whose object-literal KEYS are the classes (`clsx({ "flex p-2": cond })`).
 */
const KEY_PARSE_FUNCTIONS = new Set(["classnames", "classNames", "clsx"]);

/**
 * cva/tv config keys whose leaf strings are variant NAMES, not classes.
 */
const IGNORED_KEYS = new Set(["defaultVariants", "compoundVariants", "compoundSlots"]);

const MAX_DEPTH = 12;

export interface ClassToken {
  token: string;
  file: string;
  /**
   * 0-based line/character in UTF-16 units — exactly what an LSP position is.
   */
  line: number;
  character: number;
}

/**
 * Every class token in one TypeScript file, with the position of each.
 *
 * A class site is rarely a plain string: it is a template with a ternary in it, a `classNames`
 * slot map, a `{ class: … }` attribute object, a `cva`/`clsx` call, or a module constant one of
 * those interpolates. Walk into all of them — a token this misses is a token nothing checks. The
 * walk is per-file and syntactic (no type checker): a constant imported from another module is
 * checked where it is defined, not where it is used.
 */
export function extractClassTokens(file: string, text: string): ClassToken[] {
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  // Module constants, so `className={PANE_TONE[tone]}` resolves back to the map that defines it.
  const constants = new Map<string, ts.Expression>();

  const collect = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && !constants.has(node.name.text)) {
      constants.set(node.name.text, node.initializer);
    }

    ts.forEachChild(node, collect);
  };

  collect(source);

  const strings: Array<{ text: string; at: number; openStart: boolean; openEnd: boolean }> = [];
  const seen = new Set<ts.Node>();

  // The raw source between the delimiters, not the cooked `.text`: one escape and every token
  // offset after it would point at the wrong column. The tail is two characters when a template
  // part closes on `${`, one otherwise — which is also what marks the fragment as open-ended
  // (`openStart` is set by the caller for parts that begin right after an interpolation).
  const pushLiteral = (literal: ts.LiteralLikeNode, openStart = false): void => {
    const from = literal.getStart(source) + 1;
    const end = literal.getEnd();
    const openEnd = text.endsWith("${", end);

    strings.push({
      text: text.slice(from, end - (openEnd ? 2 : 1)),
      at: from,
      openStart,
      openEnd
    });
  };

  const harvest = (node: ts.Node | undefined, depth: number, parseKeys: boolean): void => {
    if (!node || depth > MAX_DEPTH || seen.has(node)) {
      return;
    }

    const each = (nodes: ReadonlyArray<ts.Node | undefined>, keys = parseKeys): void => {
      for (const child of nodes) {
        harvest(child, depth + 1, keys);
      }
    };

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      pushLiteral(node);

      return;
    }

    if (ts.isTemplateExpression(node)) {
      pushLiteral(node.head);

      for (const span of node.templateSpans) {
        harvest(span.expression, depth + 1, parseKeys);
        pushLiteral(span.literal, true);
      }

      return;
    }

    if (ts.isTaggedTemplateExpression(node)) {
      harvest(node.template, depth + 1, parseKeys);

      return;
    }

    if (ts.isConditionalExpression(node)) {
      each([node.whenTrue, node.whenFalse]);

      return;
    }

    if (ts.isBinaryExpression(node)) {
      each([node.left, node.right]);

      return;
    }

    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property)) {
          continue;
        }

        const key = property.name;

        if ((ts.isIdentifier(key) || ts.isStringLiteral(key)) && IGNORED_KEYS.has(key.text)) {
          continue;
        }

        // In `clsx({ "flex p-2": condition })` the KEY is the class list, quoted or not.
        if (parseKeys && ts.isStringLiteral(key)) {
          pushLiteral(key);
        } else if (parseKeys && ts.isIdentifier(key)) {
          strings.push({
            text: key.text,
            at: key.getStart(source),
            openStart: false,
            openEnd: false
          });
        }

        harvest(property.initializer, depth + 1, parseKeys);
      }

      return;
    }

    if (ts.isArrayLiteralExpression(node)) {
      each(node.elements);

      return;
    }

    if (ts.isCallExpression(node)) {
      // The callee too: `className={button({ size })}` is only a class site because `button`
      // resolves to the `cva(…)` constant that holds the classes.
      each([node.expression, ...node.arguments], keyParseFor(node) ?? parseKeys);

      return;
    }

    if (ts.isIdentifier(node)) {
      seen.add(node);
      harvest(constants.get(node.text), depth + 1, parseKeys);

      return;
    }

    if (
      ts.isJsxExpression(node)
      || ts.isParenthesizedExpression(node)
      || ts.isAsExpression(node)
      || ts.isSatisfiesExpression(node)
      || ts.isTypeAssertionExpression(node)
      || ts.isNonNullExpression(node)
      || ts.isPropertyAccessExpression(node)
      || ts.isElementAccessExpression(node)
    ) {
      // For a member access the interesting half is the object: `PANE_TONE[tone]` is only a class
      // list because `PANE_TONE` is a map of them.
      harvest(node.expression, depth + 1, parseKeys);
    }
  };

  const keyOf = (node: ts.JsxAttribute | ts.PropertyAssignment): string => ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : "";

  const visit = (node: ts.Node): void => {
    if ((ts.isJsxAttribute(node) || ts.isPropertyAssignment(node)) && CLASS_ATTRIBUTES.has(keyOf(node))) {
      harvest(node.initializer, 0, false);
    }

    // A bare `cva`/`tv`/`cn` call is a class site even when no attribute in this file consumes it
    // — variant maps live in their own modules.
    if (ts.isCallExpression(node) && keyParseFor(node) !== undefined) {
      for (const argument of node.arguments) {
        harvest(argument, 0, keyParseFor(node) ?? false);
      }
    }

    // The tagged form of the same functions (`` tw`flex p-2` ``) — the dominant `tw` idiom.
    if (ts.isTaggedTemplateExpression(node) && ts.isIdentifier(node.tag) && CLASS_FUNCTIONS.has(node.tag.text)) {
      harvest(node.template, 0, false);
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  return strings.flatMap(({
    text: literal,
    at,
    openStart,
    openEnd
  }) => {
    const matches = literal.matchAll(/\S+/g).toArray();

    return matches
      // A token flush against an interpolation boundary is a FRAGMENT of a constructed class name
      // (`w-[${x}px]` → `w-[` and `px]`), not a class. Tailwind cannot compile constructed names
      // either, so there is nothing true to say about the fragment — skip it rather than
      // misreport it as a typo. Whitespace-separated complete tokens in the same template stay.
      .filter((match, index) => {
        const flushStart = openStart && index === 0 && match.index === 0;
        const flushEnd = openEnd && index === matches.length - 1 && match.index + match[0].length === literal.length;

        return !flushStart && !flushEnd;
      })
      .map(match => {
        return {
          token: match[0],
          file,
          ...source.getLineAndCharacterOfPosition(at + match.index)
        };
      });
  });
}

// For a call to one of the known class functions: whether its object keys are classes.
// `undefined` marks every other call, whose arguments inherit the surrounding context.
function keyParseFor(node: ts.CallExpression): boolean | undefined {
  if (!ts.isIdentifier(node.expression) || !CLASS_FUNCTIONS.has(node.expression.text)) {
    return undefined;
  }

  return KEY_PARSE_FUNCTIONS.has(node.expression.text);
}
