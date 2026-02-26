/** Convert a stored media path to a URL the renderer can load. */
export function getImageUrl(imageUrl: string): string {
  if (!imageUrl) {
    return "";
  }

  if (imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  if (imageUrl.startsWith("vaulty-image://")) {
    return imageUrl;
  }

  if (
    imageUrl.startsWith("images/") ||
    imageUrl.startsWith("metadata/") ||
    imageUrl.startsWith("audios/")
  ) {
    return `vaulty-image://${imageUrl}`;
  }

  const normalized = imageUrl.replace(/\\/g, "/");
  for (const dir of ["/images/", "/metadata/", "/audios/"]) {
    const idx = normalized.lastIndexOf(dir);
    if (idx !== -1) {
      return `vaulty-image://${normalized.slice(idx + 1)}`;
    }
  }

  const filename = imageUrl.split(/[\\/]/).pop() || imageUrl;
  const looksLikeOgPreview = /^link_.*_og\./i.test(filename);
  const guessedFolder = looksLikeOgPreview ? "metadata" : "images";
  return `vaulty-image://${guessedFolder}/${filename}`;
}
