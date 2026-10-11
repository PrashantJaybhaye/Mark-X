import React from "react";
import { DriveFileOptionsSheet, DriveFileOptionsSheetProps } from "./DriveFileOptionsSheet";

export type DrivePreviewActionSheetProps = DriveFileOptionsSheetProps;

export function DrivePreviewActionSheet(props: DrivePreviewActionSheetProps) {
  return <DriveFileOptionsSheet theme="dark" {...props} />;
}
