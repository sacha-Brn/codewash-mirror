// Pièces jointes (captures d'écran) : lues en data URL pour voyager dans le rapport JSON.

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;

/** Renvoie un code d'erreur pour une liste de fichiers, ou `null` si elle est acceptable. */
export const validateAttachments = (files) => {
  if (files.length > MAX_ATTACHMENTS) return 'too-many-files';
  if (files.some((file) => !file.type.startsWith('image/'))) return 'not-an-image';
  if (files.some((file) => file.size > MAX_ATTACHMENT_BYTES)) return 'file-too-large';
  return null;
};

export const readAttachment = (file, createReader = () => new FileReader()) =>
  new Promise((resolve, reject) => {
    const reader = createReader();
    reader.onload = () =>
      resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
    reader.onerror = () => reject(reader.error ?? new Error(`Lecture impossible : ${file.name}`));
    reader.readAsDataURL(file);
  });

export const readAttachments = (files, createReader) =>
  Promise.all(files.map((file) => readAttachment(file, createReader)));
