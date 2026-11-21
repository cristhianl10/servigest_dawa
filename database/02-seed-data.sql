-- ==============================================================================
-- SERVIGEST ECUADOR — Semilla Inicial de Datos (Seed Base)
-- Conforme a docs/02-modelo-dominio.md y docs/08-despliegue.md
-- ==============================================================================

-- Hash Bcrypt para "ServiGest2026*" (costo 10)
-- $2a$10$y5degXN5I5iLJ8JziN2iSOgs4CLNOf05DOytFPhyP7OeVMGIymV8u

-- 1. Clientes
INSERT INTO clients (id, ruc, business_name, trade_name, email, phone, address, status) VALUES
('11111111-1111-1111-1111-111111111111', '0992345678001', 'Banco de Guayaquil S.A.', 'Banco Guayaquil', 'contacto@bancoguayaquil.com', '042599999', 'Pichincha y P. Icaza', 'ACTIVO'),
('22222222-2222-2222-2222-222222222222', '0991234567001', 'Corporación Favorita C.A.', 'Supermaxi Guayaquil', 'servicios@favorita.ec', '042888888', 'Av. Juan Tanca Marengo Km 2.5', 'ACTIVO'),
('33333333-3333-3333-3333-333333333333', '0960000220001', 'Universidad de Guayaquil', 'Facultad de Ciencias Matemáticas y Físicas', 'dawa@ug.edu.ec', '042288055', 'Av. Delta y Kennedy', 'ACTIVO')
ON CONFLICT (id) DO NOTHING;

-- 2. Sedes de Clientes
INSERT INTO client_sites (id, client_id, name, address, city, contact_name, contact_phone, status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Matriz Centro', 'Pichincha 107 y P. Icaza', 'Guayaquil', 'Carlos Benites', '0991112233', 'ACTIVA'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Agencia Samborondón', 'Km 1.5 Vía Samborondón, C.C. Las Terrazas', 'Samborondón', 'Maria Perez', '0992223344', 'ACTIVA'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Hipermercado Policentro', 'Av. Periodista y Cdla. Nueva Kennedy', 'Guayaquil', 'Jorge Ramirez', '0993334455', 'ACTIVA'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'Campus Salvador Allende - Edificio Carrera Software', 'Av. Kennedy y Av. Delta', 'Guayaquil', 'Ing. Cristhian Loor', '0994445566', 'ACTIVA')
ON CONFLICT (id) DO NOTHING;

-- 3. Equipos / Recursos
INSERT INTO assets (id, site_id, code, name, asset_type, serial_number, status) VALUES
('e1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SRV-01', 'Servidor Central de Operaciones Dell PowerEdge', 'Servidor', 'SN-DELL-883921', 'OPERATIVO'),
('e2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'AC-P1-01', 'Aire Acondicionado Central Piso 1 Carrier 60k BTU', 'Climatización', 'SN-CARR-10293', 'OPERATIVO'),
('e3333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'LAB-SW-04', 'Rack Central de Comunicaciones Cisco Catalyst', 'Redes', 'SN-CISCO-99201', 'OPERATIVO')
ON CONFLICT (id) DO NOTHING;

-- 4. Especialidades Técnicas
INSERT INTO specialties (id, code, name, description, status) VALUES
(1, 'REDES_COM', 'Redes y Telecomunicaciones', 'Cableado estructurado, switches, routers y fibra óptica', 'ACTIVA'),
(2, 'CLIMATIZACION', 'Climatización y Refrigeración', 'Mantenimiento preventivo y correctivo de splits y centrales', 'ACTIVA'),
(3, 'SERVIDORES', 'Infraestructura de Servidores y Centros de Datos', 'Hardware, almacenamiento SAN/NAS y UPS de potencia', 'ACTIVA'),
(4, 'ELECTRICIDAD', 'Sistemas Eléctricos y Energía Ininterrumpida', 'Generadores, tableros de transferencia y transformadores', 'ACTIVA')
ON CONFLICT (id) DO NOTHING;

-- 5. Categorías de Servicio
INSERT INTO service_categories (id, code, name, specialty_id, default_priority, status) VALUES
(1, 'FALLA_CONECTIVIDAD', 'Interrupción de Enlace o Falla de Red', 1, 'ALTA', 'ACTIVA'),
(2, 'MANT_CLIMA_SALA_SERV', 'Falla de Enfriamiento en Centro de Datos', 2, 'CRITICA', 'ACTIVA'),
(3, 'CAIDA_SERVIDOR', 'Indisponibilidad de Servidor Físico / Virtual', 3, 'CRITICA', 'ACTIVA'),
(4, 'MANT_PREVENTIVO_UPS', 'Mantenimiento Preventivo de Sistema UPS', 4, 'MEDIA', 'ACTIVA'),
(5, 'INSTALACION_PUESTO_RED', 'Instalación de Punto de Red Cat6A', 1, 'BAJA', 'ACTIVA')
ON CONFLICT (id) DO NOTHING;

-- 6. Usuarios del Sistema (Password: "ServiGest2026*")
-- Password hash: $2a$10$w8k2fDkHQb6r/4G34K6xNu3yMbmP8uYd5vJj8ZfL6iRz0Xw4qPzqm
INSERT INTO users (id, email, password_hash, full_name, phone, role_id, client_id, status) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@servigest.ec', '$2a$10$y5degXN5I5iLJ8JziN2iSOgs4CLNOf05DOytFPhyP7OeVMGIymV8u', 'Administrador General', '0990000001', 1, NULL, 'ACTIVO'),
('00000000-0000-0000-0000-000000000002', 'coordinador@servigest.ec', '$2a$10$y5degXN5I5iLJ8JziN2iSOgs4CLNOf05DOytFPhyP7OeVMGIymV8u', 'Ing. Ana Torres (Coordinación)', '0990000002', 2, NULL, 'ACTIVO'),
('00000000-0000-0000-0000-000000000003', 'tecnico@servigest.ec', '$2a$10$y5degXN5I5iLJ8JziN2iSOgs4CLNOf05DOytFPhyP7OeVMGIymV8u', 'Luis Vera (Técnico Redes y Servidores)', '0990000003', 3, NULL, 'ACTIVO'),
('00000000-0000-0000-0000-000000000004', 'cliente@servigest.ec', '$2a$10$y5degXN5I5iLJ8JziN2iSOgs4CLNOf05DOytFPhyP7OeVMGIymV8u', 'Carlos Benites (Banco Guayaquil)', '0990000004', 4, '11111111-1111-1111-1111-111111111111', 'ACTIVO')
ON CONFLICT (id) DO NOTHING;

-- 7. Registro de Técnico y Acreditación de Especialidades
INSERT INTO technicians (id, user_id, employee_code, availability, max_concurrent_load) VALUES
('11111111-aaaa-aaaa-aaaa-111111111111', '00000000-0000-0000-0000-000000000003', 'TEC-001', 'DISPONIBLE', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO technician_specialties (technician_id, specialty_id, level) VALUES
('11111111-aaaa-aaaa-aaaa-111111111111', 1, 'AVANZADO'),
('11111111-aaaa-aaaa-aaaa-111111111111', 3, 'AVANZADO')
ON CONFLICT (technician_id, specialty_id) DO NOTHING;

-- 8. Solicitud Semilla para Pruebas Inmediatas
INSERT INTO request_code_sequences (period, last_value) VALUES ('202611', 1)
ON CONFLICT (period) DO NOTHING;

INSERT INTO service_requests (
    id, code, client_id, site_id, asset_id, category_id, priority, status_id,
    description, created_by, due_at, version, created_at
) VALUES (
    '22222222-aaaa-aaaa-aaaa-222222222222',
    'SOL-202611-00001',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'e1111111-1111-1111-1111-111111111111',
    3, -- CAIDA_SERVIDOR
    'CRITICA',
    1, -- REGISTRADA
    'Falla crítica en servidor principal de base de datos. Se requiere revisión inmediata del equipo.',
    '00000000-0000-0000-0000-000000000004',
    now() + interval '4 hours',
    1,
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO request_history (request_id, actor_id, action, to_status, comment) VALUES
('22222222-aaaa-aaaa-aaaa-222222222222', '00000000-0000-0000-0000-000000000004', 'CREACION', 'REGISTRADA', 'Solicitud registrada por el cliente Banco de Guayaquil')
ON CONFLICT DO NOTHING;
