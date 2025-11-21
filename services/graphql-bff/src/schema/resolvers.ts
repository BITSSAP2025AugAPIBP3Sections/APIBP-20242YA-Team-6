import { AuthorizationService, RBACError } from '../utils/rbac';

export const resolvers = {
  Query: {
    // Auth
    me: async (_: any, __: any, { dataSources, user }: any) => {
      if (!user) throw new RBACError('Not authenticated. Please include your token in the Authorization header.');
      return dataSources.authService.get(`/v1/users/${user.id}`);
    },

    // Events
    events: async (_: any, { page = 1, limit = 10, sort, filter }: any, { dataSources, user }: any) => {
      if (!user) {
        throw new RBACError('Authentication required. Login with the "login" mutation and add the token to Headers: {"Authorization": "Bearer YOUR_TOKEN"}');
      }
      const params: any = { page, page_size: limit };
      if (sort) params.sort_by = sort;
      if (filter) params.filter = filter;
      const response = await dataSources.eventsService.get('/v1/events', params);
      // Transform response to match GraphQL schema
      return {
        data: response.events || [],
        pagination: {
          total: response.pagination?.total_count || 0,
          page: response.pagination?.current_page || page,
          limit: response.pagination?.page_size || limit,
          totalPages: response.pagination?.total_pages || 1,
        }
      };
    },
    event: async (_: any, { id }: any, { dataSources, user }: any) => {
      if (!user) {
        throw new RBACError('Authentication required. Login with the "login" mutation and add the token to Headers: {"Authorization": "Bearer YOUR_TOKEN"}');
      }
      return dataSources.eventsService.get(`/v1/events/${id}`);
    },

    // Vendors
    vendors: async (_: any, { page = 1, limit = 10 }: any, { dataSources, user }: any) => {
      if (!user) {
        throw new RBACError('Authentication required. Login with the "login" mutation and add the token to Headers: {"Authorization": "Bearer YOUR_TOKEN"}');
      }
      const response = await dataSources.vendorsService.get('/v1/vendors', { page, page_size: limit });
      return {
        data: response.vendors || [],
        pagination: {
          total: response.pagination?.total_count || 0,
          page: response.pagination?.current_page || page,
          limit: response.pagination?.page_size || limit,
          totalPages: response.pagination?.total_pages || 1,
        }
      };
    },
    vendor: async (_: any, { id }: any, { dataSources, user }: any) => {
      if (!user) {
        throw new RBACError('Authentication required. Login with the "login" mutation and add the token to Headers: {"Authorization": "Bearer YOUR_TOKEN"}');
      }
      return dataSources.vendorsService.get(`/v1/vendors/${id}`);
    },

    // Tasks
    tasks: async (_: any, { page = 1, limit = 10, eventId }: any, { dataSources, user }: any) => {
      if (!user) {
        throw new RBACError('Authentication required. Login with the "login" mutation and add the token to Headers: {"Authorization": "Bearer YOUR_TOKEN"}');
      }
      const params: any = { page, page_size: limit };
      if (eventId) params.eventId = eventId;
      const response = await dataSources.tasksService.get('/v1/tasks', params);
      return {
        data: response.tasks || [],
        pagination: {
          total: response.pagination?.total_count || 0,
          page: response.pagination?.current_page || page,
          limit: response.pagination?.page_size || limit,
          totalPages: response.pagination?.total_pages || 1,
        }
      };
    },
    task: async (_: any, { id }: any, { dataSources, user }: any) => {
      if (!user) {
        throw new RBACError('Authentication required. Login with the "login" mutation and add the token to Headers: {"Authorization": "Bearer YOUR_TOKEN"}');
      }
      return dataSources.tasksService.get(`/v1/tasks/${id}`);
    },

    // Attendees
    attendees: async (_: any, { page = 1, limit = 10, eventId }: any, { dataSources, user }: any) => {
      if (!user) {
        throw new RBACError('Authentication required. Login with the "login" mutation and add the token to Headers: {"Authorization": "Bearer YOUR_TOKEN"}');
      }
      const params: any = { page, page_size: limit };
      if (eventId) params.eventId = eventId;
      const response = await dataSources.attendeesService.get('/v1/attendees', params);
      return {
        data: response.attendees || [],
        pagination: {
          total: response.pagination?.total_count || 0,
          page: response.pagination?.current_page || page,
          limit: response.pagination?.page_size || limit,
          totalPages: response.pagination?.total_pages || 1,
        }
      };
    },
    attendee: async (_: any, { id }: any, { dataSources, user }: any) => {
      if (!user) {
        throw new RBACError('Authentication required. Login with the "login" mutation and add the token to Headers: {"Authorization": "Bearer YOUR_TOKEN"}');
      }
      return dataSources.attendeesService.get(`/v1/attendees/${id}`);
    },

    // Notifications
    notifications: async (_: any, { page = 1, limit = 10, recipientId }: any, { dataSources, user }: any) => {
      if (!user) {
        throw new RBACError('Authentication required. Login with the "login" mutation and add the token to Headers: {"Authorization": "Bearer YOUR_TOKEN"}');
      }
      const params: any = { page, page_size: limit };
      if (recipientId) params.recipientId = recipientId;
      const response = await dataSources.notificationsService.get('/v1/notifications', params);
      return {
        data: response.notifications || [],
        pagination: {
          total: response.pagination?.total_count || 0,
          page: response.pagination?.current_page || page,
          limit: response.pagination?.page_size || limit,
          totalPages: response.pagination?.total_pages || 1,
        }
      };
    },
    notification: async (_: any, { id }: any, { dataSources, user }: any) => {
      if (!user) {
        throw new RBACError('Authentication required. Login with the "login" mutation and add the token to Headers: {"Authorization": "Bearer YOUR_TOKEN"}');
      }
      return dataSources.notificationsService.get(`/v1/notifications/${id}`);
    },

    // Aggregated Queries
    eventWithDetails: async (_: any, { id }: any, { dataSources, user }: any) => {
      if (!user) {
        throw new RBACError('Authentication required. Login with the "login" mutation and add the token to Headers: {"Authorization": "Bearer YOUR_TOKEN"}');
      }
      const [event, tasks, attendees] = await Promise.all([
        dataSources.eventsService.get(`/v1/events/${id}`),
        dataSources.tasksService.get('/v1/tasks', { eventId: id, limit: 100 }),
        dataSources.attendeesService.get('/v1/attendees', { eventId: id, limit: 100 }),
      ]);

      // Get unique vendor IDs from tasks
      const vendorIds = [...new Set(tasks.data?.map((t: any) => t.vendorId).filter(Boolean))];
      const vendors = vendorIds.length > 0
        ? await Promise.all(vendorIds.map(vid => dataSources.vendorsService.get(`/vendors/${vid}`).catch(() => null)))
        : [];

      return {
        event,
        tasks: tasks.data || [],
        attendees: attendees.data || [],
        vendors: vendors.filter(Boolean),
      };
    },

    userDashboard: async (_: any, __: any, { dataSources, user }: any) => {
      if (!user) throw new RBACError('Not authenticated');

      const [userData, rsvps, tasks, notifications] = await Promise.all([
        dataSources.authService.get(`/v1/users/${user.id}`),
        dataSources.attendeesService.get('/v1/attendees', { userId: user.id, limit: 100 }),
        dataSources.tasksService.get('/v1/tasks', { userId: user.id, limit: 100 }),
        dataSources.notificationsService.get('/v1/notifications', { recipientId: user.id, read: false, limit: 50 }),
      ]);

      // Get events from RSVPs
      const eventIds = rsvps.data?.map((r: any) => r.eventId) || [];
      const events = eventIds.length > 0
        ? await Promise.all(eventIds.map((eid: number) => dataSources.eventsService.get(`/v1/events/${eid}`).catch(() => null)))
        : [];

      return {
        user: userData,
        upcomingEvents: events.filter(Boolean),
        myRSVPs: rsvps.data || [],
        myTasks: tasks.data || [],
        unreadNotifications: notifications.data || [],
      };
    },
  },

  Mutation: {
    // Auth
    register: async (_: any, { email, password, role }: any, { dataSources }: any) => {
      const result = await dataSources.authService.post('/v1/auth/register', { email, password, role });
      // After registration, login to get token
      const loginResult = await dataSources.authService.post('/v1/auth/login', { email, password });
      return { token: loginResult.token, user: result };
    },
    login: async (_: any, { email, password }: any, { dataSources }: any) => {
      const result = await dataSources.authService.post('/v1/auth/login', { email, password });
      // Set token to get user info
      dataSources.authService.setAuthToken(result.token);
      const userResult = await dataSources.authService.get('/v1/auth/me');
      return { token: result.token, user: userResult };
    },

    // Events
    createEvent: async (_: any, args: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canCreateEvent');
      return dataSources.eventsService.post('/v1/events', args);
    },
    updateEvent: async (_: any, { id, ...updates }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canUpdateEvent');
      return dataSources.eventsService.patch(`/v1/events/${id}`, updates);
    },
    deleteEvent: async (_: any, { id }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canDeleteEvent');
      await dataSources.eventsService.delete(`/v1/events/${id}`);
      return true;
    },

    // Vendors
    createVendor: async (_: any, args: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canCreateVendor');
      // Convert eventId to string as vendors service expects
      const vendorData = { ...args, eventId: String(args.eventId) };
      return dataSources.vendorsService.post('/v1/vendors', vendorData);
    },
    updateVendor: async (_: any, { id, ...updates }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canUpdateVendor');
      // Convert eventId to string if present
      if (updates.eventId !== undefined) {
        updates.eventId = String(updates.eventId);
      }
      return dataSources.vendorsService.patch(`/v1/vendors/${id}`, updates);
    },
    deleteVendor: async (_: any, { id }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canDeleteVendor');
      await dataSources.vendorsService.delete(`/v1/vendors/${id}`);
      return true;
    },

    // Tasks
    createTask: async (_: any, args: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canCreateTask');
      return dataSources.tasksService.post('/v1/tasks', args);
    },
    updateTask: async (_: any, { id, ...updates }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canUpdateTask');
      return dataSources.tasksService.patch(`/v1/tasks/${id}`, updates);
    },
    deleteTask: async (_: any, { id }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canDeleteTask');
      await dataSources.tasksService.delete(`/v1/tasks/${id}`);
      return true;
    },

    // Attendees
    createRSVP: async (_: any, args: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canCreateRSVP');
      return dataSources.attendeesService.post('/v1/attendees', { ...args, userId: user.id });
    },
    updateRSVP: async (_: any, { id, status }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canUpdateRSVP');
      return dataSources.attendeesService.patch(`/v1/attendees/${id}/rsvp`, { status });
    },

    // Notifications
    createNotification: async (_: any, args: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canCreateNotification');
      return dataSources.notificationsService.post('/v1/notifications', args);
    },
    markNotificationRead: async (_: any, { id }: any, { dataSources, user }: any) => {
      if (!user) throw new RBACError('Not authenticated');
      return dataSources.notificationsService.patch(`/v1/notifications/${id}`, { read: true });
    },
  },

  // Field Resolvers for nested data
  Event: {
    tasks: async (parent: any, _: any, { dataSources }: any) => {
      const result = await dataSources.tasksService.get('/v1/tasks', { event_id: parent.id, page_size: 100 });
      return result.data || result.tasks || [];
    },
    attendees: async (parent: any, _: any, { dataSources }: any) => {
      const result = await dataSources.attendeesService.get('/v1/attendees', { eventId: parent.id, page_size: 100 });
      return result.data || result.attendees || [];
    },
  },

  Vendor: {
    tasks: async (parent: any, _: any, { dataSources }: any) => {
      const result = await dataSources.tasksService.get('/v1/tasks', { vendor_id: parent.id, page_size: 100 });
      return result.data || result.tasks || [];
    },
  },

  Task: {
    event: async (parent: any, _: any, { dataSources }: any) => {
      if (!parent.eventId) return null;
      return dataSources.eventsService.get(`/v1/events/${parent.eventId}`).catch(() => null);
    },
    vendor: async (parent: any, _: any, { dataSources }: any) => {
      if (!parent.vendorId) return null;
      return dataSources.vendorsService.get(`/v1/vendors/${parent.vendorId}`).catch((error: any) => {
        console.error(`Failed to fetch vendor ${parent.vendorId}:`, error.message);
        return null;
      });
    },
  },

  Attendee: {
    user: async (parent: any, _: any, { dataSources }: any) => {
      if (!parent.userId) return null;
      return dataSources.authService.get(`/v1/users/${parent.userId}`).catch(() => null);
    },
    event: async (parent: any, _: any, { dataSources }: any) => {
      if (!parent.eventId) return null;
      return dataSources.eventsService.get(`/v1/events/${parent.eventId}`).catch(() => null);
    },
  },

  Notification: {
    recipient: async (parent: any, _: any, { dataSources }: any) => {
      if (!parent.recipientId) return null;
      return dataSources.authService.get(`/v1/users/${parent.recipientId}`).catch(() => null);
    },
  },
};
