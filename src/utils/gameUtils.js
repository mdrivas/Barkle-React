// Utility functions for the game
export const generateSeedFromDate = (date) => {
  const dateHash = (date.getFullYear() * 31 + 
                   date.getMonth() * 12 + 
                   date.getDate()) * 2654435761;
  return Math.abs(dateHash) % 2147483647;
};

export const seededRandom = (seed) => {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

export const generateDeviceId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const containsBadWords = (name) => {
  const badWords = ['bitch', 'nig', 'fuck'];
  const lowerCaseName = name.toLowerCase();
  const words = lowerCaseName.split(/[\s-_]+/);
  
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (badWords.includes(cleanWord)) return true;
    
    const numberSubstitutions = cleanWord
      .replace(/1/g, 'i')
      .replace(/3/g, 'e')
      .replace(/4/g, 'a')
      .replace(/5/g, 's')
      .replace(/0/g, 'o');
      
    if (badWords.includes(numberSubstitutions)) return true;
  }
  return false;
}; 