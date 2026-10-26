/**
 * @module widgets/blog/banner
 * @description Hero-баннер блога с креативным дизайном в бело-оранжевой теме
 */

"use client";

import type React from "react";

import Image from "next/image";
import { LocalizedLink as Link } from "@shared/ui/localized-link";

import { ChevronLeft, ChevronRight, Clock, ArrowRight } from "lucide-react";

import { useT } from "@eventflow/i18n/react";
import { useAutoSlider } from "@/shared/lib/hooks/useAutoSlider";

interface BannerSlide {
  id: number;
  image: string;
  categoryKey: string;
  titleKey: string;
  descriptionKey: string;
  tagKey: string;
  readTime?: number;
  slug: string;
}

const SLIDES: BannerSlide[] = [
  {
    id: 1,
    image: "/images/blog-banner.jpg",
    categoryKey: "public.blog.banner.slides.registration.category",
    titleKey: "public.blog.banner.slides.registration.title",
    descriptionKey: "public.blog.banner.slides.registration.description",
    tagKey: "public.blog.banner.slides.registration.tag",
    readTime: 5,
    slug: "registration-and-checkin",
  },
  {
    id: 2,
    image: "/images/blog-banner2.jpg",
    categoryKey: "public.blog.banner.slides.metrics.category",
    titleKey: "public.blog.banner.slides.metrics.title",
    descriptionKey: "public.blog.banner.slides.metrics.description",
    tagKey: "public.blog.banner.slides.metrics.tag",
    readTime: 8,
    slug: "attendance-metrics",
  },
  {
    id: 3,
    image: "/images/blog-banner3.png",
    categoryKey: "public.blog.banner.slides.messages.category",
    titleKey: "public.blog.banner.slides.messages.title",
    descriptionKey: "public.blog.banner.slides.messages.description",
    tagKey: "public.blog.banner.slides.messages.tag",
    readTime: 6,
    slug: "guest-messages-templates",
  },
];

interface SlideProps {
  slide: BannerSlide;
  isActive: boolean;
}

function Slide({ slide, isActive }: SlideProps): React.ReactElement {
  const t = useT();
  const title = t(slide.titleKey);

  return (
    <div
      className={`absolute inset-0 flex items-center transition-opacity duration-1000 ${
        isActive ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Контейнер для широкого layout */}
      <div className="mx-auto w-full max-w-[1800px] px-6 md:px-8 lg:px-12">
        <div className="grid items-center gap-8 md:gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
          {/* Левая сторона: Контент */}
          <div
            className={`space-y-4 transition-[opacity,transform] duration-500 delay-200 md:space-y-5 lg:space-y-6 xl:space-y-7 ${
              isActive
                ? "translate-x-0 opacity-100"
                : "-translate-x-12 opacity-0"
            }`}
          >
            {/* Категория и тег в одну строку */}
            <div className="flex flex-wrap items-center gap-2.5 md:gap-3">
              <span className="inline-block rounded-full border border-ember-400/30 bg-ember-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-ember-500 md:px-4 md:py-2">
                {t(slide.categoryKey)}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-ember-400">
                {t(slide.tagKey)}
              </span>
            </div>

            {/* Мега-заголовок - оптимизированные размеры для маленьких ноутбуков */}
            <h1 className="font-black leading-[1.05] text-ink-400">
              <span className="block text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl">
                {title}
              </span>
            </h1>

            {/* Описание - уменьшенные отступы */}
            <p className="max-w-2xl text-base leading-relaxed text-ink-100 md:text-lg lg:text-xl">
              {t(slide.descriptionKey)}
            </p>

            {/* Мета и CTA - более компактное */}
            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:gap-5 md:pt-3">
              {/* CTA Button - адаптивные размеры */}
              <Link
                href={`/blog/${slide.slug}`}
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-linear-to-r from-ember-400 to-ember-300 px-7 py-3 text-base font-black text-white shadow-2xl shadow-ember-400/30 transition-all hover:scale-[1.02] hover:shadow-ember-400/50 active:scale-[0.98] md:px-8 md:py-3.5 md:text-lg"
              >
                {t("public.blog.banner.readArticle")}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 md:h-6 md:w-6" />
              </Link>

              {/* Время чтения */}
              {slide.readTime && (
                <div className="flex items-center gap-2 text-ink-100">
                  <Clock className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-sm font-semibold md:text-base">
                    {t("public.blog.banner.readTime", {
                      minutes: slide.readTime,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Правая сторона: Featured изображение */}
          <div
            className={`relative transition-[opacity,transform] duration-500 delay-300 ${
              isActive
                ? "translate-x-0 opacity-100"
                : "translate-x-12 opacity-0"
            }`}
          >
            <div className="group relative aspect-video w-full overflow-hidden rounded-xl bg-bone-200 shadow-2xl md:rounded-xl lg:aspect-4/3">
              <Image
                src={slide.image}
                alt={title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority={slide.id === 1}
              />

              {/* Градиентный оверлей */}
              <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent" />

              {/* Декоративная рамка */}
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-ember-400/30 transition-all group-hover:ring-ember-400/50 md:rounded-xl" />
            </div>

            {/* Светящийся декоративный эффект */}
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-xl bg-linear-to-br from-ember-400/20 via-ember-300/10 to-transparent opacity-60 blur-3xl md:rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface NavigationProps {
  currentSlide: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
}

function Navigation({
  currentSlide,
  totalSlides,
  onPrev,
  onNext,
}: NavigationProps): React.ReactElement {
  const t = useT();

  return (
    <div className="absolute bottom-8 right-4 z-20 flex items-center gap-2 md:bottom-10 md:right-6 md:gap-3 lg:bottom-12 lg:right-12">
      {/* Счетчик */}
      <div className="rounded-lg border border-bone-300 bg-white/90 px-3 py-2 text-xs font-bold text-ink-400 shadow-lg backdrop-blur-sm md:rounded-xl md:px-4 md:py-2.5 md:text-sm">
        <span className="text-ember-400">{currentSlide + 1}</span>
        <span className="text-ink-50"> / </span>
        <span className="text-ink-100">{totalSlides}</span>
      </div>

      {/* Кнопки навигации - компактнее на маленьких экранах */}
      <button
        type="button"
        onClick={onPrev}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-bone-300 bg-white/90 text-ink-400 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:border-ember-400 hover:bg-ember-400 hover:text-white active:scale-95 md:h-12 md:w-12 md:rounded-xl"
        aria-label={t("public.blog.banner.previousSlide")}
      >
        <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
      </button>

      <button
        type="button"
        onClick={onNext}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-bone-300 bg-white/90 text-ink-400 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:border-ember-400 hover:bg-ember-400 hover:text-white active:scale-95 md:h-12 md:w-12 md:rounded-xl"
        aria-label={t("public.blog.banner.nextSlide")}
      >
        <ChevronRight className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
      </button>
    </div>
  );
}

interface DotIndicatorsProps {
  slides: BannerSlide[];
  currentSlide: number;
  onSlideChange: (index: number) => void;
}

function DotIndicators({
  slides,
  currentSlide,
  onSlideChange,
}: DotIndicatorsProps): React.ReactElement {
  const t = useT();

  return (
    <div className="absolute bottom-8 left-4 z-20 flex gap-2 md:bottom-10 md:left-6 md:gap-3 lg:bottom-12 lg:left-12">
      {slides.map((slide, index) => {
        const isActive = index === currentSlide;
        return (
          <button
            key={slide.id}
            type="button"
            onClick={() => onSlideChange(index)}
            className="group relative overflow-hidden"
            aria-label={t("public.blog.banner.goToSlide", {
              index: index + 1,
            })}
          >
            <div
              className={`h-1 rounded-full transition-all md:h-1.5 ${
                isActive
                  ? "w-16 bg-ember-400 md:w-20"
                  : "w-6 bg-bone-400 group-hover:w-10 group-hover:bg-ink-50 md:w-8 md:group-hover:w-12"
              }`}
            >
              {/* Прогресс-бар для активного слайда */}
              {isActive && (
                <div
                  className="h-full origin-left rounded-full bg-ember-300"
                  style={{
                    animation: "slideProgress 5s linear",
                  }}
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function BlogBanner(): React.ReactElement {
  const {
    currentSlide,
    isAutoPlaying: _isAutoPlaying,
    nextSlide,
    prevSlide,
    goToSlide,
    pauseAutoPlay,
  } = useAutoSlider({
    totalSlides: SLIDES.length,
    interval: 5000,
    autoPlay: true,
  });

  const handlePrev = (): void => {
    prevSlide();
    pauseAutoPlay();
  };

  const handleNext = (): void => {
    nextSlide();
    pauseAutoPlay();
  };

  return (
    <section className="relative w-full overflow-hidden bg-linear-to-b from-white via-ember-50/30 to-white">
      {/* Дополнительный градиент для hero */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-ember-400/5 via-transparent to-white/80" />

      {/* Контейнер для слайдов - адаптивная высота для маленьких ноутбуков */}
      <div className="relative flex min-h-[75vh] w-full items-center py-16 md:min-h-[80vh] md:py-20 lg:min-h-[85vh] lg:py-24 xl:min-h-[88vh] xl:py-28">
        {SLIDES.map((slide, index) => (
          <Slide
            key={slide.id}
            slide={slide}
            isActive={index === currentSlide}
          />
        ))}
      </div>

      {/* Navigation Controls */}
      <Navigation
        currentSlide={currentSlide}
        totalSlides={SLIDES.length}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      {/* Dot Indicators */}
      <DotIndicators
        slides={SLIDES}
        currentSlide={currentSlide}
        onSlideChange={goToSlide}
      />

      {/* Pause Indicator - убран чтобы не перекрывал контент */}

      {/* CSS для анимации */}
      <style jsx>{`
        @keyframes slideProgress {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>
    </section>
  );
}
