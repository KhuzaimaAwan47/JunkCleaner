import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';
import * as FileSystem from 'expo-file-system/legacy';

const CHUNK_SIZE = 1024 * 1024; // 1MB
const BASE64_ENCODING = ((FileSystem as any).EncodingType?.Base64 ?? 'base64') as 'base64';

function bufferToWordArray(buffer: Buffer) {
  const words = [];
  for (let i = 0; i < buffer.length; i += 4) {
    words.push(
      (buffer[i] << 24) |
        ((buffer[i + 1] ?? 0) << 16) |
        ((buffer[i + 2] ?? 0) << 8) |
        (buffer[i + 3] ?? 0)
    );
  }
  return CryptoJS.lib.WordArray.create(words, buffer.length);
}

async function readFileAsBuffer(
  filePath: string,
  options?: { position?: number; length?: number }
): Promise<Buffer> {
  const base64 = await FileSystem.readAsStringAsync(filePath, {
    encoding: BASE64_ENCODING as any,
    ...(options?.position !== undefined && options?.length !== undefined
      ? { position: options.position, length: options.length }
      : {}),
  });

  return Buffer.from(base64, 'base64');
}

/**
 * Chunked Hashing (Partial Hashing) - Computes hash using first and last 1MB chunks
 * For files <= 2MB, hashes the entire file
 */
export async function computePartialHash(filePath: string): Promise<string> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists || fileInfo.isDirectory) {
      throw new Error('File does not exist or is a directory');
    }

    const fileSize = fileInfo.size || 0;

    if (fileSize === 0) {
      throw new Error('Cannot hash empty file');
    }

    // Small file: hash the whole content
    if (fileSize <= 2 * CHUNK_SIZE) {
      const fileData = await readFileAsBuffer(filePath);
      const wordArray = bufferToWordArray(fileData);
      return CryptoJS.SHA1(wordArray).toString();
    }

    // Step 1: Read the first 1MB of file
    const firstChunk = await readFileAsBuffer(filePath, {
      position: 0,
      length: CHUNK_SIZE,
    });

    // Step 2: Read the last 1MB of file
    const lastChunkStart = fileSize - CHUNK_SIZE;
    const lastChunk = await readFileAsBuffer(filePath, {
      position: lastChunkStart,
      length: CHUNK_SIZE,
    });

    // Step 3: Concatenate both chunks
    const combinedData = Buffer.concat([firstChunk, lastChunk]);

    // Step 4: Compute hash of combined data
    const wordArray = bufferToWordArray(combinedData);
    const partialHash = CryptoJS.SHA1(wordArray).toString();

    return partialHash;
  } catch (error) {
    console.error(`Error computing partial hash for ${filePath}:`, error);
    throw error;
  }
}

globalThis.Buffer = globalThis.Buffer || Buffer;
