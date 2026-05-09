/**
 * AuthScreen - Pantalla de autenticación
 */
export function AuthScreen({
  authMode,
  setAuthMode,
  username,
  setUsername,
  password,
  setPassword,
  authError,
  onSubmit,
  t,
}) {
  return (
    <section className="panel auth-panel">
      <h2>{authMode === 'login' ? t('authLoginTitle') : t('authRegisterTitle')}</h2>
      <form onSubmit={onSubmit} className="stack">
        <input
          type="text"
          placeholder={t('authUsername')}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
        <input
          type="password"
          placeholder={t('authPassword')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit">
          {authMode === 'login' ? t('authLoginAction') : t('authRegisterAction')}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        >
          {authMode === 'login' ? t('authNoAccount') : t('authHaveAccount')}
        </button>
      </form>

      {authError ? <p className="error">{authError}</p> : null}
    </section>
  )
}
