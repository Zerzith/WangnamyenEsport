const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "djubsqri6";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "wangnamyenesport";

export async function uploadImageToCloudinary(source: File | string): Promise<string> {
  const formData = new FormData();
  formData.append("file", source);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("ไม่สามารถอัปโหลดโลโก้ทีมได้ กรุณาลองใหม่อีกครั้ง");
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error("ไม่พบ URL รูปภาพจาก Cloudinary");
  }
  return data.secure_url;
}
