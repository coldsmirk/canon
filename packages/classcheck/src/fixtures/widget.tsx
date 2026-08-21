import { clsx } from "clsx";

const TONE = "text-red-500 readout";

export function Widget() {
  return (
    <div className={`tap felx entry-defined ${TONE}`}>
      <span className={clsx({ "flex p-2": true, badkey: false })}>x</span>
      <span className="m-[8px] break-words">y</span>
    </div>
  );
}
