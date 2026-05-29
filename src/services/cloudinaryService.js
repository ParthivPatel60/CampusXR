import { CLOUD_NAME, UPLOAD_PRESET } from "../config/cloudinary";

/**
 * Returns a Cloudinary URL with on-the-fly resizing and optimisation.
 * Inserts w_<W>,h_<H>,c_fill,q_auto,f_auto between /upload/ and the public-id.
 * Requests 2× pixel density by default so thumbnails look crisp on retina displays.
 * Falls back to the original URL for non-Cloudinary sources.
 */
export function getCloudinaryThumb(url, w = 152, h = 88) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/w_${w},h_${h},c_fill,q_auto,f_auto/`);
}

export async function uploadImageToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error("Cloudinary upload failed");
  }

  const data = await res.json();
  return { secure_url: data.secure_url, public_id: data.public_id };
}
