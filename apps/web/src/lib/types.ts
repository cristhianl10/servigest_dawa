import type {
  Priority,
  RequestStatus,
  Role,
  TechnicianLoadItem,
} from '@servigest/shared';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  clientId: string | null;
  status?: 'ACTIVO' | 'INACTIVO';
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface Client {
  id: string;
  ruc: string;
  businessName: string;
  tradeName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  status: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
  updatedAt: string;
  sites?: Site[];
}

export interface Site {
  id: string;
  clientId: string;
  name: string;
  address: string;
  city: string;
  contactName: string | null;
  contactPhone: string | null;
  status: 'ACTIVA' | 'INACTIVA';
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  siteId: string;
  code: string;
  name: string;
  assetType: string | null;
  serialNumber: string | null;
  status: 'OPERATIVO' | 'FUERA_SERVICIO';
  createdAt: string;
  updatedAt: string;
}

export interface Technician {
  id: string;
  userId: string;
  employeeCode: string;
  availability: 'DISPONIBLE' | 'NO_DISPONIBLE';
  maxConcurrentLoad: number;
  activeLoad: number;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: Role;
    status: 'ACTIVO' | 'INACTIVO';
  };
  specialties: Array<{
    specialtyId: number;
    code: string;
    name: string;
    level: 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Specialty {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: 'ACTIVA' | 'INACTIVA';
}

export interface ServiceCategory {
  id: number;
  code: string;
  name: string;
  specialtyId: number;
  specialty?: { id: number; code: string; name: string } | null;
  defaultPriority: Priority;
  status: 'ACTIVA' | 'INACTIVA';
}

export interface SystemParameter {
  key: string;
  value: unknown;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface Holiday {
  date: string;
  name: string;
}

export interface StatusCatalog {
  id: number;
  code: RequestStatus;
  name: string;
  isTerminal: boolean;
  sortOrder: number;
}

export interface RequestSummary {
  id: string;
  code: string;
  clientId: string;
  siteId: string;
  assetId: string | null;
  categoryId: number;
  priority: Priority;
  status: RequestStatus;
  statusId: number;
  description: string;
  resolution: string | null;
  cancellationReason: string | null;
  createdBy: string;
  assignedTechnicianId: string | null;
  dueAt: string;
  slaPausedMinutes: number;
  pausedAt: string | null;
  approvedAt: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; businessName: string };
  site?: { id: string; name: string; address: string };
  category?: { id: number; name: string; specialtyId: number };
  assignedTechnician?: { id: string; fullName: string } | null;
  isOverdue: boolean;
}

export interface HistoryEvent {
  id: number;
  requestId: string;
  actorId: string | null;
  action: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus | null;
  comment: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; fullName: string; role: Role } | null;
}

export interface Attachment {
  id: string;
  requestId: string;
  uploadedBy: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface RequestDetail extends RequestSummary {
  asset?: { id: string; code: string; name: string } | null;
  assignedTechnician?: {
    id: string;
    fullName: string;
    employeeCode: string;
  } | null;
  currentAssignment: {
    id: string;
    requestId: string;
    technicianId: string;
    assignedBy: string;
    reason: string | null;
    status: string;
    assignedAt: string;
    endedAt: string | null;
  } | null;
  history: HistoryEvent[];
  attachments: Attachment[];
}

export interface ListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unreadCount?: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: ListMeta;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  requestId: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export type { TechnicianLoadItem };
