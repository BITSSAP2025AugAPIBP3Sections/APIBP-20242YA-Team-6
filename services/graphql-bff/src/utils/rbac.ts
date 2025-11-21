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
    canDeleteEvent: true, // Can delete own events
    canViewAllEvents: true,

    // Vendors
    canCreateVendor: true,
    canUpdateVendor: true,
    canDeleteVendor: true, // Can delete vendors for own events

    // Tasks
    canCreateTask: true,
    canUpdateTask: true,
    canDeleteTask: true, // Can delete tasks for own events
    canViewAllTasks: false, // Only see tasks for own events

    // Attendees
    canCreateRSVP: true,
    canUpdateRSVP: true,
    canViewAllAttendees: false, // Only see attendees for own events

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
    canCreateRSVP: false,
    canUpdateRSVP: false,
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

  // Check if user can access/modify an event (for organizers: own events only)
  static canAccessEvent(
    userRole: string | undefined,
    userId: number | undefined,
    eventOrganizerId: number
  ): boolean {
    if (!userRole || !userId) return false;

    // Admins can access all events
    if (userRole === UserRole.ADMIN) return true;

    // Organizers can only access their own events
    if (userRole === UserRole.ORGANIZER) {
      return userId === eventOrganizerId;
    }

    return false;
  }

  // Check if user can access/modify a task (vendors: only their own tasks)
  static canAccessTask(
    userRole: string | undefined,
    userId: number | undefined,
    taskVendorId: number | null
  ): boolean {
    if (!userRole || !userId) return false;

    // Admins can access all tasks
    if (userRole === UserRole.ADMIN) return true;

    // Vendors can only access tasks assigned to them
    if (userRole === UserRole.VENDOR && taskVendorId) {
      return userId === taskVendorId;
    }

    return false;
  }

  // Check if user can access/modify an RSVP (attendees: only their own RSVPs)
  static canAccessRSVP(
    userRole: string | undefined,
    userId: number | undefined,
    rsvpUserId: number
  ): boolean {
    if (!userRole || !userId) return false;

    // Admins can access all RSVPs
    if (userRole === UserRole.ADMIN) return true;

    // Attendees can only access their own RSVPs
    if (userRole === UserRole.ATTENDEE) {
      return userId === rsvpUserId;
    }

    return false;
  }

  // Check if organizer owns the event
  static requireEventOwnership(
    userRole: string | undefined,
    userId: number | undefined,
    eventOrganizerId: number
  ): void {
    if (!userRole || !userId) {
      throw new RBACError('Not authenticated');
    }

    if (userRole === UserRole.ADMIN) {
      return; // Admins have full access
    }

    if (userRole === UserRole.ORGANIZER && userId === eventOrganizerId) {
      return; // Organizer owns this event
    }

    throw new RBACError('You can only manage your own events');
  }
}
