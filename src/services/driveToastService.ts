import { ToastStatusType } from "../components/drive/UploadStatusToast";

type ToastListener = (name: string, type: ToastStatusType, detail: string) => void;
let listeners: ToastListener[] = [];

export function subscribeDriveToast(listener: ToastListener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function emitDriveToast(
  name: string,
  type: ToastStatusType = "success",
  detail: string = ""
) {
  listeners.forEach((l) => l(name, type, detail));
}
