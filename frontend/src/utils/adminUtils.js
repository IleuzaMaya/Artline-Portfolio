// frontend/src/utils/adminUtils.js

import { isUuid, normalizeEmail } from "./string";

export function getAccId(acc) {
  return String(acc?.user_id || acc?.id || "").trim();
}

export function getRowKey(acc) {
  const accId = getAccId(acc);
  if (isUuid(accId)) return accId;

  const email = normalizeEmail(acc?.email);
  return email ? `email:${email}` : "";
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}