import { Base64 } from 'js-base64';

// Encode data to base64 for URL sharing
export const encodeData = (data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    return Base64.encodeURI(jsonString);
  } catch (error) {
    console.error('Error encoding data:', error);
    return '';
  }
};

// Decode base64 data from URL
export const decodeData = (encodedString: string): any => {
  try {
    const jsonString = Base64.decode(encodedString);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error decoding data:', error);
    return null;
  }
};

// Generate shareable URL
export const generateShareUrl = (data: any): string => {
  const encodedData = encodeData(data);
  if (!encodedData) return '';

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${currentUrl}/share/${encodedData}`;
};

// Extract data from current URL
export const getDataFromUrl = (): any => {
  if (typeof window === 'undefined') return null;

  const pathParts = window.location.pathname.split('/');
  if (pathParts[1] === 'share' && pathParts[2]) {
    return decodeData(pathParts[2]);
  }
  return null;
};

// Check if current URL is a share link
export const isShareUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/share/');
};
