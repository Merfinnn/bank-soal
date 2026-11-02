export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const PRESIGNED_URL_TTL_SECONDS = 5 * 60;

export const ALLOWED_CONTENT_TYPES = {
  EXAM_DOCUMENT: {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg"
  },
  ANSWER_KEY: {
    ".pdf": "application/pdf"
  }
} as const;
