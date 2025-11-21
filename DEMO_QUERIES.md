# GraphQL BFF Demo - 4-Person Role Play Scenario

This document contains a complete role-play demonstration with 4 characters showcasing the Event Management System.

## Prerequisites

Make sure all services are running:
```bash
docker-compose up -d
```

Access Apollo Studio at: http://localhost:4000/graphql

---

## 🎭 Cast of Characters

1. **Alice Chen** - Event Organizer (Admin Role)
2. **Bob Martinez** - Vendor Manager (AV Solutions Inc)
3. **Carol Davis** - Vendor Manager (Catering Masters)
4. **David Kim** - Attendee

---

## 🎬 ACT 1: Setup & Registration

### Scene 1: Alice Registers as Event Organizer

**🎤 Alice**: "Hi everyone! I'm Alice, and I'll be organizing our annual Tech Conference. Let me create my account first."

```graphql
mutation AliceRegisters {
  register(
    email: "alice.chen@eventmanager.com"
    password: "Alice2025!"
    role: "admin"
  ) {
    token
    user {
      id
      email
      role
    }
  }
}
```

**📋 Action**: Copy Alice's token and save it as `ALICE_TOKEN`. Add to Headers:
```json
{
  "Authorization": "Bearer ALICE_TOKEN"
}
```

### Scene 2: Bob & Carol Register as Vendors

**🎤 Bob**: "Hello! I'm Bob from AV Solutions Inc. We handle all audio-visual equipment."

```graphql
mutation BobRegisters {
  register(
    email: "bob.martinez@avsolutions.com"
    password: "Bob2025!"
    role: "vendor"
  ) {
    token
    user {
      id
      email
      role
    }
  }
}
```

**📋 Action**: Save Bob's token as `BOB_TOKEN`

**🎤 Carol**: "Hi! I'm Carol from Catering Masters. We'll take care of all the food and beverages."

```graphql
mutation CarolRegisters {
  register(
    email: "carol.davis@cateringmasters.com"
    password: "Carol2025!"
    role: "vendor"
  ) {
    token
    user {
      id
      email
      role
    }
  }
}
```

**📋 Action**: Save Carol's token as `CAROL_TOKEN`

### Scene 3: David Registers as Attendee

**🎤 David**: "Hey everyone! I'm David, a tech enthusiast. Can't wait to attend this conference!"

```graphql
mutation DavidRegisters {
  register(
    email: "david.kim@techmail.com"
    password: "David2025!"
    role: "attendee"
  ) {
    token
    user {
      id
      email
      role
    }
  }
}
```

**📋 Action**: Save David's token as `DAVID_TOKEN`

---

## 🎬 ACT 2: Alice Creates the Event

**📋 Switch to**: `ALICE_TOKEN`

**🎤 Alice**: "Alright! Let me create our flagship event - Tech Conference 2025."

```graphql
mutation AliceCreatesMainEvent {
  createEvent(
    name: "Tech Conference 2025 - AI & Cloud Summit"
    description: "Three-day conference featuring cutting-edge AI, Cloud Computing, and Web3 technologies with 50+ speakers"
    location: "San Francisco Convention Center, Hall A"
    startAt: "2025-06-15T09:00:00Z"
    endAt: "2025-06-17T18:00:00Z"
    organizerId: 1
  ) {
    id
    name
    description
    location
    startAt
    endAt
  }
}
```

**🎤 Alice**: "Perfect! Now I need to register Bob and Carol's companies as official vendors."

---

## 🎬 ACT 3: Alice Adds Vendors to Event

**📋 Still using**: `ALICE_TOKEN`

**🎤 Alice**: "Bob, let me add your company AV Solutions to our vendor list."

```graphql
mutation AliceAddsBobsCompany {
  createVendor(
    name: "AV Solutions Inc"
    email: "bob.martinez@avsolutions.com"
    phone: "+1-555-0100"
    eventId: 1
  ) {
    id
    name
    email
    phone
    eventId
  }
}
```

**🎤 Bob**: "Thanks Alice! Looking forward to working on this event."

**🎤 Alice**: "Carol, your turn! Adding Catering Masters now."

```graphql
mutation AliceAddsCarolsCompany {
  createVendor(
    name: "Catering Masters"
    email: "carol.davis@cateringmasters.com"
    phone: "+1-555-0200"
    eventId: 1
  ) {
    id
    name
    email
    phone
    eventId
  }
}
```

**🎤 Carol**: "Excellent! We're ready to serve."

---

## 🎬 ACT 4: Alice Creates Tasks for Vendors

**🎤 Alice**: "Bob, I need you to handle all the audio-visual setup for the main conference hall."

```graphql
mutation AliceCreatesAVTask {
  createTask(
    title: "Setup Complete AV System for Main Hall"
    description: "Install 20+ speakers, 4K projectors, wireless microphones, and lighting in Hall A. Test all equipment 24 hours before event."
    status: "pending"
    eventId: 1
  ) {
    id
    title
    description
    status
    eventId
  }
}
```

**🎤 Alice**: "Let me assign this to Bob's company."

```graphql
mutation AliceAssignsTaskToBob {
  updateTask(
    id: "1"
    vendorId: 1
  ) {
    id
    title
    status
    vendor {
      id
      name
      email
    }
  }
}
```

**🎤 Alice**: "Carol, we're expecting 500 attendees. Can you handle catering for all three days?"

```graphql
mutation AliceCreatesCateringTask {
  createTask(
    title: "Full Conference Catering Service"
    description: "Provide breakfast, lunch, and refreshments for 500 attendees daily. Menu must include vegetarian, vegan, and gluten-free options."
    status: "pending"
    eventId: 1
  ) {
    id
    title
    description
    status
    eventId
  }
}
```

**🎤 Alice**: "Assigning this to Catering Masters."

```graphql
mutation AliceAssignsTaskToCarol {
  updateTask(
    id: "2"
    vendorId: 2
  ) {
    id
    title
    vendor {
      name
      email
    }
  }
}
```

**🎤 Bob**: "Got it, Alice! I'll start working on this right away."

**🎤 Carol**: "Sounds delicious! We'll prepare an amazing menu."

---

## 🎬 ACT 5: Bob Starts Working on AV Setup

**📋 Switch to**: `BOB_TOKEN`

**🎤 Bob**: "Let me check my assigned tasks and update the status."

```graphql
query BobChecksHisTasks {
  vendors(page: 1, limit: 10) {
    data {
      id
      name
      tasks {
        id
        title
        status
        description
      }
    }
  }
}
```

**🎤 Bob**: "Perfect! I can see my task. Let me mark it as in progress."

```graphql
mutation BobStartsWork {
  updateTask(
    id: "1"
    status: "in_progress"
  ) {
    id
    title
    status
    vendor {
      name
    }
  }
}
```

**🎤 Bob**: "Equipment ordered! I'll have everything set up on time."

---

## 🎬 ACT 6: Carol Plans the Menu

**📋 Switch to**: `CAROL_TOKEN`

**🎤 Carol**: "Let me see what I need to prepare."

```graphql
query CarolChecksHerTasks {
  vendors(page: 1, limit: 10) {
    data {
      id
      name
      email
      tasks {
        id
        title
        description
        status
      }
    }
  }
}
```

**🎤 Carol**: "500 people! That's going to be a lot of food. Let me get started."

```graphql
mutation CarolStartsCatering {
  updateTask(
    id: "2"
    status: "in_progress"
  ) {
    id
    title
    status
    vendor {
      name
    }
  }
}
```

**🎤 Carol**: "Menu planned! Day 1: Continental breakfast, Italian buffet lunch. Day 2: American breakfast, Asian fusion lunch..."

---

## 🎬 ACT 7: David Discovers the Event

**📋 Switch to**: `DAVID_TOKEN`

**🎤 David**: "I heard there's a tech conference coming up. Let me see what's available."

```graphql
query DavidBrowsesEvents {
  events(page: 1, limit: 10) {
    data {
      id
      name
      description
      location
      startAt
      endAt
    }
    pagination {
      total
    }
  }
}
```

**🎤 David**: "Wow! AI & Cloud Summit sounds amazing! I'm definitely going to this. Let me RSVP."

```graphql
mutation DavidRSVPsToConference {
  createRSVP(
    eventId: 1
    status: "confirmed"
  ) {
    id
    eventId
    userId
    status
    event {
      name
      location
      startAt
    }
  }
}
```

**🎤 David**: "Registered! Can't wait for June 15th!"

---

## 🎬 ACT 8: Alice Monitors Event Progress

**📋 Switch to**: `ALICE_TOKEN`

**🎤 Alice**: "Let me check how everything is progressing."

```graphql
query AliceChecksEventStatus {
  events(page: 1, limit: 10) {
    data {
      id
      name
      location
      startAt
      tasks {
        id
        title
        status
        vendor {
          name
          email
        }
      }
      attendees {
        id
        userId
        status
      }
    }
    pagination {
      total
    }
  }
}
```

**🎤 Alice**: "Great! Both Bob and Carol have started their tasks. And we already have our first attendee - David! Let me get more details."

```graphql
query AliceGetsFullEventDetails {
  eventWithDetails(id: "1") {
    event {
      id
      name
      description
      location
      startAt
      endAt
    }
    tasks {
      id
      title
      status
      vendor {
        name
        email
      }
    }
    attendees {
      id
      status
    }
    vendors {
      id
      name
      email
      phone
    }
  }
}
```

**🎤 Alice**: "Perfect overview! Everything is on track."

---

## 🎬 ACT 9: Time Passes - Event Preparation

### Bob Completes AV Setup

**📋 Switch to**: `BOB_TOKEN`

**🎤 Bob**: "All equipment installed and tested! Marking task as complete."

```graphql
mutation BobCompletesAVSetup {
  updateTask(
    id: "1"
    status: "completed"
  ) {
    id
    title
    status
    vendor {
      name
    }
  }
}
```

**🎤 Bob**: "Sound check passed! Everything is ready."

### Carol Completes Catering Prep

**📋 Switch to**: `CAROL_TOKEN`

**🎤 Carol**: "Menu finalized, ingredients ordered, staff scheduled! We're all set."

```graphql
mutation CarolCompletesCateringPrep {
  updateTask(
    id: "2"
    status: "completed"
  ) {
    id
    title
    status
    vendor {
      name
    }
  }
}
```

**🎤 Carol**: "Can't wait to see everyone's reaction to our gourmet menu!"

---

## 🎬 ACT 10: David Checks His Dashboard

**📋 Switch to**: `DAVID_TOKEN`

**🎤 David**: "Let me see my dashboard and upcoming events."

```graphql
query DavidChecksDashboard {
  userDashboard {
    user {
      id
      email
      role
    }
    upcomingEvents {
      id
      name
      location
      startAt
      endAt
    }
    myRSVPs {
      id
      eventId
      status
    }
    unreadNotifications {
      id
      message
      type
      createdAt
    }
  }
}
```

**🎤 David**: "One week to go! I should check my notifications."

```graphql
query DavidChecksNotifications {
  notifications(page: 1, limit: 10) {
    data {
      id
      type
      message
      read
      createdAt
    }
    pagination {
      total
    }
  }
}
```

**🎤 David**: "Looks like I have some event updates. Let me mark them as read."

```graphql
mutation DavidMarksNotificationRead {
  markNotificationRead(id: "1") {
    id
    read
    message
  }
}
```

---

## 🎬 ACT 11: Alice Sends Event Update

**📋 Switch to**: `ALICE_TOKEN`

**🎤 Alice**: "Great work team! Let me update the event with some final details."

```graphql
mutation AliceUpdatesEvent {
  updateEvent(
    id: "1"
    name: "Tech Conference 2025 - AI & Cloud Summit [CONFIRMED]"
    description: "Three-day conference featuring cutting-edge AI, Cloud Computing, and Web3 technologies with 50+ speakers. All vendor preparations complete!"
  ) {
    id
    name
    description
    location
  }
}
```

**🎤 Alice**: "Perfect! The event is officially confirmed. All vendors have completed their tasks."

---

## 🎬 ACT 12: Final Status Check

### Alice Reviews Everything

**📋 Using**: `ALICE_TOKEN`

**🎤 Alice**: "Let me get a final overview of all vendors and their completed work."

```graphql
query AliceReviewsAllVendors {
  vendors(page: 1, limit: 10) {
    data {
      id
      name
      email
      phone
      tasks {
        id
        title
        status
      }
    }
  }
}
```

**🎤 Alice**: "Excellent! Bob and Carol both completed their tasks. Let me check all attendees."

```graphql
query AliceChecksAttendees {
  attendees(eventId: 1, page: 1, limit: 10) {
    data {
      id
      userId
      status
    }
    pagination {
      total
    }
  }
}
```

**🎤 Alice**: "We have David confirmed, and the registration is growing! Time to check all tasks."

```graphql
query AliceReviewsAllTasks {
  tasks(eventId: 1, page: 1, limit: 10) {
    data {
      id
      title
      status
      vendor {
        name
        email
      }
    }
  }
}
```

**🎤 Alice**: "Perfect! All tasks are completed. We're ready for the conference!"

---

## 🎬 FINALE: Everyone Checks In

### Bob's Final Check

**📋 Switch to**: `BOB_TOKEN`

**🎤 Bob**: "Let me verify my profile and completed work."

```graphql
query BobChecksProfile {
  me {
    id
    email
    role
  }
}
```

```graphql
query BobReviewsCompletedWork {
  vendors {
    data {
      name
      tasks {
        title
        status
      }
    }
  }
}
```

**🎤 Bob**: "All done! See you at the conference!"

### Carol's Final Check

**📋 Switch to**: `CAROL_TOKEN`

**🎤 Carol**: "Time to review my catering preparations."

```graphql
query CarolChecksProfile {
  me {
    id
    email
    role
  }
}
```

```graphql
query CarolReviewsMenu {
  vendors {
    data {
      name
      tasks {
        title
        description
        status
      }
    }
  }
}
```

**🎤 Carol**: "Menu ready, staff briefed. Let's make this delicious!"

### David's Final Check

**📋 Switch to**: `DAVID_TOKEN`

**🎤 David**: "Can't wait! Let me check my event details one more time."

```graphql
query DavidFinalCheck {
  userDashboard {
    upcomingEvents {
      id
      name
      location
      startAt
      endAt
    }
    myRSVPs {
      status
      event {
        name
      }
    }
  }
}
```

**🎤 David**: "All set! See you on June 15th!"

---

## 🎭 THE END

**🎤 All Together**: "Tech Conference 2025 - AI & Cloud Summit is READY! 🎉"

**📊 Final Summary:**
- ✅ Alice (Organizer) - Created event, added vendors, assigned tasks
- ✅ Bob (Vendor) - Completed AV setup for main hall
- ✅ Carol (Vendor) - Prepared full catering menu
- ✅ David (Attendee) - Registered and confirmed attendance
- ✅ All tasks completed
- ✅ Event confirmed and ready to go!

---

## 🎬 Bonus Scenes

### Bonus Scene 1: Alice Deletes a Test Event

**📋 Switch to**: `ALICE_TOKEN`

**🎤 Alice**: "We had a test event that we don't need anymore. Let me clean it up."

```graphql
mutation AliceDeletesTestEvent {
  deleteEvent(id: "2")
}
```

### Bonus Scene 2: David Tries to Delete (Access Denied)

**📋 Switch to**: `DAVID_TOKEN`

**🎤 David**: "Hmm, I wonder if I can delete this event... probably not."

```graphql
mutation DavidTriesToDelete {
  deleteEvent(id: "1")
}
```

**Expected Response**: ❌ "Access denied. You do not have permission to perform this action."

**🎤 David**: "Yep, as expected! Security works perfectly."

---

## 📝 Character Summary

| Character | Role | Email | Key Actions |
|-----------|------|-------|-------------|
| **Alice Chen** | Event Organizer (Admin) | alice.chen@eventmanager.com | Created event, added vendors, assigned tasks, monitored progress |
| **Bob Martinez** | Vendor (AV Solutions) | bob.martinez@avsolutions.com | Handled AV setup task, updated status to completed |
| **Carol Davis** | Vendor (Catering Masters) | carol.davis@cateringmasters.com | Prepared catering, updated status to completed |
| **David Kim** | Attendee | david.kim@techmail.com | Browsed events, created RSVP, checked dashboard |

---

## 🎯 Key Takeaways

1. **Role-Based Access Control (RBAC)** - Each character has different permissions
2. **Task Assignment Workflow** - Organizer creates tasks → assigns to vendors → vendors complete
3. **Event Discovery** - Attendees can browse and RSVP to events
4. **Real-time Collaboration** - All parties can see updates in real-time
5. **Complete Audit Trail** - Every action is tracked and logged

---

## 🔄 Reset Demo

To run the demo again from scratch:
```bash
docker-compose down -v
docker-compose up -d
```

This will clear all data and allow you to replay the entire scenario!
