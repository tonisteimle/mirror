/**
 * Image Upload Utilities
 *
 * Handles image file processing, storage, and retrieval.
 */
import { logger } from '../services/logger'

/**
 * Get image dimensions from a File object.
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      resolve(null)
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Save image file to storage.
 * Currently stores in localStorage as data URL (base64).
 *
 * Note: localStorage has a ~5MB limit. For production use with large images,
 * implement a backend API for persistent file storage.
 */
export async function saveImageFile(file: File): Promise<string> {
  // Generate unique filename
  const ext = file.name.split('.').pop() || 'png'
  const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-')
  const timestamp = Date.now()
  const filename = `${baseName}-${timestamp}.${ext}`

  // Read file as data URL and store in localStorage
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })

  // Store in localStorage with prefix
  const mediaKey = `mirror-media:${filename}`
  try {
    localStorage.setItem(mediaKey, dataUrl)
  } catch {
    logger.storage.warn('Could not save image to localStorage - storage may be full')
  }

  return filename
}

/**
 * Get stored image data URL from localStorage.
 */
export function getStoredImageUrl(filename: string): string | null {
  const mediaKey = `mirror-media:${filename}`
  return localStorage.getItem(mediaKey)
}
