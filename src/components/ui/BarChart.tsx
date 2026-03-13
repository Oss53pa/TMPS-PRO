import { fmt } from "../../lib/helpers";

interface BarData {
  label: string;
  enc: number;
  dec: number;
}

interface Props {
  data: BarData[];
  height?: number;
}

export default function BarChart({ data, height = 200 }: Props) {
  const maxVal = Math.max(...data.flatMap(d => [d.enc, d.dec]), 1);

  return (
    <div className="flex items-end gap-1 justify-between" style={{ height }}>
      {data.map((d, i) => {
        const encH = (d.enc / maxVal) * (height - 24);
        const decH = (d.dec / maxVal) * (height - 24);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="flex gap-px items-end flex-1 w-full justify-center">
              <div
                className="bg-emerald-400 rounded-t w-2.5 min-w-[10px] transition-all hover:bg-emerald-500"
                style={{ height: Math.max(encH, 2) }}
                title={`${d.label} Enc: ${fmt(d.enc)}`}
              />
              <div
                className="bg-rose-400 rounded-t w-2.5 min-w-[10px] transition-all hover:bg-rose-500"
                style={{ height: Math.max(decH, 2) }}
                title={`${d.label} Déc: ${fmt(d.dec)}`}
              />
            </div>
            <div className="text-[9px] text-neutral-400 font-medium leading-none">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}
