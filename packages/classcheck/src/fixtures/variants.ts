import { cva } from "class-variance-authority";

export const chip = cva("tap p-2", {
  variants: {
    tone: {
      hot: "text-red-500",
      cold: "text-skyy-500"
    }
  },
  defaultVariants: { tone: "hot" }
});
