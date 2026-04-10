function getAdminUserIds(): string[] {
  const v = process.env.ADMIN_USER_IDS;
  if (!v) return [];
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

export function isAdmin(userId: string): boolean {
  return getAdminUserIds().includes(userId);
}
