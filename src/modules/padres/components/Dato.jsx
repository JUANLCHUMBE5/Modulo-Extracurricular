function Dato({ label, value }) {
  return (
    <div className="padres-data-box">
      <span>{label}</span>
      <strong>{value || "No registrado"}</strong>
    </div>
  );
}

export default Dato;
