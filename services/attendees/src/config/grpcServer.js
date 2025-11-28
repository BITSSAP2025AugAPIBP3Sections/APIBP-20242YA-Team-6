import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROTO_PATH = join(__dirname, '../../proto/attendees.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const attendeesProto = grpc.loadPackageDefinition(packageDefinition).attendees;

/**
 * Delete all attendees for a specific event and return affected user IDs
 */
async function deleteEventAttendees(call, callback) {
  const { event_id } = call.request;
  
  try {
    console.log(`[gRPC] Deleting attendees for event ${event_id}`);
    
    // First, get all user IDs from attendees that will be deleted
    const attendeesResult = await pool.query(
      'SELECT user_id FROM attendees WHERE event_id = $1',
      [event_id]
    );
    
    const userIds = attendeesResult.rows.map(row => row.user_id);
    
    // Delete all attendees for this event
    const deleteResult = await pool.query(
      'DELETE FROM attendees WHERE event_id = $1',
      [event_id]
    );
    
    const deletedCount = deleteResult.rowCount || 0;
    
    console.log(`[gRPC] Deleted ${deletedCount} attendees for event ${event_id}`);
    
    callback(null, {
      deleted_count: deletedCount,
      user_ids: userIds
    });
  } catch (error) {
    console.error('[gRPC] Error deleting event attendees:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: `Failed to delete attendees: ${error.message}`
    });
  }
}

/**
 * Get all attendees for an event
 */
async function getEventAttendees(call, callback) {
  const { event_id } = call.request;
  
  try {
    console.log(`[gRPC] Getting attendees for event ${event_id}`);
    
    const result = await pool.query(
      'SELECT user_id, status FROM attendees WHERE event_id = $1',
      [event_id]
    );
    
    const attendees = result.rows.map(row => ({
      user_id: row.user_id,
      status: row.status
    }));
    
    console.log(`[gRPC] Found ${attendees.length} attendees for event ${event_id}`);
    
    callback(null, { attendees });
  } catch (error) {
    console.error('[gRPC] Error getting event attendees:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: `Failed to get attendees: ${error.message}`
    });
  }
}

/**
 * Start the gRPC server
 */
export function startGrpcServer() {
  const server = new grpc.Server();
  
  server.addService(attendeesProto.AttendeeService.service, {
    DeleteEventAttendees: deleteEventAttendees,
    GetEventAttendees: getEventAttendees
  });
  
  const GRPC_PORT = process.env.GRPC_PORT || '50052';
  const bindAddress = `0.0.0.0:${GRPC_PORT}`;
  
  server.bindAsync(
    bindAddress,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('[gRPC] Failed to start server:', err);
        return;
      }
      console.log(`[gRPC] Attendees service listening on ${bindAddress}`);
    }
  );
  
  return server;
}
