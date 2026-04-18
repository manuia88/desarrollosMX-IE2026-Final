import type { SupabaseClient } from '@supabase/supabase-js';

export const STORAGE_BUCKETS = {
  profileAvatars: 'profile-avatars',
  projectPhotos: 'project-photos',
  operationFiles: 'operation-files',
  commissionInvoices: 'commission-invoices',
  dossierExports: 'dossier-exports',
} as const;

type BucketId = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

type BucketLimits = {
  readonly maxBytes: number;
  readonly mimeTypes: ReadonlyArray<string>;
};

const BUCKET_LIMITS: Record<BucketId, BucketLimits> = {
  'profile-avatars': {
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  },
  'project-photos': {
    maxBytes: 15 * 1024 * 1024,
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  },
  'operation-files': {
    maxBytes: 50 * 1024 * 1024,
    mimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  'commission-invoices': {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/xml', 'text/xml'],
  },
  'dossier-exports': {
    maxBytes: 50 * 1024 * 1024,
    mimeTypes: ['application/pdf'],
  },
};

export class StorageUploadError extends Error {
  constructor(
    public readonly code: 'invalid_mime' | 'size_exceeded' | 'invalid_path' | 'upload_failed',
    message: string,
  ) {
    super(message);
    this.name = 'StorageUploadError';
  }
}

export type StorageUploadInput = {
  supabase: SupabaseClient;
  bucket: BucketId;
  ownerId: string;
  file: File | Blob;
  filename: string;
  upsert?: boolean;
};

export async function uploadToBucket({
  supabase,
  bucket,
  ownerId,
  file,
  filename,
  upsert = false,
}: StorageUploadInput) {
  const limits = BUCKET_LIMITS[bucket];

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId)) {
    throw new StorageUploadError('invalid_path', 'ownerId must be a UUID');
  }

  if (!/^[\w.\-() ]+$/.test(filename) || filename.startsWith('.')) {
    throw new StorageUploadError(
      'invalid_path',
      'filename must be alphanumeric + [.-_() space], no leading dot',
    );
  }

  if (file.size > limits.maxBytes) {
    throw new StorageUploadError(
      'size_exceeded',
      `file ${file.size}B exceeds bucket limit ${limits.maxBytes}B`,
    );
  }

  const fileMime = (file as File).type ?? 'application/octet-stream';
  if (!limits.mimeTypes.includes(fileMime)) {
    throw new StorageUploadError(
      'invalid_mime',
      `mime "${fileMime}" not in allowlist for bucket ${bucket}`,
    );
  }

  const path = `${ownerId}/${filename}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert, contentType: fileMime });

  if (error) {
    throw new StorageUploadError('upload_failed', error.message);
  }

  return { path: data.path, bucket };
}
