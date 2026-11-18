-- ==============================================================================
-- SERVIGEST ECUADOR — Esquema de Base de Datos PostgreSQL 16
-- Conforme a docs/02-modelo-dominio.md y docs/01-especificacion.md
-- ==============================================================================

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ==============================================================================
-- 1. TABLAS BASE DE AUTENTICACIÓN Y ROLES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id SMALLINT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(60) NOT NULL
);

-- Inserción inicial de roles inmutables
INSERT INTO roles (id, code, name) VALUES
(1, 'ADMIN', 'Administrador del Sistema'),
(2, 'COORDINADOR', 'Coordinador de Servicios'),
(3, 'TECNICO', 'Personal Técnico de Mantenimiento'),
(4, 'CLIENTE', 'Cliente / Solicitante')
ON CONFLICT (id) DO NOTHING;

-- Clientes (Organizaciones)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ruc VARCHAR(13) NOT NULL UNIQUE,
    business_name VARCHAR(160) NOT NULL,
    trade_name VARCHAR(160),
    email CITEXT NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    status VARCHAR(15) NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'INACTIVO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(20),
    role_id SMALLINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
    status VARCHAR(15) NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'INACTIVO')),
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    failed_attempts SMALLINT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_user_client_role CHECK (
        (role_id = 4 AND client_id IS NOT NULL) OR
        (role_id != 4 AND client_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Sedes de Clientes
CREATE TABLE IF NOT EXISTS client_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    name VARCHAR(120) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(80) NOT NULL DEFAULT 'Guayaquil',
    contact_name VARCHAR(120),
    contact_phone VARCHAR(20),
    status VARCHAR(15) NOT NULL DEFAULT 'ACTIVA' CHECK (status IN ('ACTIVA', 'INACTIVA')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_site_client_name UNIQUE (client_id, name)
);

-- Equipos / Recursos
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES client_sites(id) ON DELETE RESTRICT,
    code VARCHAR(40) NOT NULL,
    name VARCHAR(120) NOT NULL,
    asset_type VARCHAR(60),
    serial_number VARCHAR(80),
    status VARCHAR(20) NOT NULL DEFAULT 'OPERATIVO' CHECK (status IN ('OPERATIVO', 'FUERA_SERVICIO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_asset_site_code UNIQUE (site_id, code)
);

-- ==============================================================================
-- 2. TÉCNICOS Y ESPECIALIDADES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_code VARCHAR(20) NOT NULL UNIQUE,
    availability VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE' CHECK (availability IN ('DISPONIBLE', 'NO_DISPONIBLE')),
    max_concurrent_load SMALLINT NOT NULL DEFAULT 5 CHECK (max_concurrent_load > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS specialties (
    id SMALLSERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(15) NOT NULL DEFAULT 'ACTIVA' CHECK (status IN ('ACTIVA', 'INACTIVA'))
);

CREATE TABLE IF NOT EXISTS technician_specialties (
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    specialty_id SMALLINT NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT,
    level VARCHAR(15) NOT NULL DEFAULT 'INTERMEDIO' CHECK (level IN ('BASICO', 'INTERMEDIO', 'AVANZADO')),
    PRIMARY KEY (technician_id, specialty_id)
);

CREATE TABLE IF NOT EXISTS service_categories (
    id SMALLSERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    specialty_id SMALLINT NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT,
    default_priority VARCHAR(10) NOT NULL DEFAULT 'MEDIA' CHECK (default_priority IN ('CRITICA', 'ALTA', 'MEDIA', 'BAJA')),
    status VARCHAR(15) NOT NULL DEFAULT 'ACTIVA' CHECK (status IN ('ACTIVA', 'INACTIVA'))
);

-- ==============================================================================
-- 3. ESTADOS Y GESTIÓN DE SOLICITUDES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS request_statuses (
    id SMALLINT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(60) NOT NULL,
    is_terminal BOOLEAN NOT NULL DEFAULT false,
    sort_order SMALLINT NOT NULL
);

INSERT INTO request_statuses (id, code, name, is_terminal, sort_order) VALUES
(1, 'REGISTRADA', 'Registrada', false, 1),
(2, 'APROBADA', 'Aprobada', false, 2),
(3, 'ASIGNADA', 'Asignada', false, 3),
(4, 'EN_PROCESO', 'En Proceso', false, 4),
(5, 'PENDIENTE_INFO', 'Pendiente de Información', false, 5),
(6, 'RESUELTA', 'Resuelta', false, 6),
(7, 'CERRADA', 'Cerrada', true, 7),
(8, 'CANCELADA', 'Cancelada', true, 8)
ON CONFLICT (id) DO NOTHING;

-- Secuencia para códigos anuales de solicitud: SOL-YYYYMM-#####
CREATE TABLE IF NOT EXISTS request_code_sequences (
    period VARCHAR(6) PRIMARY KEY, -- 'YYYYMM'
    last_value INTEGER NOT NULL DEFAULT 0
);

-- Solicitudes de servicio
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    site_id UUID NOT NULL REFERENCES client_sites(id) ON DELETE RESTRICT,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    category_id SMALLINT NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('CRITICA', 'ALTA', 'MEDIA', 'BAJA')),
    status_id SMALLINT NOT NULL REFERENCES request_statuses(id) ON DELETE RESTRICT,
    description TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 2000),
    resolution TEXT CHECK (resolution IS NULL OR char_length(resolution) >= 30),
    cancellation_reason TEXT CHECK (cancellation_reason IS NULL OR char_length(cancellation_reason) >= 10),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    due_at TIMESTAMPTZ NOT NULL,
    sla_paused_minutes INTEGER NOT NULL DEFAULT 0,
    paused_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    assigned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requests_status_id ON service_requests(status_id);
CREATE INDEX IF NOT EXISTS idx_requests_priority ON service_requests(priority);
CREATE INDEX IF NOT EXISTS idx_requests_client_created ON service_requests(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_status ON service_requests(assigned_technician_id, status_id);
CREATE INDEX IF NOT EXISTS idx_requests_due_at ON service_requests(due_at);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON service_requests(created_at);

-- Asignaciones
CREATE TABLE IF NOT EXISTS request_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE RESTRICT,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE RESTRICT,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT CHECK (reason IS NULL OR char_length(reason) >= 10),
    status VARCHAR(15) NOT NULL DEFAULT 'VIGENTE' CHECK (status IN ('VIGENTE', 'FINALIZADA')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ
);

-- Garantiza solo una asignación VIGENTE por solicitud
CREATE UNIQUE INDEX IF NOT EXISTS uq_request_assignment_active 
ON request_assignments (request_id) 
WHERE status = 'VIGENTE';

-- Historial inmutable (Append-Only)
CREATE TABLE IF NOT EXISTS request_history (
    id BIGSERIAL PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE RESTRICT,
    actor_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(30) NOT NULL CHECK (action IN ('CREACION', 'TRANSICION', 'ASIGNACION', 'REASIGNACION', 'REAPERTURA', 'EDICION', 'ADJUNTO')),
    from_status VARCHAR(20),
    to_status VARCHAR(20),
    comment TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_request_created ON request_history(request_id, created_at);

-- Archivos adjuntos
CREATE TABLE IF NOT EXISTS request_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL CHECK (mime_type IN ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')),
    size_bytes INTEGER NOT NULL CHECK (size_bytes <= 10485760),
    storage_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. NOTIFICACIONES Y SESIONES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
    type VARCHAR(40) NOT NULL CHECK (type IN ('SOLICITUD_REGISTRADA', 'ASIGNACION', 'CAMBIO_ESTADO', 'INFO_REQUERIDA', 'CIERRE', 'REAPERTURA')),
    title VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at, created_at DESC);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. CONFIGURACIÓN Y CALENDARIO LABORAL (SLA)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS system_parameters (
    key VARCHAR(60) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holidays (
    date DATE PRIMARY KEY,
    name VARCHAR(120) NOT NULL
);

-- ==============================================================================
-- 6. PARÁMETROS Y FERIADOS INICIALES (SLA)
-- ==============================================================================

INSERT INTO system_parameters (key, value, description) VALUES
('sla.critica.hours', '4'::jsonb, 'Horas de atención para solicitudes críticas'),
('sla.alta.hours', '8'::jsonb, 'Horas de atención para solicitudes de prioridad alta'),
('sla.media.hours', '24'::jsonb, 'Horas de atención para solicitudes de prioridad media'),
('sla.baja.hours', '72'::jsonb, 'Horas de atención para solicitudes de prioridad baja'),
('work.calendar.start', '"08:00"'::jsonb, 'Hora de inicio de la jornada laboral'),
('work.calendar.end', '"17:00"'::jsonb, 'Hora de fin de la jornada laboral'),
('work.calendar.lunch_start', '"13:00"'::jsonb, 'Hora de inicio de receso/almuerzo'),
('work.calendar.lunch_end', '"14:00"'::jsonb, 'Hora de fin de receso/almuerzo'),
('technician.default.max_load', '5'::jsonb, 'Carga máxima simultánea por técnico')
ON CONFLICT (key) DO NOTHING;

-- Feriados de Guayaquil / Ecuador para el ciclo 2026 (orientativo para pruebas SLA)
INSERT INTO holidays (date, name) VALUES
('2026-01-01', 'Año Nuevo'),
('2026-02-16', 'Carnaval Lunes'),
('2026-02-17', 'Carnaval Martes'),
('2026-04-03', 'Viernes Santo'),
('2026-05-01', 'Día del Trabajo'),
('2026-05-25', 'Batalla de Pichincha'),
('2026-07-25', 'Fundación de Guayaquil'),
('2026-08-10', 'Primer Grito de Independencia'),
('2026-10-09', 'Independencia de Guayaquil'),
('2026-11-02', 'Día de los Difuntos'),
('2026-11-03', 'Independencia de Cuenca'),
('2026-12-25', 'Navidad')
ON CONFLICT (date) DO NOTHING;
