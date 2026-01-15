import * as fs from 'fs';
import * as path from 'path';
import { FileNotFoundError, ValidationError } from '../types/index.js';

/**
 * File operations service (images only - video methods removed)
 */
export class FileService {
  /**
   * Check if a string is a URL
   */
  static isUrl(source: string): boolean {
    try {
      const url = new URL(source);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Validate if image source exists and check size limit
   * @param imageSource Path to image file or URL
   * @param maxSizeMB Maximum file size in MB (default: 20MB for OpenAI)
   */
  static async validateImageSource(
    imageSource: string,
    maxSizeMB: number = 20
  ): Promise<void> {
    if (this.isUrl(imageSource)) {
      // For URLs, validate URL format
      try {
        const url = new URL(imageSource);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new ValidationError(
            `Unsupported URL protocol: ${url.protocol}. Only http:// and https:// are supported.`
          );
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          throw error;
        }
        throw new ValidationError(
          `Invalid URL format: ${imageSource}. Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      // Note: Actual content validation (size, format) happens during download in encodeImageToBase64
      return;
    }

    if (!fs.existsSync(imageSource)) {
      throw new FileNotFoundError(`Image file not found: ${imageSource}`);
    }

    const stats = fs.statSync(imageSource);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (stats.size > maxSizeBytes) {
      throw new ValidationError(
        `Image file too large: ${(stats.size / (1024 * 1024)).toFixed(2)}MB. ` +
          `Maximum allowed: ${maxSizeMB}MB`
      );
    }

    const ext = path.extname(imageSource).toLowerCase();
    const supportedExts = ['.jpg', '.jpeg', '.png'];

    if (!supportedExts.includes(ext)) {
      throw new ValidationError(
        `Unsupported image format: ${ext}. ` +
          `Supported formats: ${supportedExts.join(', ')}`
      );
    }
  }

  /**
   * Encode image to base64 data URL (from file or URL)
   * @param imageSource Path to image file or URL
   * @returns Base64 encoded image data
   */
  static async encodeImageToBase64(
    imageSource: string
  ): Promise<string> {
    if (this.isUrl(imageSource)) {
      // For URLs, download and encode to base64
      return this.downloadAndEncodeImage(imageSource);
    }

    // For local files, encode to base64
    const imageBuffer = fs.readFileSync(imageSource);
    const ext = path.extname(imageSource).toLowerCase().slice(1);
    const mimeType = this.getMimeType(ext);

    console.debug('Encoded image to base64', { imageSource, mimeType });
    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  }

  /**
   * Download image from URL and encode to base64
   * @param imageUrl Image URL to download
   * @returns Base64 encoded image data
   */
  private static async downloadAndEncodeImage(
    imageUrl: string
  ): Promise<string> {
    console.debug('Downloading image from URL', { imageUrl });

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new ValidationError(
          `Failed to download image: HTTP ${response.status} ${response.statusText}`
        );
      }

      // Get content type from response headers
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new ValidationError(
          `Invalid content type: ${contentType}. Expected image/*`
        );
      }

      // Get content length for size validation
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const sizeInMB = parseInt(contentLength) / (1024 * 1024);
        if (sizeInMB > 20) {
          throw new ValidationError(
            `Downloaded image too large: ${sizeInMB.toFixed(2)}MB. Maximum allowed: 20MB`
          );
        }
      }

      // Download image data
      const imageBuffer = Buffer.from(await response.arrayBuffer());

      // Additional size check from actual data
      const actualSizeInMB = imageBuffer.length / (1024 * 1024);
      if (actualSizeInMB > 20) {
        throw new ValidationError(
          `Downloaded image too large: ${actualSizeInMB.toFixed(2)}MB. Maximum allowed: 20MB`
        );
      }

      console.debug('Successfully downloaded and encoded image', {
        imageUrl,
        contentType,
        sizeInMB: actualSizeInMB.toFixed(2)
      });

      return `data:${contentType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Failed to download image from URL: ${imageUrl}. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get MIME type for image file extension or content type
   */
  static getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif'
    };
    return mimeTypes[extension] || 'image/png';
  }
}

/**
 * File service for image operations
 */
export const fileService = FileService;
