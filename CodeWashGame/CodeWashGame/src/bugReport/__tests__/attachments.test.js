import { describe, it, expect } from 'vitest';
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  validateAttachments,
  readAttachment,
  readAttachments,
} from '../attachments';

const image = (name = 'capture.png', size = 10) =>
  new File([new Uint8Array(size)], name, { type: 'image/png' });

describe('validateAttachments', () => {
  it('liste valide -> null', () => {
    expect(validateAttachments([])).toBeNull();
    expect(validateAttachments([image(), image('b.png')])).toBeNull();
  });

  it('trop de fichiers', () => {
    expect(validateAttachments(Array.from({ length: MAX_ATTACHMENTS + 1 }, () => image()))).toBe(
      'too-many-files',
    );
  });

  it('fichier qui n’est pas une image', () => {
    const text = new File(['x'], 'notes.txt', { type: 'text/plain' });
    expect(validateAttachments([text])).toBe('not-an-image');
  });

  it('image trop lourde', () => {
    const big = { name: 'big.png', type: 'image/png', size: MAX_ATTACHMENT_BYTES + 1 };
    expect(validateAttachments([big])).toBe('file-too-large');
  });
});

describe('readAttachment', () => {
  it('lit une image en data URL', async () => {
    await expect(readAttachment(image('c.png', 3))).resolves.toEqual({
      name: 'c.png',
      type: 'image/png',
      size: 3,
      dataUrl: 'data:image/png;base64,AAAA',
    });
  });

  it('lecture impossible -> promesse rejetée', async () => {
    const failingReader = () => {
      const reader = {};
      reader.readAsDataURL = () => reader.onerror();
      return reader;
    };
    await expect(readAttachment(image('x.png'), failingReader)).rejects.toThrow('x.png');
  });

  it('erreur fournie par le lecteur -> transmise', async () => {
    const reader = { error: new Error('disque') };
    reader.readAsDataURL = () => reader.onerror();
    await expect(readAttachment(image(), () => reader)).rejects.toThrow('disque');
  });

  it('readAttachments lit plusieurs fichiers', async () => {
    const result = await readAttachments([image('a.png'), image('b.png')]);
    expect(result.map((r) => r.name)).toEqual(['a.png', 'b.png']);
  });
});
