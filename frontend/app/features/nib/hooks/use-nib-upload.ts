'use client';

/** @deprecated Upload now happens via the upload dialog on the home page. */
export function useNibUpload() {
  return { isUploading: false, uploadError: null };
}
