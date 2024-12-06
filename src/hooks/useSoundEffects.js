import { useEffect, useState } from 'react';

export const useSoundEffects = () => {
  const [sounds, setSounds] = useState({
    happyBark: null,
    sadBark: null
  });

  useEffect(() => {
    const loadSounds = async () => {
      try {
        const happyBark = new Audio('/happy_bark.mp3');
        const sadBark = new Audio('/angry_bark.mp3');
        
        setSounds({
          happyBark,
          sadBark
        });
      } catch (error) {
        console.error('Failed to load sounds:', error);
      }
    };

    loadSounds();
  }, []);

  const playSound = (type) => {
    try {
      if (sounds[type]) {
        sounds[type].play();
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  return playSound;
}; 