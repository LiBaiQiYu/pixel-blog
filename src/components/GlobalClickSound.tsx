'use client';

import { useEffect } from 'react';
import { pixelAudio } from '../utils/sound';

export const GlobalClickSound: React.FC = () => {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest(
        'button, a[href], [role="button"], select, summary, .cursor-pointer'
      );
      if (!control || control.closest('[data-custom-sound]')) return;
      pixelAudio.playClick();
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
};
