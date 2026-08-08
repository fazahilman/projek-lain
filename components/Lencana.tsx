import type { StatusLabel } from "@/lib/types";

const KELAS: Record<StatusLabel, string> = {
  sehat: "sehat",
  "perlu hati-hati": "hati-hati",
  berisiko: "risiko",
  "belum bisa dinilai": "netral",
};

export default function Lencana({ label }: { label: StatusLabel }) {
  return <span className={`lencana ${KELAS[label] ?? "netral"}`}>{label}</span>;
}
