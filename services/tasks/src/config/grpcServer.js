import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROTO_PATH = join(__dirname, '../../proto/tasks.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const tasksProto = grpc.loadPackageDefinition(packageDefinition).tasks;

/**
 * Delete all tasks for a specific event and return affected vendor IDs
 */
async function deleteEventTasks(call, callback) {
  const { event_id } = call.request;
  
  try {
    console.log(`[gRPC] Deleting tasks for event ${event_id}`);
    
    // First, get all unique vendor IDs from tasks that will be deleted
    const vendorsResult = await pool.query(
      'SELECT DISTINCT vendor_id FROM tasks WHERE event_id = $1 AND vendor_id IS NOT NULL',
      [event_id]
    );
    
    const vendorIds = vendorsResult.rows.map(row => parseInt(row.vendor_id));
    
    // Delete all tasks for this event
    const deleteResult = await pool.query(
      'DELETE FROM tasks WHERE event_id = $1',
      [event_id]
    );
    
    const deletedCount = deleteResult.rowCount || 0;
    
    console.log(`[gRPC] Deleted ${deletedCount} tasks for event ${event_id}, affected ${vendorIds.length} vendors`);
    
    callback(null, {
      deleted_count: deletedCount,
      vendor_ids: vendorIds
    });
  } catch (error) {
    console.error('[gRPC] Error deleting event tasks:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: `Failed to delete tasks: ${error.message}`
    });
  }
}

/**
 * Get all vendors associated with an event
 */
async function getEventVendors(call, callback) {
  const { event_id } = call.request;
  
  try {
    console.log(`[gRPC] Getting vendors for event ${event_id}`);
    
    const result = await pool.query(
      `SELECT DISTINCT vendor_id FROM tasks 
       WHERE event_id = $1 AND vendor_id IS NOT NULL`,
      [event_id]
    );
    
    const vendors = result.rows.map(row => ({
      vendor_id: parseInt(row.vendor_id),
      user_id: '' // Will be populated by calling service if needed
    }));
    
    console.log(`[gRPC] Found ${vendors.length} vendors for event ${event_id}`);
    
    callback(null, { vendors });
  } catch (error) {
    console.error('[gRPC] Error getting event vendors:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: `Failed to get vendors: ${error.message}`
    });
  }
}

/**
 * Start the gRPC server
 */
export function startGrpcServer() {
  const server = new grpc.Server();
  
  server.addService(tasksProto.TaskService.service, {
    DeleteEventTasks: deleteEventTasks,
    GetEventVendors: getEventVendors
  });
  
  const GRPC_PORT = process.env.GRPC_PORT || '50051';
  const bindAddress = `0.0.0.0:${GRPC_PORT}`;
  
  server.bindAsync(
    bindAddress,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('[gRPC] Failed to start server:', err);
        return;
      }
      console.log(`[gRPC] Tasks service listening on ${bindAddress}`);
    }
  );
  
  return server;
}
