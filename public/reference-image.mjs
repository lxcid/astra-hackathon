// Resize and re-encode locally before sending the image with the theme request.
export async function prepareReferenceImage(file) {
  if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Choose a PNG, JPEG or WebP image.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose an image under 10 MB.");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image could not be opened. Try another file.");
  }
  try {
    if (bitmap.width * bitmap.height > 40000000)
      throw new Error("Choose an image smaller than 40 megapixels.");
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", 0.85);
    if (image.length > 1400000)
      throw new Error("This image is too detailed. Choose a smaller image.");
    return image;
  } finally {
    bitmap.close();
  }
}
