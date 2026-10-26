"use client";

/**
 * @module shared/lib/hooks/useAutoSlider
 * @description Хук для автоматической прокрутки слайдера
 */

import { useState, useEffect, useCallback } from "react";

interface UseAutoSliderOptions {
  totalSlides: number;
  interval?: number;
  autoPlay?: boolean;
}

interface UseAutoSliderReturn {
  currentSlide: number;
  isAutoPlaying: boolean;
  nextSlide: () => void;
  prevSlide: () => void;
  goToSlide: (index: number) => void;
  pauseAutoPlay: () => void;
  resumeAutoPlay: () => void;
}

export function useAutoSlider({
  totalSlides,
  interval = 5000,
  autoPlay = true,
}: UseAutoSliderOptions): UseAutoSliderReturn {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  }, []);

  const pauseAutoPlay = useCallback(() => {
    setIsAutoPlaying(false);
  }, []);

  const resumeAutoPlay = useCallback(() => {
    setIsAutoPlaying(true);
  }, []);

  // Автоматическая прокрутка
  // eslint-disable-next-line no-restricted-syntax
  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(nextSlide, interval);
    return () => clearInterval(timer);
  }, [isAutoPlaying, nextSlide, interval]);

  // Возобновление автопрокрутки через 10 секунд после паузы
  // eslint-disable-next-line no-restricted-syntax
  useEffect(() => {
    if (isAutoPlaying) return;

    const timer = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [isAutoPlaying]);

  return {
    currentSlide,
    isAutoPlaying,
    nextSlide,
    prevSlide,
    goToSlide,
    pauseAutoPlay,
    resumeAutoPlay,
  };
}
