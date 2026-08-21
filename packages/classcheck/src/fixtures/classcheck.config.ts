import { defineClasscheckConfig } from "@coldsmirk/classcheck";

export default defineClasscheckConfig({
  entry: "app.css",
  source: ["."],
  allowFrom: ["styles/handwritten.css"]
});
