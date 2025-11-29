export const typeDefs = `#graphql
  # User Type
  type User {
    id: ID!
    email: String!
    role: String!
    createdAt: String
  }

  # Event Type
  type Event {
    id: ID!
    name: String!
    description: String!
    location: String!
    startAt: String!
    endAt: String!
    organizerId: Int!
    createdAt: String
    updatedAt: String
    tasks: [Task!]
    attendees: [Attendee!]
  }

  # Vendor Type
  type Vendor {
    id: ID!
    name: String!
    email: String!
    phone: String
    createdAt: String
    updatedAt: String
    tasks: [Task!]
  }

  # Task Type
  type Task {
    id: ID!
    title: String!
    description: String!
    status: String!
    eventId: Int!
    vendorId: Int
    createdAt: String
    updatedAt: String
    event: Event
    vendor: Vendor
  }

  # Attendee Type
  type Attendee {
    id: ID!
    userId: Int!
    eventId: Int!
    status: String!
    createdAt: String
    updatedAt: String
    user: User
    event: Event
  }

  # Notification Type
  type Notification {
    id: ID!
    recipientId: Int!
    type: String!
    message: String!
    read: Boolean!
    createdAt: String
    recipient: User
  }

  # Auth Response
  type AuthResponse {
    token: String!
    user: User!
  }

  # Pagination Info
  type PageInfo {
    total: Int!
    page: Int!
    limit: Int!
    totalPages: Int!
  }

  # Paginated Responses
  type EventsResponse {
    data: [Event!]!
    pagination: PageInfo!
  }

  type VendorsResponse {
    data: [Vendor!]!
    pagination: PageInfo!
  }

  type TasksResponse {
    data: [Task!]!
    pagination: PageInfo!
  }

  type AttendeesResponse {
    data: [Attendee!]!
    pagination: PageInfo!
  }

  type NotificationsResponse {
    data: [Notification!]!
    pagination: PageInfo!
  }

  # Queries
  type Query {
    # Auth
    me: User

    # Events
    events(page: Int, limit: Int, sort: String, filter: String): EventsResponse!
    event(id: ID!): Event

    # Vendors
    vendors(page: Int, limit: Int): VendorsResponse!
    vendor(id: ID!): Vendor

    # Tasks
    tasks(page: Int, limit: Int, eventId: Int): TasksResponse!
    task(id: ID!): Task

    # Attendees
    attendees(page: Int, limit: Int, eventId: Int): AttendeesResponse!
    attendee(id: ID!): Attendee

    # Notifications
    notifications(page: Int, limit: Int, recipientId: Int): NotificationsResponse!
    notification(id: ID!): Notification

    # Aggregated Queries
    eventWithDetails(id: ID!): EventDetails
    userDashboard: UserDashboard
  }

  # Mutations
  type Mutation {
    # Auth
    register(email: String!, password: String!, role: String!): AuthResponse!
    login(email: String!, password: String!): AuthResponse!

    # Events
    createEvent(
      name: String!
      description: String!
      location: String!
      startAt: String!
      endAt: String!
      organizerId: Int!
    ): Event!
    updateEvent(
      id: ID!
      name: String
      description: String
      location: String
      startAt: String
      endAt: String
    ): Event!
    deleteEvent(id: ID!): Boolean!

    # Vendors
    createVendor(
      name: String!
      email: String!
      phone: String
    ): Vendor!
    updateVendor(
      id: ID!
      name: String
      email: String
      phone: String
    ): Vendor!
    deleteVendor(id: ID!): Boolean!

    # Tasks
    createTask(
      title: String!
      description: String
      status: String
      eventId: Int!
      vendorId: Int
    ): Task!
    updateTask(
      id: ID!
      title: String
      description: String
      status: String
      vendorId: Int
    ): Task!
    deleteTask(id: ID!): Boolean!

    # Attendees
    createRSVP(eventId: Int!, status: String!): Attendee!
    updateRSVP(eventId: Int!, status: String!): Attendee!

    # Notifications
    createNotification(
      recipientId: Int!
      type: String!
      message: String!
    ): Notification!
    markNotificationRead(id: ID!): Notification!
  }

  # Aggregated Types
  type EventDetails {
    event: Event!
    tasks: [Task!]!
    attendees: [Attendee!]!
    vendors: [Vendor!]!
  }

  type UserDashboard {
    user: User!
    upcomingEvents: [Event!]!
    myRSVPs: [Attendee!]!
    myTasks: [Task!]!
    unreadNotifications: [Notification!]!
  }
`;
