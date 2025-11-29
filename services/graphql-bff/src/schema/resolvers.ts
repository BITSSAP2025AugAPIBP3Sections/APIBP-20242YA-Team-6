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
      
      // Only organizers and admins can view vendors list
      if (user.role !== 'organizer' && user.role !== 'admin') {
        throw new RBACError('Only organizers and admins can view vendors');
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
      
      // Vendors can only see their own tasks
      if (user.role === 'vendor') {
        params.vendorId = user.id;
      }
      
      // Organizers can only see tasks for their events
      if (user.role === 'organizer') {
        if (eventId) {
          const event = await dataSources.eventsService.get(`/v1/events/${eventId}`);
          AuthorizationService.requireEventOwnership(user.role, user.id, event.organizerId);
          params.eventId = eventId;
        } else {
          // Get all tasks for organizer's events
          const eventsResponse = await dataSources.eventsService.get('/v1/events', { organizerId: user.id, page_size: 1000 });
          const eventIds = (eventsResponse.events || []).map((e: any) => e.id);
          if (eventIds.length === 0) {
            return { data: [], pagination: { total: 0, page: 1, limit, totalPages: 0 } };
          }
          params.eventIds = eventIds;
        }
      } else if (eventId) {
        params.eventId = eventId;
      }
      
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
      
      const task = await dataSources.tasksService.get(`/v1/tasks/${id}`);
      
      // Vendors can only view tasks assigned to them
      if (user.role === 'vendor' && task.vendorId !== user.id) {
        throw new RBACError('You can only view tasks assigned to you');
      }
      
      // Organizers can only view tasks for their events
      if (user.role === 'organizer') {
        const event = await dataSources.eventsService.get(`/v1/events/${task.eventId}`);
        AuthorizationService.requireEventOwnership(user.role, user.id, event.organizerId);
      }
      
      return task;
    },

    // Attendees
    attendees: async (_: any, { page = 1, limit = 10, eventId }: any, { dataSources, user }: any) => {
      if (!user) {
        throw new RBACError('Authentication required. Login with the "login" mutation and add the token to Headers: {"Authorization": "Bearer YOUR_TOKEN"}');
      }
      
      // Only organizers (for their events) and admins can view attendees
      if (user.role === 'organizer' && eventId) {
        // Verify organizer owns the event
        const event = await dataSources.eventsService.get(`/v1/events/${eventId}`);
        AuthorizationService.requireEventOwnership(user.role, user.id, event.organizerId);
      } else if (user.role === 'organizer' && !eventId) {
        throw new RBACError('Organizers must specify an eventId to view attendees');
      } else if (user.role !== 'admin') {
        throw new RBACError('Only organizers and admins can view attendees');
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
        dataSources.attendeesService.get('/v1/rsvps', { page_size: 100 }), // User's own RSVPs endpoint
        dataSources.tasksService.get('/v1/tasks', { userId: user.id, limit: 100 }),
        dataSources.notificationsService.get('/v1/notifications', { recipientId: user.id, read: false, limit: 50 }),
      ]);

      // Get events from RSVPs
      const eventIds = rsvps.attendees?.map((r: any) => r.eventId) || [];
      const events = eventIds.length > 0
        ? await Promise.all(eventIds.map((eid: number) => dataSources.eventsService.get(`/v1/events/${eid}`).catch(() => null)))
        : [];

      return {
        user: userData,
        upcomingEvents: events.filter(Boolean),
        myRSVPs: rsvps.attendees || [],
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
      // Set the organizerId to the current user
      return dataSources.eventsService.post('/v1/events', { ...args, organizerId: user.id });
    },
    updateEvent: async (_: any, { id, ...updates }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canUpdateEvent');
      
      // Organizers can only update their own events
      if (user.role === 'organizer') {
        const event = await dataSources.eventsService.get(`/v1/events/${id}`);
        AuthorizationService.requireEventOwnership(user.role, user.id, event.organizerId);
      }
      
      return dataSources.eventsService.patch(`/v1/events/${id}`, updates);
    },
    deleteEvent: async (_: any, { id }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canDeleteEvent');
      
      // Organizers can only delete their own events (though permission is false by default)
      if (user.role === 'organizer') {
        const event = await dataSources.eventsService.get(`/v1/events/${id}`);
        AuthorizationService.requireEventOwnership(user.role, user.id, event.organizerId);
      }
      
      await dataSources.eventsService.delete(`/v1/events/${id}`);
      return true;
    },

    // Vendors
    createVendor: async (_: any, args: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canCreateVendor');
      return dataSources.vendorsService.post('/v1/vendors', args);
    },
    updateVendor: async (_: any, { id, ...updates }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canUpdateVendor');
      return dataSources.vendorsService.patch(`/v1/vendors/${id}`, updates);
    },
    deleteVendor: async (_: any, { id }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canDeleteVendor');
      // Only admins can delete vendors (vendors are global entities)
      await dataSources.vendorsService.delete(`/v1/vendors/${id}`);
      return true;
    },

    // Tasks
    createTask: async (_: any, args: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canCreateTask');
      
      const { eventId, ...taskData } = args;
      
      // Organizers can only create tasks for their own events
      if (user.role === 'organizer') {
        const event = await dataSources.eventsService.get(`/v1/events/${eventId}`);
        AuthorizationService.requireEventOwnership(user.role, user.id, event.organizerId);
      }
      
      // Tasks can only be created via POST /events/{eventId}/tasks
      return dataSources.eventsService.post(`/v1/events/${eventId}/tasks`, taskData);
    },
    updateTask: async (_: any, { id, ...updates }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canUpdateTask');
      
      const task = await dataSources.tasksService.get(`/v1/tasks/${id}`);
      
      // Vendors can only update tasks assigned to them
      if (user.role === 'vendor') {
        if (task.vendorId !== user.id) {
          throw new RBACError('You can only update tasks assigned to you');
        }
      }
      
      // Organizers can only update tasks for their own events
      if (user.role === 'organizer') {
        const event = await dataSources.eventsService.get(`/v1/events/${task.eventId}`);
        AuthorizationService.requireEventOwnership(user.role, user.id, event.organizerId);
      }
      
      return dataSources.tasksService.patch(`/v1/tasks/${id}`, updates);
    },
    deleteTask: async (_: any, { id }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canDeleteTask');
      
      const task = await dataSources.tasksService.get(`/v1/tasks/${id}`);
      
      // Organizers can only delete tasks for their own events (though permission is false by default)
      if (user.role === 'organizer') {
        const event = await dataSources.eventsService.get(`/v1/events/${task.eventId}`);
        AuthorizationService.requireEventOwnership(user.role, user.id, event.organizerId);
      }
      
      await dataSources.tasksService.delete(`/v1/tasks/${id}`);
      return true;
    },

    // Attendees
    createRSVP: async (_: any, { eventId, status }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canCreateRSVP');
      // Use new RESTful pattern: POST /events/{eventId}/rsvps?status=going
      return dataSources.attendeesService.post(`/v1/events/${eventId}/rsvps?status=${status}`);
    },
    updateRSVP: async (_: any, { eventId, status }: any, { dataSources, user }: any) => {
      AuthorizationService.requirePermission(user?.role, 'canUpdateRSVP');
      
      // Organizers can only update RSVPs for their own events
      if (user.role === 'organizer') {
        const event = await dataSources.eventsService.get(`/v1/events/${eventId}`);
        AuthorizationService.requireEventOwnership(user.role, user.id, event.organizerId);
      }
      
      // Use new RESTful pattern: PUT /events/{eventId}/rsvps?status=interested
      return dataSources.attendeesService.put(`/v1/events/${eventId}/rsvps?status=${status}`);
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
