function SummaryBox({ label, value, tone = "default" }) {
  return (
    <div className={`coord-load-box coord-load-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default SummaryBox;
