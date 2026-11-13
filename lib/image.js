"use client";

/** Shrinks a photo to a small JPEG data URL (keeps uploads light). */
export function shrinkImage(file, max = 1080, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

/** Validates a picked file: JPG/PNG up to 10 MB. Returns an error message or "". */
export function checkImageFile(file) {
  if (!/^image\/(jpeg|png)$/.test(file.type)) return "Please choose a JPG or PNG image.";
  if (file.size > 10 * 1024 * 1024) return "That image is larger than 10 MB.";
  return "";
}

/** Converts a data URL back into a Blob for upload. */
export async function dataUrlToBlob(dataUrl) {
  return (await fetch(dataUrl)).blob();
}

/** Centre-crops a photo to a square JPEG data URL (for profile photos). */
export function cropSquare(file, size = 400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = c.height = Math.min(size, side);
      c.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}
