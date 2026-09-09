const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "djubsqri6";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "wangnamyenesport";

export async function uploadImageToCloudinary(source: File | string): Promise<string> {
  if (typeof source !== "string" && source.size > 10 * 1024 * 1024) {
    throw new Error("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 10MB");
  }

  const formData = new FormData();
  formData.append("file", source);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = "กรุณาตรวจสอบไฟล์และลองใหม่อีกครั้ง";
    try {
      const errorData = await response.json();
      detail = errorData?.error?.message || detail;
    } catch {
      detail = `Cloudinary ตอบกลับรหัส ${response.status}`;
    }
    throw new Error(`ไม่สามารถอัปโหลดรูปภาพได้: ${detail}`);
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error("ไม่พบ URL รูปภาพจาก Cloudinary");
  }
  return data.secure_url;
}
