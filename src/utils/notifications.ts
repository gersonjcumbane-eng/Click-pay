/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility helper to handle Native Browser Notifications in the Payroll System
 */

// Check if browser notifications are supported
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Request permission from the user
export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (!isNotificationSupported()) {
    console.warn("Este navegador não suporta notificações de desktop.");
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Erro ao solicitar permissão de notificação:", error);
    return 'default';
  }
}

// Get the current permission state
export function getNotificationPermissionState(): 'granted' | 'denied' | 'default' {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

// Dispatch a native browser notification
export function sendBrowserNotification(title: string, body: string, options?: NotificationOptions) {
  if (!isNotificationSupported()) {
    console.warn("Notificações de desktop não suportadas neste navegador.");
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      // Create options with standard system logo icon if possible
      const defaultOptions: NotificationOptions = {
        body,
        icon: '/logo-payroll.png', // Main system logo
        tag: 'payroll-tech-notification',
        requireInteraction: false,
        ...options
      };
      
      const notification = new Notification(title, defaultOptions);
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
      
      return notification;
    } catch (err) {
      console.error("Erro ao exibir notificação:", err);
    }
  } else {
    console.info("Permissão de notificação não concedida. Estado atual:", Notification.permission);
  }
}
