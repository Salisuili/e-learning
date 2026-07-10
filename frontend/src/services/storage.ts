import { api } from "./supabase";

export const storageService = {
  /**
   * Upload file to backend
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: Blob,
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      formData.append('path', path);

      const response = await api.upload('POST', '/upload', formData);
      return { url: response.url || null, error: null };
    } catch (error) {
      return { url: null, error: (error as Error).message };
    }
  },

  /**
   * Delete file from backend
   */
  async deleteFile(
    bucket: string,
    path: string,
  ): Promise<{ error: string | null }> {
    try {
      await api.delete(`/upload?bucket=${bucket}&path=${path}`);
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Get public URL for file
   */
  getPublicUrl(bucket: string, path: string): string {
    return `http://localhost:3001/uploads/${bucket}/${path}`;
  },

  /**
   * Download file
   */
  async downloadFile(
    bucket: string,
    path: string,
  ): Promise<{ data: Blob | null; error: string | null }> {
    try {
      const response = await fetch(`http://localhost:3001/uploads/${bucket}/${path}`);
      const blob = await response.blob();
      return { data: blob, error: null };
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
      const response = await api.get(`/upload?bucket=${bucket}&path=${path}`);
      return { files: response.files || [], error: null };
    } catch (error) {
      return { files: null, error: (error as Error).message };
    }
  },
};