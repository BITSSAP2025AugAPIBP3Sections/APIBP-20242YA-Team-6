import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load proto files
const TASKS_PROTO_PATH = join(__dirname, '../../proto/tasks.proto');
const ATTENDEES_PROTO_PATH = join(__dirname, '../../proto/attendees.proto');

const protoOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

const tasksPackageDef = protoLoader.loadSync(TASKS_PROTO_PATH, protoOptions);
const attendeesPackageDef = protoLoader.loadSync(ATTENDEES_PROTO_PATH, protoOptions);

const tasksProto = grpc.loadPackageDefinition(tasksPackageDef).tasks;
const attendeesProto = grpc.loadPackageDefinition(attendeesPackageDef).attendees;

// Get service addresses from environment or use defaults
const TASKS_GRPC_HOST = process.env.TASKS_GRPC_HOST || 'tasks-service';
const TASKS_GRPC_PORT = process.env.TASKS_GRPC_PORT || '50051';
const ATTENDEES_GRPC_HOST = process.env.ATTENDEES_GRPC_HOST || 'attendees-service';
const ATTENDEES_GRPC_PORT = process.env.ATTENDEES_GRPC_PORT || '50052';

// Create gRPC clients
const tasksClient = new tasksProto.TaskService(
  `${TASKS_GRPC_HOST}:${TASKS_GRPC_PORT}`,
  grpc.credentials.createInsecure()
);

const attendeesClient = new attendeesProto.AttendeeService(
  `${ATTENDEES_GRPC_HOST}:${ATTENDEES_GRPC_PORT}`,
  grpc.credentials.createInsecure()
);

/**
 * Delete all tasks for an event via gRPC
 * @param {number} eventId - The event ID
 * @returns {Promise<{deletedCount: number, vendorIds: number[]}>}
 */
export function deleteEventTasks(eventId) {
  return new Promise((resolve, reject) => {
    tasksClient.DeleteEventTasks({ event_id: eventId }, (error, response) => {
      if (error) {
        console.error(`[gRPC Client] Error deleting tasks for event ${eventId}:`, error);
        reject(error);
      } else {
        console.log(`[gRPC Client] Deleted ${response.deleted_count} tasks for event ${eventId}`);
        resolve({
          deletedCount: response.deleted_count,
          vendorIds: response.vendor_ids || []
        });
      }
    });
  });
}

/**
 * Get all vendors for an event via gRPC
 * @param {number} eventId - The event ID
 * @returns {Promise<Array<{vendorId: number, userId: string}>>}
 */
export function getEventVendors(eventId) {
  return new Promise((resolve, reject) => {
    tasksClient.GetEventVendors({ event_id: eventId }, (error, response) => {
      if (error) {
        console.error(`[gRPC Client] Error getting vendors for event ${eventId}:`, error);
        reject(error);
      } else {
        console.log(`[gRPC Client] Found ${response.vendors.length} vendors for event ${eventId}`);
        resolve(response.vendors || []);
      }
    });
  });
}

/**
 * Delete all attendees for an event via gRPC
 * @param {number} eventId - The event ID
 * @returns {Promise<{deletedCount: number, userIds: string[]}>}
 */
export function deleteEventAttendees(eventId) {
  return new Promise((resolve, reject) => {
    attendeesClient.DeleteEventAttendees({ event_id: eventId }, (error, response) => {
      if (error) {
        console.error(`[gRPC Client] Error deleting attendees for event ${eventId}:`, error);
        reject(error);
      } else {
        console.log(`[gRPC Client] Deleted ${response.deleted_count} attendees for event ${eventId}`);
        resolve({
          deletedCount: response.deleted_count,
          userIds: response.user_ids || []
        });
      }
    });
  });
}

/**
 * Get all attendees for an event via gRPC
 * @param {number} eventId - The event ID
 * @returns {Promise<Array<{userId: string, status: string}>>}
 */
export function getEventAttendees(eventId) {
  return new Promise((resolve, reject) => {
    attendeesClient.GetEventAttendees({ event_id: eventId }, (error, response) => {
      if (error) {
        console.error(`[gRPC Client] Error getting attendees for event ${eventId}:`, error);
        reject(error);
      } else {
        console.log(`[gRPC Client] Found ${response.attendees.length} attendees for event ${eventId}`);
        resolve(response.attendees || []);
      }
    });
  });
}

export default {
  deleteEventTasks,
  getEventVendors,
  deleteEventAttendees,
  getEventAttendees
};
