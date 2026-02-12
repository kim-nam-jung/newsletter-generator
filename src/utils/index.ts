export const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;');

export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch { return false; }
};

export const isValidFilename = (name: string): boolean =>
  !/[\\/:*?"<>|]/.test(name) && !/\.\./.test(name);

export const isValidId = (id: string): boolean => 
  /^[a-zA-Z0-9_-]+$/.test(id);
