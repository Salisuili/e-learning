import { supabase } from "./supabase";

export const storageService = {
  /**
   * Upload file to Supabase storage
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: Blob,
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          upsert: false,
        });

      if (error) {
        return { url: null, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return { url: urlData.publicUrl, error: null };
    } catch (error) {
      return { url: null, error: (error as Error).message };
    }
  },

  /**
   * Delete file from storage
   */
  async deleteFile(
    bucket: string,
    path: string,
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Get public URL for file
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Download file
   */
  async downloadFile(
    bucket: string,
    path: string,
  ): Promise<{ data: Blob | null; error: string | null }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: (error as Error).message };
    }
  },

  /**
   * List files in bucket/path
   */
  async listFiles(
    bucket: string,
    path: string,
  ): Promise<{ files: any[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase.storage.from(bucket).list(path);

      if (error) {
        return { files: null, error: error.message };
      }

      return { files: data || [], error: null };
    } catch (error) {
      return { files: null, error: (error as Error).message };
    }
  },
};
