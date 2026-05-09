/**
 * ActivityScreen - Pantalla de actividad
 */
export function ActivityScreen({ logs, t }) {
  return (
    <section className="panel">
      <h2>{t('activityTitle')}</h2>
      <ul className="result-list">
        {logs.map((log) => (
          <li key={log.id} className="movie-card compact">
            <div className="movie-main">
              <strong>{log.action}</strong>
              <p>
                {log.username || t('systemUser')} | {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
