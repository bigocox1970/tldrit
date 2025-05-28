import md5 from 'md5';

export function urlToHash(url: string): string {
  return md5(url);
} 