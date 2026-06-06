import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

const f = createUploadthing();

const getAuthenticatedUser = async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UploadThingError({
      code: 'FORBIDDEN',
      message: 'You must be signed in to upload files.',
    });
  }

  return user;
};

const uploadedFileResponse = (
  file: {
    name: string;
    ufsUrl: string;
    key: string;
    size: number;
    type: string;
  },
  uploadedBy: string
) => ({
  name: file.name,
  ufsUrl: file.ufsUrl,
  key: file.key,
  size: file.size,
  type: file.type,
  uploadedBy,
});

export const ourFileRouter = {
  assignmentFileUploader: f({
    blob: {
      maxFileSize: '64MB',
      maxFileCount: 10,
      contentDisposition: 'attachment',
    },
  })
    .middleware(async () => {
      const user = await getAuthenticatedUser();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) =>
      uploadedFileResponse(file, metadata.userId)
    ),

  richTextFileUploader: f({
    blob: {
      maxFileSize: '64MB',
      maxFileCount: 1,
      contentDisposition: 'attachment',
    },
  })
    .middleware(async () => {
      const user = await getAuthenticatedUser();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) =>
      uploadedFileResponse(file, metadata.userId)
    ),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
