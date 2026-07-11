import kit from "@eslint-react/kit";

import { jsxNoUselessFragment } from "./jsx-no-useless-fragment";
import { jsxShorthandBoolean } from "./jsx-shorthand-boolean";
import { jsxShorthandFragment } from "./jsx-shorthand-fragment";

// canon's own JSX rules, authored with @eslint-react/kit so the React semantic toolkit (component /
// hook / API detection) is on hand for future, more powerful rules. kit kebab-cases each factory name
// into the rule id; the plugin is exposed under the `coldsmirk` namespace via the plugins-key in
// react.ts (kit's internal meta.name does not determine the namespace).
export const coldsmirkPlugin = kit()
  .use(jsxNoUselessFragment)
  .use(jsxShorthandBoolean)
  .use(jsxShorthandFragment)
  .getPlugin();
