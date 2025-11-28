import pool from '../config/database.js';
import { deleteEventTasks, deleteEventAttendees } from '../config/grpcClient.js';
import { publishNotificationBatch } from '../config/kafka.js';
import { getUserEmail } from '../utils/externalServices.js';
import axios from 'axios';

class EventDeletionSaga {
  constructor(eventId, authorization) {
    this.eventId = eventId;
    this.authorization = authorization;
    this.state = {
      event: null,
      tasksDeleted: false,
      tasksData: { deletedCount: 0, vendorIds: [] },
      attendeesDeleted: false,
      attendeesData: { deletedCount: 0, userIds: [] },
      eventDeleted: false,
      notificationsSent: false
    };
    this.compensations = [];
  }

  /**
   * Step 1: Fetch event details
   */
  async fetchEvent() {
    console.log(`📋 [Saga] Step 1: Fetching event ${this.eventId}`);
    
    const result = await pool.query(
      'SELECT id, name, organizer_id FROM events WHERE id = $1',
      [this.eventId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('EVENT_NOT_FOUND');
    }
    
    this.state.event = result.rows[0];
    console.log(`✅ [Saga] Event fetched: "${this.state.event.name}"`);
    return this.state.event;
  }

  /**
   * Step 2: Delete tasks via gRPC
   * Compensation: Cannot restore - tasks are permanently deleted by gRPC call
   * Note: For true compensation, tasks service would need to support soft deletes
   */
  async deleteTasks() {
    console.log(`📋 [Saga] Step 2: Deleting tasks for event ${this.eventId}`);
    
    try {
      const result = await deleteEventTasks(parseInt(this.eventId));
      this.state.tasksDeleted = true;
      this.state.tasksData = {
        deletedCount: result.deletedCount,
        vendorIds: result.vendorIds
      };
      
      console.log(`✅ [Saga] Deleted ${result.deletedCount} tasks, affected ${result.vendorIds.length} vendors`);
      
      // Note: gRPC deleteEventTasks does hard delete - cannot be compensated
      // To enable compensation, tasks service would need:
      // 1. Soft delete with deleted_at timestamp
      // 2. gRPC restore method to undelete tasks
      this.compensations.push({
        name: 'restore_tasks',
        execute: async () => {
          console.log(`⚠️  [Compensation] Tasks cannot be restored - hard deleted by gRPC`);
          console.log(`⚠️  [Compensation] To fix: Implement soft delete in tasks service`);
        }
      });
      
      return result;
    } catch (error) {
      console.error(`❌ [Saga] Failed to delete tasks:`, error.message);
      throw new Error('TASKS_DELETION_FAILED');
    }
  }

  /**
   * Step 3: Delete attendees via gRPC
   * Compensation: Cannot restore - attendees are permanently deleted by gRPC call
   * Note: For true compensation, attendees service would need to support soft deletes
   */
  async deleteAttendees() {
    console.log(`📋 [Saga] Step 3: Deleting attendees for event ${this.eventId}`);
    
    try {
      const result = await deleteEventAttendees(parseInt(this.eventId));
      this.state.attendeesDeleted = true;
      this.state.attendeesData = {
        deletedCount: result.deletedCount,
        userIds: result.userIds
      };
      
      console.log(`✅ [Saga] Deleted ${result.deletedCount} attendees`);
      
      // Note: gRPC deleteEventAttendees does hard delete - cannot be compensated
      // To enable compensation, attendees service would need:
      // 1. Soft delete with deleted_at timestamp
      // 2. gRPC restore method to undelete attendees
      this.compensations.push({
        name: 'restore_attendees',
        execute: async () => {
          console.log(`⚠️  [Compensation] Attendees cannot be restored - hard deleted by gRPC`);
          console.log(`⚠️  [Compensation] To fix: Implement soft delete in attendees service`);
        }
      });
      
      return result;
    } catch (error) {
      console.error(`❌ [Saga] Failed to delete attendees:`, error.message);
      throw new Error('ATTENDEES_DELETION_FAILED');
    }
  }

  /**
   * Step 4: Delete event from database
   * Compensation: Restore event with all its data
   */
  async deleteEvent() {
    console.log(`📋 [Saga] Step 4: Deleting event ${this.eventId} from database`);
    
    try {
      // First, get complete event data for compensation
      const backupResult = await pool.query(
        'SELECT * FROM events WHERE id = $1',
        [this.eventId]
      );
      
      if (backupResult.rows.length === 0) {
        throw new Error('EVENT_NOT_FOUND');
      }
      
      const eventBackup = backupResult.rows[0];
      
      // Now delete the event
      const result = await pool.query(
        'DELETE FROM events WHERE id = $1 RETURNING id',
        [this.eventId]
      );
      
      this.state.eventDeleted = true;
      console.log(`✅ [Saga] Event ${this.eventId} deleted from database`);
      
      // Add compensation to restore event with ALL fields
      this.compensations.push({
        name: 'restore_event',
        execute: async () => {
          console.log(`🔄 [Compensation] Restoring event ${this.eventId}`);
          await pool.query(
            `INSERT INTO events (id, name, description, location, start_at, end_at, organizer_id, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              eventBackup.id,
              eventBackup.name,
              eventBackup.description,
              eventBackup.location,
              eventBackup.start_at,
              eventBackup.end_at,
              eventBackup.organizer_id,
              eventBackup.created_at,
              eventBackup.updated_at
            ]
          );
          console.log(`✅ [Compensation] Event ${this.eventId} restored with all data`);
        }
      });
      
      return result;
    } catch (error) {
      console.error(`❌ [Saga] Failed to delete event:`, error.message);
      throw new Error('EVENT_DELETION_FAILED');
    }
  }

  /**
   * Step 5: Send notifications
   * Compensation: Not needed (notifications are idempotent)
   */
  async sendNotifications() {
    console.log(`📋 [Saga] Step 5: Preparing notifications`);
    
    try {
      const notifications = [];
      
      // Collect vendor notifications
      if (this.state.tasksData.vendorIds.length > 0) {
        console.log(`📧 [Saga] Preparing ${this.state.tasksData.vendorIds.length} vendor notifications`);
        
        const vendorNotifications = await Promise.allSettled(
          this.state.tasksData.vendorIds.map(async (vendorId) => {
            try {
              const vendorResponse = await axios.get(
                `http://vendors-service:8003/v1/vendors/${vendorId}`,
                { headers: { Authorization: this.authorization } }
              );
              
              if (vendorResponse.data?.email) {
                const authResponse = await axios.get(
                  `http://auth-service:8001/v1/auth/users/search?email=${vendorResponse.data.email}`
                );
                
                if (authResponse.data?.id) {
                  return {
                    recipientId: authResponse.data.id,
                    recipientEmail: vendorResponse.data.email,
                    type: 'event_cancelled',
                    message: `❌ Event "${this.state.event.name}" has been cancelled. All your assigned tasks have been removed.`,
                    metadata: { eventId: this.eventId, eventName: this.state.event.name }
                  };
                }
              }
            } catch (error) {
              console.warn(`⚠️  [Saga] Failed to get details for vendor ${vendorId}`);
            }
            return null;
          })
        );
        
        vendorNotifications.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            notifications.push(result.value);
          }
        });
      }
      
      // Collect attendee notifications
      if (this.state.attendeesData.userIds.length > 0) {
        console.log(`📧 [Saga] Preparing ${this.state.attendeesData.userIds.length} attendee notifications`);
        
        const attendeeNotifications = await Promise.allSettled(
          this.state.attendeesData.userIds.map(async (userId) => {
            try {
              const userEmail = await getUserEmail(userId);
              if (userEmail) {
                return {
                  recipientId: userId,
                  recipientEmail: userEmail,
                  type: 'event_cancelled',
                  message: `❌ Event "${this.state.event.name}" has been cancelled. Your RSVP has been removed.`,
                  metadata: { eventId: this.eventId, eventName: this.state.event.name }
                };
              }
            } catch (error) {
              console.warn(`⚠️  [Saga] Failed to get email for user ${userId}`);
            }
            return null;
          })
        );
        
        attendeeNotifications.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            notifications.push(result.value);
          }
        });
      }
      
      // Send all notifications in batch
      if (notifications.length > 0) {
        await publishNotificationBatch(notifications);
        this.state.notificationsSent = true;
        console.log(`✅ [Saga] Sent ${notifications.length} notifications`);
      } else {
        console.log(`ℹ️  [Saga] No notifications to send`);
      }
      
      return notifications;
    } catch (error) {
      // Notification failures are non-critical, log and continue
      console.error(`⚠️  [Saga] Failed to send notifications (non-critical):`, error.message);
      return [];
    }
  }

  /**
   * Execute compensations in reverse order
   */
  async compensate() {
    console.log(`🔄 [Saga] Starting compensation (${this.compensations.length} steps)`);
    
    // Execute compensations in reverse order
    for (let i = this.compensations.length - 1; i >= 0; i--) {
      const compensation = this.compensations[i];
      try {
        console.log(`🔄 [Saga] Executing compensation: ${compensation.name}`);
        await compensation.execute();
      } catch (error) {
        console.error(`❌ [Saga] Compensation ${compensation.name} failed:`, error.message);
        // Continue with other compensations even if one fails
      }
    }
    
    console.log(`✅ [Saga] Compensation complete`);
  }

  /**
   * Execute the saga
   */
  async execute() {
    const startTime = Date.now();
    console.log(`\n🚀 [Saga] Starting event deletion saga for event ${this.eventId}`);
    
    try {
      // Step 1: Fetch event
      await this.fetchEvent();
      
      // Step 2: Delete tasks
      await this.deleteTasks();
      
      // Step 3: Delete attendees
      await this.deleteAttendees();
      
      // Step 4: Delete event
      await this.deleteEvent();
      
      // Step 5: Send notifications (non-critical)
      await this.sendNotifications();
      
      const duration = Date.now() - startTime;
      console.log(`\n🎉 [Saga] Event deletion saga completed successfully in ${duration}ms`);
      console.log(`📊 [Saga] Summary:`, {
        eventId: this.eventId,
        tasksDeleted: this.state.tasksData.deletedCount,
        attendeesDeleted: this.state.attendeesData.deletedCount,
        notificationsSent: this.state.notificationsSent,
        duration: `${duration}ms`
      });
      
      return {
        success: true,
        state: this.state
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`\n❌ [Saga] Event deletion saga failed after ${duration}ms:`, error.message);
      console.log(`🔄 [Saga] Initiating compensation...`);
      
      // Execute compensations
      await this.compensate();
      
      return {
        success: false,
        error: error.message,
        state: this.state
      };
    }
  }
}

/**
 * Factory function to execute event deletion saga
 */
export async function executeEventDeletionSaga(eventId, authorization) {
  const saga = new EventDeletionSaga(eventId, authorization);
  return await saga.execute();
}
