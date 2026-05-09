/**
 * Modal para seleccionar destino al hacer like a una película
 */
export function LikeModal({ movie, onChoose, onCancel }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Elegir lista de destino</h3>
        <p className="muted">Selecciona donde quieres guardar "{movie.title}".</p>
        <div className="stack">
          <button onClick={() => onChoose('lista-conjunta')}>Lista conjunta</button>
          <button onClick={() => onChoose('pendientes')}>Lista pendientes</button>
          <button onClick={() => onChoose('favoritas')}>Lista favoritas</button>
          <button className="ghost" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
