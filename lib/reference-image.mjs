export const MAX_REFERENCE_LENGTH = 1400000;
export function validateReferenceImage(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > MAX_REFERENCE_LENGTH)
    throw new Error(
      "Reference image is too large. Choose an image under 10 MB.",
    );
  const match =
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0)
    throw new Error("Choose a PNG, JPEG or WebP reference image.");
  const prefix = atob(match[2].slice(0, 32));
  const valid =
    match[1] === "png"
      ? prefix.startsWith("\x89PNG\r\n\x1a\n")
      : match[1] === "jpeg"
        ? prefix.startsWith("\xff\xd8\xff")
        : prefix.startsWith("RIFF") && prefix.slice(8, 12) === "WEBP";
  if (!valid)
    throw new Error(
      "The reference image could not be read. Choose another image.",
    );
  return value;
}
export async function referenceFingerprint(value) {
  if (!value) return "";
  const bytes = new TextEncoder().encode(value);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
