const roleLabels: Record<string, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  OPERATOR: "Operador",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  SUSPENDED: "Suspendido",
  ARCHIVED: "Archivado",
};

export function organizationRoleLabel(role: string) {
  return roleLabels[role] ?? role;
}

export function organizationStatusLabel(status: string) {
  return statusLabels[status] ?? status;
}
