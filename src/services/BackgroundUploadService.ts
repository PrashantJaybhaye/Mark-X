import notifee, { AndroidImportance } from '@notifee/react-native';

const CHANNEL_ID = 'uploads_channel';
const NOTIFICATION_ID = 'upload_foreground';

let activeUploads = 0;
let currentTotalProgress = 0;

// Register the headless task required by Notifee for Foreground Services
// This keeps the JavaScript thread alive on Android
notifee.registerForegroundService(() => {
  return new Promise(() => {
    // Keeps Foreground Service active until notifee.stopForegroundService() is called
  });
});

export async function setupUploadChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Media Uploads',
    importance: AndroidImportance.LOW,
  });
}

/**
 * Starts the foreground notification service for background uploads.
 */
export async function startBackgroundUpload(
  title: string = 'Syncing to Mark-X...',
  body: string = 'Your media is uploading in the background.'
) {
  if (activeUploads === 0) {
    currentTotalProgress = 0;
    try {
      await notifee.requestPermission();
    } catch {
      // User may have denied permission
    }
    await setupUploadChannel();
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title,
      body,
      android: {
        channelId: CHANNEL_ID,
        asForegroundService: true,
        ongoing: true,
        progress: {
          max: 100,
          current: 0,
          indeterminate: true,
        },
      },
    });
  }
  activeUploads++;
}

/**
 * Updates the ongoing notification with deterministic progress percentage.
 */
export async function updateUploadProgress(percent: number, statusBody?: string) {
  const boundedPercent = Math.min(100, Math.max(0, Math.round(percent)));
  currentTotalProgress = boundedPercent;

  if (activeUploads > 0) {
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: 'Syncing to Mark-X...',
      body: statusBody || `Uploading media... ${boundedPercent}%`,
      android: {
        channelId: CHANNEL_ID,
        asForegroundService: true,
        ongoing: true,
        progress: {
          max: 100,
          current: boundedPercent,
          indeterminate: false,
        },
      },
    });
  }
}

/**
 * Stops the foreground service notification and displays a final completion state.
 */
export async function stopBackgroundUpload(
  success: boolean = true,
  customMessage?: string
) {
  activeUploads = Math.max(0, activeUploads - 1);

  if (activeUploads === 0) {
    // Stop the foreground service execution
    await notifee.stopForegroundService();

    // Display temporary success/fail notification
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: success ? 'Sync Complete' : 'Sync Failed',
      body: customMessage || (success ? 'All your media was securely uploaded.' : 'Some media failed to upload.'),
      android: {
        channelId: CHANNEL_ID,
        ongoing: false,
        asForegroundService: false,
      },
    });

    // Automatically dismiss completion notification after 3 seconds
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

/**
 * Executes a single upload task with progress tracking and automatic exponential retries.
 */
export async function executeUploadWithRetry(
  task: UploadQueueTask,
  uploadFn: (
    localUri: string,
    mimeType: string,
    fileName: string,
    onProgress: (percent: number) => void
  ) => Promise<TaskUploadResult>
): Promise<TaskUploadResult> {
  const maxRetries = task.maxRetries ?? 3;
  let attempt = 0;

  await startBackgroundUpload(
    'Syncing to Mark-X...',
    `Starting upload for ${task.fileName}`
  );

  while (attempt < maxRetries) {
    attempt++;

    try {
      if (attempt > 1) {
        await updateUploadProgress(
          0,
          `Retrying ${task.fileName} (Attempt ${attempt}/${maxRetries})...`
        );
      }

      const result = await uploadFn(
        task.localUri,
        task.mimeType,
        task.fileName,
        (progressPercent) => {
          updateUploadProgress(
            progressPercent,
            `Uploading ${task.fileName}... ${progressPercent}%`
          );
        }
      );

      if (result.success) {
        await stopBackgroundUpload(true, `${task.fileName} uploaded successfully.`);
        return result;
      }

      console.warn(`[BackgroundUploadService] Attempt ${attempt}/${maxRetries} failed for ${task.fileName}: ${result.error}`);
    } catch (err: any) {
      console.warn(`[BackgroundUploadService] Attempt ${attempt}/${maxRetries} error for ${task.fileName}: ${err?.message}`);
    }

    // Exponential backoff before retry if retries remain
    if (attempt < maxRetries) {
      const backoffMs = attempt * 1500;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  // All retries failed
  await stopBackgroundUpload(false, `Failed to upload ${task.fileName} after ${maxRetries} attempts.`);
  return {
    success: false,
    error: `Upload failed after ${maxRetries} attempts`,
  };
}