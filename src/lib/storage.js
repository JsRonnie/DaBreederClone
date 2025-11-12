import supabase from "./supabaseClient";

export async function uploadFileToBucket({ bucket, path, file, upsert = false, contentType }) {
  const targetPath = path || `${Date.now()}_${file.name}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(targetPath, file, { upsert, contentType: contentType || file.type });
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("bucket") && msg.includes("not found")) {
      throw new Error(
        `Upload failed: Bucket '${bucket}' not found. Create it in Supabase Storage or update the bucket name.`
      );
    }
    throw error;
  }
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(targetPath);
  return { path: targetPath, publicUrl: pub?.publicUrl || null };
}

export async function deletePathsFromBucket({ bucket, paths }) {
  if (!Array.isArray(paths) || paths.length === 0) return { error: null };
  return supabase.storage.from(bucket).remove(paths);
}

export function getPublicUrl({ bucket, path }) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function listPathsUnder({ bucket, prefix }) {
  const { data, error } = await supabase.storage.from(bucket).list(prefix || "");
  if (error) return [];
  return (data || []).map((file) => `${prefix}/${file.name}`);
}
