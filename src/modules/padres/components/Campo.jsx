function Campo({ label, value, onChange, placeholder, inputMode }) {
  return (
    <label className="padres-field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </label>
  );
}

export default Campo;
