export enum UserRole {
  ADMIN = 'admin',
  ORGANIZER = 'organizer',
  VENDOR = 'vendor',
  ATTENDEE = 'attendee',
}

export interface RBACPermissions {
  // Events
  canCreateEvent: boolean;
  canUpdateEvent: boolean;
  canDeleteEvent: boolean;
  canViewAllEvents: boolean;

  // Vendors
  canCreateVendor: boolean;
  canUpdateVendor: boolean;
  canDeleteVendor: boolean;

  // Tasks
  canCreateTask: boolean;
  canUpdateTask: boolean;
  canDeleteTask: boolean;
  canViewAllTasks: boolean;

  // Attendees
  canCreateRSVP: boolean;
  canUpdateRSVP: boolean;
  canViewAllAttendees: boolean;

  // Notifications
  canCreateNotification: boolean;
  canSendToAll: boolean;
}

// Role-based permission matrix
export const ROLE_PERMISSIONS: Record<UserRole, RBACPermissions> = {
  [UserRole.ADMIN]: {
    // Events
    canCreateEvent: true,
    canUpdateEvent: true,
    canDeleteEvent: true,
    canViewAllEvents: true,

    // Vendors
    canCreateVendor: true,
    canUpdateVendor: true,
    canDeleteVendor: true,

    // Tasks
    canCreateTask: true,
    canUpdateTask: true,
    canDeleteTask: true,
    canViewAllTasks: true,

    // Attendees
    canCreateRSVP: true,
    canUpdateRSVP: true,
    canViewAllAttendees: true,

    // Notifications
    canCreateNotification: true,
    canSendToAll: true,
  },

  [UserRole.ORGANIZER]: {
    // Events
    canCreateEvent: true,
    canUpdateEvent: true,
    canDeleteEvent: false, // Only own events
    canViewAllEvents: true,

    // Vendors
    canCreateVendor: true,
    canUpdateVendor: true,
    canDeleteVendor: false,

    // Tasks
    canCreateTask: true,
    canUpdateTask: true,
    canDeleteTask: false,
    canViewAllTasks: true,

    // Attendees
    canCreateRSVP: true,
    canUpdateRSVP: true,
    canViewAllAttendees: true,

    // Notifications
    canCreateNotification: true,
    canSendToAll: false,
  },

  [UserRole.VENDOR]: {
    // Events
    canCreateEvent: false,
    canUpdateEvent: false,
    canDeleteEvent: false,
    canViewAllEvents: true,

    // Vendors
    canCreateVendor: false,
    canUpdateVendor: true, // Only own profile
    canDeleteVendor: false,

    // Tasks
    canCreateTask: false,
    canUpdateTask: true, // Only assigned tasks
    canDeleteTask: false,
    canViewAllTasks: false, // Only own tasks

    // Attendees
    canCreateRSVP: true,
    canUpdateRSVP: true,
    canViewAllAttendees: false,

    // Notifications
    canCreateNotification: false,
    canSendToAll: false,
  },

  [UserRole.ATTENDEE]: {
    // Events
    canCreateEvent: false,
    canUpdateEvent: false,
    canDeleteEvent: false,
    canViewAllEvents: true,

    // Vendors
    canCreateVendor: false,
    canUpdateVendor: false,
    canDeleteVendor: false,

    // Tasks
    canCreateTask: false,
    canUpdateTask: false,
    canDeleteTask: false,
    canViewAllTasks: false,

    // Attendees
    canCreateRSVP: true,
    canUpdateRSVP: true, // Only own RSVPs
    canViewAllAttendees: false,

    // Notifications
    canCreateNotification: false,
    canSendToAll: false,
  },
};

export class RBACError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'RBACError';
  }
}

export class AuthorizationService {
  static getPermissions(role: string): RBACPermissions {
    return ROLE_PERMISSIONS[role as UserRole] || ROLE_PERMISSIONS[UserRole.ATTENDEE];
  }

  static hasPermission(role: string, permission: keyof RBACPermissions): boolean {
    const permissions = this.getPermissions(role);
    return permissions[permission] || false;
  }

  static requirePermission(role: string | undefined, permission: keyof RBACPermissions): void {
    if (!role) {
      throw new RBACError('Not authenticated');
    }

    if (!this.hasPermission(role, permission)) {
      throw new RBACError(`Insufficient permissions: ${permission} required`);
    }
  }

  static requireRole(userRole: string | undefined, ...allowedRoles: UserRole[]): void {
    if (!userRole) {
      throw new RBACError('Not authenticated');
    }

    if (!allowedRoles.includes(userRole as UserRole)) {
      throw new RBACError(`Role ${userRole} not allowed. Required: ${allowedRoles.join(', ')}`);
    }
  }

  static canAccessResource(
    userRole: string | undefined,
    userId: number | undefined,
    resourceOwnerId: number
  ): boolean {
    if (!userRole || !userId) return false;

    // Admins can access everything
    if (userRole === UserRole.ADMIN) return true;

    // Users can access their own resources
    return userId === resourceOwnerId;
  }
}
