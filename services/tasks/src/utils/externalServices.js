import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.SECRET_KEY || 'your-super-secret-jwt-key-change-in-production';

// Simple in-memory cache for vendor emails (updated via events in production)
const vendorEmailCache = new Map();

export async function getUserEmail(userId) {
    try {
        const response = await fetch(`http://auth-service:8001/v1/users/${userId}`);
        if (response.ok) {
            const user = await response.json();
            return user.email;
        }
    } catch (error) {
        console.error(`⚠️  Failed to fetch email for user ${userId}:`, error);
    }
    return null;
}

export async function getVendorEmail(vendorId) {
    try {
        // First check cache
        if (vendorEmailCache.has(vendorId)) {
            console.log(`📋 Using cached vendor email for vendor ID: ${vendorId}`);
            return vendorEmailCache.get(vendorId);
        }

        // Fallback to HTTP call (should be replaced with event-driven updates)
        console.log(`🌐 Cache miss - fetching vendor email via HTTP for vendor ID: ${vendorId}`);
        const serviceToken = jwt.sign(
            {
                sub: 'tasks-service',
                email: 'service@internal.com',
                role: 'admin',
                exp: Math.floor(Date.now() / 1000) + 3600
            },
            SECRET_KEY
        );

        const response = await fetch(`http://vendors-service:8003/v1/vendors/${vendorId}`, {
            headers: { 'Authorization': `Bearer ${serviceToken}` }
        });

        if (response.ok) {
            const vendor = await response.json();
            console.log(`📧 Vendor data fetched:`, vendor);

            // Cache the result
            vendorEmailCache.set(vendorId, vendor.email);

            return vendor.email;
        } else {
            console.error(`❌ Failed to fetch vendor ${vendorId}: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error(`⚠️  Failed to fetch email for vendor ${vendorId}:`, error);
    }
    return null;
}

export async function getVendorUserId(vendorEmail) {
    try {
        console.log(`🔍 Looking for user ID for vendor email: ${vendorEmail}`);

        // Generate service token for auth service call
        const serviceToken = jwt.sign(
            {
                sub: 'tasks-service',
                email: 'service@internal.com',
                role: 'admin',
                exp: Math.floor(Date.now() / 1000) + 3600
            },
            SECRET_KEY
        );

        // Call auth service to search user by email
        const response = await fetch(`http://auth-service:8001/v1/auth/users/search?email=${encodeURIComponent(vendorEmail)}`, {
            headers: { 'Authorization': `Bearer ${serviceToken}` }
        });

        if (response.ok) {
            const user = await response.json();
            console.log(`✅ Found vendor user ID: ${user.id} for email ${vendorEmail}`);
            return parseInt(user.id);
        } else if (response.status === 404) {
            console.log(`⚠️  No user found for email ${vendorEmail}`);
        } else {
            console.error(`❌ Failed to search user: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error(`⚠️  Failed to fetch user ID for email ${vendorEmail}:`, error);
    }
    return null;
}
