interface Props {
  cat: string;
}

export default function Badge({ cat }: Props) {
  const cls =
    cat === "enc" ? "bg-emerald-100 text-emerald-700" :
    cat === "dec" ? "bg-rose-100 text-rose-700" :
    cat === "bfr" ? "bg-amber-100 text-amber-700" :
    "bg-purple-100 text-purple-700";
  const label =
    cat === "enc" ? "Enc" :
    cat === "dec" ? "Déc" :
    cat === "bfr" ? "BFR" : "Pool";
  return <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${cls}`}>{label}</span>;
}
