import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { errorMessage } from '../lib/utils';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email }, { auth: false });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-simple">
      <div className="auth-card">
        <Link to="/login" className="back-link">← Volver al inicio de sesión</Link>
        <div className="auth-heading">
          <span className="eyebrow">Recuperación</span>
          <h1>Restablece tu contraseña</h1>
          <p>Indica tu correo y, si está registrado, recibirás un enlace de recuperación.</p>
        </div>

        {sent ? (
          <div className="alert alert-success" role="status">
            Si el correo existe en ServiGest, se enviaron las instrucciones de recuperación.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="form-stack">
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <label className="field">
              <span>Correo electrónico</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="nombre@empresa.ec"
              />
            </label>
            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
              {submitting ? 'Enviando…' : 'Enviar instrucciones'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
