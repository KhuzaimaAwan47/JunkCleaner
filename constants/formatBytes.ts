/**
 * Format file size in bytes to human-readable format (B, KB, MB, GB, TB)
 * @param bytes - File size in bytes
 * @returns Formatted string with appropriate unit (e.g., "1.5 KB", "2.0 MB")
 */
const formatBytes = (bytes: number): string => {
  // Handle zero and negative values
  if (!bytes || bytes < 0) return "0 B";
  
  const units = ["B", "KB", "MB", "GB", "TB"];
  const threshold = 1024;
  
  // Calculate which unit to use based on size
  let exponent = 0;
  let value = bytes;
  
  // Determine the appropriate unit by checking thresholds
  if (bytes >= Math.pow(threshold, 4)) {
    // TB range (1024^4 bytes and above)
    exponent = 4;
  } else if (bytes >= Math.pow(threshold, 3)) {
    // GB range (1024^3 to 1024^4 - 1 bytes)
    exponent = 3;
  } else if (bytes >= Math.pow(threshold, 2)) {
    // MB range (1024^2 to 1024^3 - 1 bytes)
    exponent = 2;
  } else if (bytes >= threshold) {
    // KB range (1024 to 1024^2 - 1 bytes)
    exponent = 1;
  } else {
    // B range (0 to 1023 bytes)
    exponent = 0;
  }
  
  // Calculate the value in the selected unit
  value = bytes / Math.pow(threshold, exponent);
  
  // Format with appropriate decimal places
  // Values >= 10: show 0 decimal places (e.g., "10 KB")
  // Values < 10: show 1 decimal place (e.g., "1.5 KB")
  const formattedValue = value >= 10 ? value.toFixed(0) : value.toFixed(1);
  
  return `${formattedValue} ${units[exponent]}`;
};

export default formatBytes;









