import { fmt } from "../../lib/helpers";

interface Props {
  label: string;
  value: number;
  color: "emerald" | "rose" | "neutral" | "blue";
  ccy: string;
}

const colorMap: Record<string, string> = {
  emerald: "text-emerald-600 bg-emerald-50 border-emerald-200",
  rose: "text-rose-600 bg-rose-50 border-rose-200",
  neutral: "text-neutral-900 bg-neutral-100 border-neutral-300",
  blue: "text-blue-600 bg-blue-50 border-blue-200",
};

export default function KpiCard({ label, value, color, ccy }: Props) {
  const neg = value < 0;
  return (
    <div className={`rounded-xl p-4 border ${neg ? "bg-red-50 border-red-200" : colorMap[color]}`}>
      <div className="text-neutral-500 text-xs font-medium mb-1">{label}</div>
      <div className={`text-xl font-black ${neg ? "text-red-600" : color === "emerald" ? "text-emerald-600" : color === "rose" ? "text-rose-600" : color === "neutral" ? "text-neutral-900" : "text-blue-600"}`}>
        {fmt(value)}
      </div>
      <div className="text-neutral-400 text-xs mt-0.5">{ccy}</div>
    </div>
  );
}
