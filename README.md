## **Event Management Platform**

The application is  **event management platform** that enables organizers, vendors, and participants to interact seamlessly in planning and executing events.

### **Backend :**

Handles business logic and communicates with **Postgres databases**. Exposes **REST and GraphQL APIs** for operations such as event creation, vendor management, task assignment, notifications, event discovery, and RSVP tracking. Supports **real-time updates** via Kafka events for inter-service communication.

### **REST & GraphQL API:**

Acts as the bridge between frontend and backend. Supports operations like:

* **User authentication & role-based access** (admin, organizer, vendor, participant)
* **CRUD operations** for events, vendors, and tasks/deliverables
* **Event search, filtering, and discovery**
* **RSVP to events and viewing attendee status**
* **Vendor task tracking and status updates**
* **Notifications and alerts** for important updates

### **Core Features:**

**Organizer:**

* Create, update, and delete events
* Assign tasks to vendors and track progress
* Monitor event timeline and milestones

**Vendor:**

* View assigned tasks and deliverables
* Update task status and submit reports

**Participant / Attendee:**

* Discover events based on location, category, or date
* RSVP to events and manage attendance
* View event details, schedules, and notifications

**System-Wide:**

* Authentication and **role-based access control**
* Real-time notifications for critical updates
* Event-driven architecture for seamless inter-service communication

### **Team Members:**

- Mohd Kaif - 93018 - @kaifcoder 
- Meenu Singh - 93093 - @meenu155 
- Abhinav Yadav - 93064 - @DevAbhinav3033 
- Shruti Mishra - 93030 - @shrutim07 
- Shipra Singh - 93075 - @Shipra-Singh-Asd 
