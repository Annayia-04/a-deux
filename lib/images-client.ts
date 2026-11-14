/**
 * Préparation des photos côté navigateur.
 *
 * On réencode toujours l'image en JPEG : cela réduit le poids, borne les
 * dimensions et supprime les métadonnées EXIF (dont la géolocalisation).
 */

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

type Drawable = ImageBitmap | HTMLImageElement;

async function loadDrawable(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Certains formats (HEIC selon le navigateur) échouent ici : on tente
      // le décodage <img>, qui donne un message d'erreur plus clair.
    }
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Cette image ne peut pas être lue par le navigateur."));
    };
    image.src = url;
  });
}

export async function compressPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choisissez un fichier image.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Cette image est trop lourde (20 Mo maximum).");
  }

  const drawable = await loadDrawable(file);
  const width = "width" in drawable ? drawable.width : 0;
  const height = "height" in drawable ? drawable.height : 0;
  if (!width || !height) {
    throw new Error("Cette image est vide ou illisible.");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Impossible de préparer cette image.");
  }
  context.drawImage(drawable, 0, 0, targetWidth, targetHeight);
  if ("close" in drawable) drawable.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });
  if (!blob) {
    throw new Error("Impossible de compresser cette image.");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "souvenir";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function compressPhotos(files: File[]): Promise<File[]> {
  const prepared: File[] = [];
  for (const file of files) {
    prepared.push(await compressPhoto(file));
  }
  return prepared;
}
