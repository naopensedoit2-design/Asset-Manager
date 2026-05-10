import { v2 as cloudinary } from "cloudinary";
import { config } from "./config";

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export async function uploadImage(
  fileBuffer: Buffer,
  options: {
    folder?: string;
    publicId?: string;
    transformation?: object;
  } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder ?? "casei-de-lafer",
      public_id: options.publicId,
      overwrite: true,
      resource_type: "image" as const,
      transformation: options.transformation,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Upload failed: no result returned"));
          return;
        }
        resolve(result.secure_url);
      },
    );

    uploadStream.end(fileBuffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
