import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { errorMessage } from '../lib/utils';
import { PasswordField } from '../components/PasswordField';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setRequestId(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError) setRequestId(err.requestId ?? null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-hero" aria-hidden="true">
        <div className="auth-brand">
          <span className="brand-mark brand-mark-light">SG</span>
          <span>ServiGest Ecuador</span>
        </div>
        <div className="auth-copy">
          <h1>Cada solicitud, en su lugar.</h1>
          <p>
            Registra incidencias, asigna técnicos y sigue el cumplimiento de SLA desde un
            solo expediente operativo.
          </p>
          <ul className="auth-points">
            <li>Flujo auditable de estados</li>
            <li>Notificaciones en tiempo real</li>
            <li>Indicadores de carga y cumplimiento</li>
          </ul>
        </div>
        <div className="auth-doc-code">BITÁCORA / SG-EC · GUAYAQUIL</div>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand">
          <span className="brand-mark">SG</span>
          <span>ServiGest Ecuador</span>
        </div>
        <div className="auth-card">
          <div className="auth-heading">
            <h2>Inicia sesión</h2>
            <p>Usa las credenciales asignadas por tu coordinador.</p>
            <span className="auth-seal">Acceso restringido</span>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <span>{error}</span>
              {requestId && <small>Referencia: {requestId}</small>}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-stack">
            <label className="field">
              <span>Correo electrónico</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                placeholder="nombre@empresa.ec"
              />
            </label>
            <PasswordField
              label="Contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••••"
            />
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? <><span className="spinner spinner-sm" /> Ingresando…</> : 'Ingresar'}
            </button>
          </form>

          <div className="auth-links">
            <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
          </div>
        </div>
        <p className="auth-footnote">ServiGest Ecuador · Proyecto DAW 2026</p>
      </section>
    </div>
  );
}
