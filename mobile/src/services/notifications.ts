import * as Notifications from 'expo-notifications';

let handlerConfigured = false;

/**
 * Configures how the app handles incoming notifications.
 * Call once at app startup (before any notification is scheduled).
 */
export function setupNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Requests permission to display notifications.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Sends a local notification immediately (no server needed).
 */
export async function sendBinAlert(
  binName: string,
  binLocation: string,
  level: number,
  threshold: number,
): Promise<void> {
  const title = `🗑️ ${binName} atingiu ${level}%`;
  const body = binLocation
    ? `A lixeira em ${binLocation} passou de ${threshold}%. Considere fazer a coleta.`
    : `A lixeira passou de ${threshold}% de ocupação. Considere fazer a coleta.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: { type: 'bin_alert', threshold, level },
    },
    trigger: null, // immediate — no scheduling
  });
}
