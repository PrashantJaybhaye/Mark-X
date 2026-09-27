import notifee, { AndroidImportance } from '@notifee/react-native';

const CHANNEL_ID = 'uploads_channel_v3';
const NOTIFICATION_ID = 'upload_foreground';

let activeUploads = 0;

// Notifee headless foreground task
notifee.registerForegroundService(() => new Promise(() => {}));

async function ensureChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Media Uploads',
    importance: AndroidImportance.HIGH,
    vibration: false,
  });
}

async function renderNotification(
  title: string,
  body: string,
  progress?: { current: number; indeterminate: boolean },
  isForeground = true
) {
  await ensureChannel();
  await notifee.displayNotification({
    id: NOTIFICATION_ID,
    title,
    body,
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: isForeground,
      ongoing: isForeground,
      onlyAlertOnce: true,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      ...(progress
        ? { progress: { max: 100, current: progress.current, indeterminate: progress.indeterminate } }
        : {}),
    },
  });
}

export async function startBackgroundUpload(
  title = 'Syncing to Mark-X...',
  body = 'Your media is uploading in the background.'
) {
  if (activeUploads === 0) {
    try {
      await notifee.requestPermission();
    } catch {}
    await renderNotification(title, body, { current: 0, indeterminate: true });
  }
  activeUploads++;
}

export async function updateUploadProgress(percent: number, statusBody?: string) {
  const bounded = Math.min(100, Math.max(0, Math.round(percent)));
  if (activeUploads > 0) {
    await renderNotification(
      'Syncing to Mark-X...',
      statusBody || `Uploading media... ${bounded}%`,
      { current: bounded, indeterminate: false }
    );
  }
}

export async function stopBackgroundUpload(success = true, customMessage?: string) {
  activeUploads = Math.max(0, activeUploads - 1);
  if (activeUploads === 0) {
    await notifee.stopForegroundService();
    await renderNotification(
      success ? 'Sync Complete' : 'Sync Failed',
      customMessage || (success ? 'All your media was securely uploaded.' : 'Some media failed to upload.'),
      undefined,
      false
    );
    setTimeout(() => {
      notifee.cancelNotification(NOTIFICATION_ID);
    }, 3000);
  }
}

export interface UploadQueueTask {
  id: string;
  localUri: string;
  mimeType: string;
  fileName: string;
  maxRetries?: number;
}

export interface TaskUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function executeUploadWithRetry(
  task: UploadQueueTask,
  uploadFn: (
    localUri: string,
    mimeType: string,
    fileName: string,
    onProgress: (pct: number) => void
  ) => Promise<TaskUploadResult>
): Promise<TaskUploadResult> {
  const maxRetries = task.maxRetries ?? 3;
  let attempt = 0;

  await startBackgroundUpload('Syncing to Mark-X...', `Starting upload for ${task.fileName}`);

  while (attempt < maxRetries) {
    attempt++;

    try {
      if (attempt > 1) {
        await updateUploadProgress(0, `Retrying ${task.fileName} (Attempt ${attempt}/${maxRetries})...`);
      }

      const res = await uploadFn(task.localUri, task.mimeType, task.fileName, (pct) => {
        updateUploadProgress(pct, `Uploading ${task.fileName}... ${pct}%`);
      });

      if (res.success) {
        await stopBackgroundUpload(true, `${task.fileName} uploaded successfully.`);
        return res;
      }
    } catch (err: any) {
      console.warn(`[BackgroundUpload] Attempt ${attempt}/${maxRetries} error for ${task.fileName}:`, err?.message);
    }

    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }

  await stopBackgroundUpload(false, `Failed to upload ${task.fileName} after ${maxRetries} attempts.`);
  return { success: false, error: `Upload failed after ${maxRetries} attempts` };
}