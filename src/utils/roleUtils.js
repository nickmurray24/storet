import { APP_MODES, USER_ROLES } from "../constants/appEnums";

export function normalizeUserRole(role) {
  if (role === USER_ROLES.HOST || role === USER_ROLES.BOTH) {
    return role;
  }

  return USER_ROLES.RENTER;
}

export function normalizeAppMode(mode) {
  return mode === APP_MODES.HOST ? APP_MODES.HOST : APP_MODES.RENTER;
}

export function getUserCapabilityModes(user = {}) {
  const role = normalizeUserRole(user?.role);

  if (role === USER_ROLES.HOST) {
    return [APP_MODES.HOST];
  }

  if (role === USER_ROLES.BOTH) {
    return [APP_MODES.RENTER, APP_MODES.HOST];
  }

  return [APP_MODES.RENTER];
}

export function userCanUseMode(user = {}, mode) {
  return getUserCapabilityModes(user).includes(normalizeAppMode(mode));
}

export function userCanUseHostMode(user = {}) {
  return userCanUseMode(user, APP_MODES.HOST);
}

export function userCanUseRenterMode(user = {}) {
  return userCanUseMode(user, APP_MODES.RENTER);
}

export function getDefaultModeForUser(user = {}, preferredMode = APP_MODES.RENTER) {
  const capabilityModes = getUserCapabilityModes(user);
  const normalizedPreferredMode = normalizeAppMode(preferredMode);

  if (capabilityModes.includes(normalizedPreferredMode)) {
    return normalizedPreferredMode;
  }

  return capabilityModes[0] || APP_MODES.RENTER;
}

export function getModeDisplayLabel(mode) {
  return normalizeAppMode(mode) === APP_MODES.HOST ? "Host" : "Renter";
}

export function getNextRoleForHostUpgrade(role) {
  const normalizedRole = normalizeUserRole(role);

  if (normalizedRole === USER_ROLES.RENTER) {
    return USER_ROLES.BOTH;
  }

  return normalizedRole;
}


export function getNextRoleForRenterUpgrade(role) {
  const normalizedRole = normalizeUserRole(role);

  if (normalizedRole === USER_ROLES.HOST) {
    return USER_ROLES.BOTH;
  }

  return normalizedRole;
}
