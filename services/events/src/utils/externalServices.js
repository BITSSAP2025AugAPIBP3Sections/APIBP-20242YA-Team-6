export async function getUserEmail(userId) {
  try {
    const response = await fetch(`http://auth-service:8001/v1/users/${userId}`);
    if (response.ok) {
      const user = await response.json();
      return user.email;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user email:', error);
    return null;
  }
}

export async function getVendorEmail(vendorId) {
  try {
    const response = await fetch(`http://vendors-service:8003/v1/vendors/${vendorId}`);
    if (response.ok) {
      const vendor = await response.json();
      return vendor.email;
    }
    return null;
  } catch (error) {
    console.error('Error fetching vendor email:', error);
    return null;
  }
}

export async function getAttendees(eventId, userToken = null) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    }
    
    const response = await fetch(`http://attendees-service:8005/v1/events/${eventId}/attendees`, { headers });
    if (response.ok) {
      return await response.json();
    }
    console.log('Attendees service response:', response.status, await response.text());
    return [];
  } catch (error) {
    console.error('Error fetching attendees:', error);
    return [];
  }
}

export async function getTasks(eventId, userToken = null) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    }
    
    const response = await fetch(`http://tasks-service:8004/v1/tasks?eventId=${eventId}`, { headers });
    if (response.ok) {
      return await response.json();
    }
    console.log('Tasks service response:', response.status, await response.text());
    return [];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}
