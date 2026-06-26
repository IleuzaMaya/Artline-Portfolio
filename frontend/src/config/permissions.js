// frontend/src/config/permissions.js

import { SYSTEM } from "./system";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isPrimaryUser(email) {
  return normalizeEmail(email) === normalizeEmail(SYSTEM.PRIMARY_SYSTEM_EMAIL);
}

export function isSuperAdmin(email) {
  return SYSTEM.SUPER_ADMINS
    .map(normalizeEmail)
    .includes(normalizeEmail(email));
}

export function canDeactivateUser(currentEmail, targetEmail) {
  if (isPrimaryUser(targetEmail)) return false;
  if (normalizeEmail(currentEmail) === normalizeEmail(targetEmail)) return false;

  return isSuperAdmin(currentEmail);
}

export function canDeleteUser(currentEmail, targetEmail) {
  if (isPrimaryUser(targetEmail)) return false;

  return isSuperAdmin(currentEmail);
}

export function canResetPassword(currentEmail, targetEmail) {
  return normalizeEmail(currentEmail) === normalizeEmail(targetEmail);
}

export function canEditPermissions(currentEmail) {
  return isSuperAdmin(currentEmail);
}
