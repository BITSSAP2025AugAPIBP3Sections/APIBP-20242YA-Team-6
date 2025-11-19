export async function getUserEmail(userId: string): Promise<string | undefined> {
  try {
    const response = await fetch(`http://auth-service:8001/v1/users/${userId}`);
    if (response.ok) {
      const user: any = await response.json();
      return user.email || undefined;
    }
  } catch (error) {
    console.error(`⚠️  Failed to fetch email for user ${userId}:`, error);
  }
  return undefined;
}
