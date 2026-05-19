const USER_ROLES = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
}

const ADMIN_LEVELS = {
  SUPER_ADMIN: 'super_admin',
  SUB_ADMIN: 'sub_admin',
  CUSTOMER: 'customer',
}

function getSuperAdminEmailSet() {
  const rawAdminEmails = String(process.env.SUPER_ADMIN_EMAILS || process.env.ADMIN_EMAILS || '')

  return new Set(
    rawAdminEmails
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

function isSuperAdminEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase()

  if (!normalizedEmail) {
    return false
  }

  return getSuperAdminEmailSet().has(normalizedEmail)
}

function resolveUserAccess(user = {}) {
  const isSuperAdmin = isSuperAdminEmail(user?.email)
  const normalizedRole = String(user?.role || '').trim().toLowerCase()

  const hasSubAdminRole = normalizedRole === USER_ROLES.ADMIN
  const hasAdminAccess = isSuperAdmin || hasSubAdminRole

  if (isSuperAdmin) {
    return {
      role: USER_ROLES.ADMIN,
      isSuperAdmin: true,
      canManageAdmins: true,
      adminLevel: ADMIN_LEVELS.SUPER_ADMIN,
    }
  }

  if (hasAdminAccess) {
    return {
      role: USER_ROLES.ADMIN,
      isSuperAdmin: false,
      canManageAdmins: false,
      adminLevel: ADMIN_LEVELS.SUB_ADMIN,
    }
  }

  return {
    role: USER_ROLES.CUSTOMER,
    isSuperAdmin: false,
    canManageAdmins: false,
    adminLevel: ADMIN_LEVELS.CUSTOMER,
  }
}

function resolveUserRole(user = {}) {
  return resolveUserAccess(user).role
}

export { USER_ROLES, ADMIN_LEVELS, getSuperAdminEmailSet, isSuperAdminEmail, resolveUserAccess, resolveUserRole }
