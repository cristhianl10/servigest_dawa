import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { passwordSchema } from '@servigest/shared';
import { api } from '../lib/api';
import { errorMessage } from '../lib/utils';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Contraseña inválida.');
      return;
    }
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password }, { auth: false });
      navigate('/login', { replace: true });
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
          <span className="eyebrow">Nueva contraseña</span>
          <h1>Crea una contraseña segura</h1>
          <p>Mínimo 10 caracteres, con mayúscula, minúscula, número y símbolo.</p>
        </div>

        {!token ? (
          <div className="alert alert-error" role="alert">
            El enlace no contiene un token válido. Solicita uno nuevo.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="form-stack">
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <label className="field">
              <span>Nueva contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="field">
              <span>Confirmar contraseña</span>
              <input
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Actualizar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
