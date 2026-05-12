import { v2 as cloudinary } from "cloudinary";

function initCloudinary() {
  cloudinary.config({
    cloud_name: process.env["CLOUDINARY_CLOUD_NAME"],
    api_key: process.env["CLOUDINARY_API_KEY"],
    api_secret: process.env["CLOUDINARY_API_SECRET"],
  });
  return cloudinary;
}

export async function uploadImage(
  file: File,
  folder: string,
): Promise<{ url: string; publicId: string }> {
  const cl = initCloudinary();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    cl.uploader
      .upload_stream({ folder, resource_type: "image" }, (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Upload failed"));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      })
      .end(buffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  const cl = initCloudinary();
  await cl.uploader.destroy(publicId);
}
