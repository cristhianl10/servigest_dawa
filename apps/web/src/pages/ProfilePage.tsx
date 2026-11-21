import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { passwordSchema } from '@servigest/shared';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { PageHeader, Card } from '../components/Ui';
import { api } from '../lib/api';
import type { User } from '../lib/types';
import { ROLE_LABELS, errorMessage, formatDateTime } from '../lib/utils';
import { PasswordField } from '../components/PasswordField';

export function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) return null;

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await api.patch<User>('/auth/me', {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
      });
      updateUser({ ...user, ...updated });
      toast.success('Perfil actualizado');
    } catch (err) {
      toast.error('No se pudo actualizar el perfil', errorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      toast.error('Contraseña inválida', parsed.error.errors[0]?.message);
      return;
    }
    if (newPassword !== confirmation) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setSavingPassword(true);
    try {
      await api.patch('/auth/me/password', { currentPassword, newPassword });
      toast.success('Contraseña actualizada', 'Inicia sesión nuevamente.');
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error('No se pudo cambiar la contraseña', errorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Cuenta"
        title="Mi perfil"
        description="Actualiza tus datos de contacto y la seguridad de tu cuenta."
      />

      {user.mustChangePassword && (
        <div className="alert alert-warning" role="alert">
          Tienes una contraseña temporal pendiente de cambio.
        </div>
      )}

      <div className="grid grid-2">
        <Card>
          <div className="card-heading">
            <h2>Datos personales</h2>
            <p>Información visible para coordinación.</p>
          </div>
          <form className="form-stack" onSubmit={saveProfile}>
            <label className="field">
              <span>Nombre completo</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                minLength={3}
                required
              />
            </label>
            <label className="field">
              <span>Correo electrónico</span>
              <input value={user.email} disabled />
              <small>El correo solo puede cambiarlo un administrador.</small>
            </label>
            <label className="field">
              <span>Teléfono</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0999999999"
                maxLength={20}
              />
            </label>
            <div className="definition-grid">
              <div>
                <span>Rol</span>
                <strong>{ROLE_LABELS[user.role]}</strong>
              </div>
              {user.lastLoginAt && (
                <div>
                  <span>Último acceso</span>
                  <strong>{formatDateTime(user.lastLoginAt)}</strong>
                </div>
              )}
            </div>
            <button className="btn btn-primary" type="submit" disabled={savingProfile}>
              {savingProfile ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        </Card>

        <Card>
          <div className="card-heading">
            <h2>Seguridad</h2>
            <p>Al cambiar la contraseña se cerrará esta sesión.</p>
          </div>
          <form className="form-stack" onSubmit={changePassword}>
            <PasswordField
              label="Contraseña actual"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <PasswordField
              label="Nueva contraseña"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              required
              hint="Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo."
            />
            <PasswordField
              label="Confirmar nueva contraseña"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              required
            />
            <button className="btn btn-primary" type="submit" disabled={savingPassword}>
              {savingPassword ? 'Actualizando…' : 'Cambiar contraseña'}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
