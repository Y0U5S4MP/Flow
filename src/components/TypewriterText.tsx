import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  duration: number;
  delay?: number;
  onComplete?: () => void;
  style?: React.CSSProperties;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  duration,
  delay = 0,
  onComplete,
  style
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      if (currentIndex < text.length) {
        const charDelay = duration / text.length;
        const timeout = setTimeout(() => {
          setDisplayedText(text.substring(0, currentIndex + 1));
          setCurrentIndex(currentIndex + 1);
        }, charDelay);

        return () => clearTimeout(timeout);
      } else if (onComplete && currentIndex === text.length) {
        onComplete();
      }
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [currentIndex, text, duration, delay, onComplete]);

  return <span style={style}>{displayedText}</span>;
};

export default TypewriterText;
