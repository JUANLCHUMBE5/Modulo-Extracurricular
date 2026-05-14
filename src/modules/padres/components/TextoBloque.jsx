function TextoBloque({ texto }) {
  return (
    <>
      {String(texto || "")
        .split(/\n+/)
        .map((linea) => linea.trim())
        .filter(Boolean)
        .map((linea, index) => <p key={`${linea}-${index}`}>{linea}</p>)}
    </>
  );
}

export default TextoBloque;
