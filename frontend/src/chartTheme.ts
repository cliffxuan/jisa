// One place for chart colors + shared Recharts props so every chart on the
// page reads as the same system.

export const CHART = {
  portfolio: "#34d399", // emerald — "your mix"
  paidIn: "#a8a29e", // stone — money put in
  cash: "#7dd3fc", // sky — the money-market comparison
  marker: "#fbbf24", // amber — the age-18 moment / gifts
  bad: "#fb7185", // rose — drawdowns, warnings
  grid: "rgba(242,239,230,0.07)",
  axis: "#78837e",
  fanOuter: "rgba(52,211,153,0.10)",
  fanInner: "rgba(52,211,153,0.22)",
};

/** Categorical palette for the allocation donut (risk-ordered products get
 * cool→warm hues). */
export const DONUT_COLORS = [
  "#7dd3fc", // sky
  "#67e8f9", // cyan
  "#5eead4", // teal
  "#34d399", // emerald
  "#a3e635", // lime
  "#fde047", // yellow
  "#fbbf24", // amber
  "#fb923c", // orange
  "#fb7185", // rose
  "#f472b6", // pink
  "#c084fc", // purple
  "#a5b4fc", // indigo
];

export const tooltipStyle = {
  contentStyle: {
    background: "#101b16",
    border: "1px solid rgba(242,239,230,0.15)",
    borderRadius: "0.75rem",
    fontSize: "12px",
    color: "#f2efe6",
  },
  labelStyle: { color: "#a8a29e", marginBottom: 4 },
} as const;

export const axisProps = {
  stroke: CHART.axis,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;
