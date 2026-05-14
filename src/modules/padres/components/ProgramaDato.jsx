function ProgramaDato({ icon, label, value, chip }) {
  return (
    <div>
      {icon ? <span className="padres-program-data-icon">{icon}</span> : null}
      <dt>{label}:</dt>
      <dd className={chip ? "padres-payment-chip" : ""}>{value || "No registrado"}</dd>
    </div>
  );
}

export default ProgramaDato;
