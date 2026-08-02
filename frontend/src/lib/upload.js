import api from "@/lib/api";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export async function uploadToCloudinary(file) {
  const isPdf = file.type === "application/pdf";
  const resource_type = isPdf ? "raw" : "image";
  const { data: sig } = await api.get(`/cloudinary/signature?resource_type=${resource_type}`);
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.api_key);
  form.append("timestamp", sig.timestamp);
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloud_name}/${resource_type}/upload`,
    { method: "POST", body: form }
  );
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "Upload failed");
  return { url: json.secure_url, public_id: json.public_id, resource_type, format: json.format };
}

export function isImageFile(type) {
  return IMAGE_TYPES.includes(type);
}
