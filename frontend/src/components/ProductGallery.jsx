import { useCallback, useMemo, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Thumbs, Keyboard, Pagination, Zoom as SwiperZoom, A11y } from "swiper/modules";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/thumbs";
import "swiper/css/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/counter.css";
import ProductImage from "./ProductImage";

export default function ProductGallery({ slides = [], productName, badge, discount, limitation }) {
  const [index, setIndex] = useState(0);
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [lightbox, setLightbox] = useState(false);
  const mainRef = useRef(null);

  const items = useMemo(() => slides.filter((s) => s?.url), [slides]);
  const lightboxSlides = useMemo(
    () => items.map((s) => ({ src: s.url, alt: `${productName} — ${s.label}`, title: s.label })),
    [items, productName]
  );
  const galleryKey = items.map((i) => i.url).join("|");

  const syncMain = useCallback((i) => {
    const swiper = mainRef.current?.swiper;
    if (!swiper) return;
    if (swiper.params.loop) swiper.slideToLoop(i, 280);
    else swiper.slideTo(i, 280);
    setIndex(i);
  }, []);

  const onMainSlide = useCallback((swiper) => {
    setIndex(swiper.params.loop ? swiper.realIndex : swiper.activeIndex);
  }, []);

  if (!items.length) return null;

  const activeLabel = items[index]?.label || "View";
  const multi = items.length > 1;

  return (
    <section className="shoe-gallery" aria-label="Product images">
      <div className="shoe-gallery-sticky">
        <div className="shoe-gallery-main-wrap">
          {(badge || discount > 0) && (
            <div className="shoe-gallery-badges">
              {badge && <span className="shoe-product-badge">{badge}</span>}
              {discount > 0 && <span className="shoe-discount-badge">−{discount}%</span>}
            </div>
          )}
          <Swiper
            key={galleryKey}
            className="shoe-gallery-swiper"
            modules={[Navigation, Thumbs, Keyboard, Pagination, SwiperZoom, A11y]}
            onSwiper={(s) => {
              mainRef.current = { swiper: s };
            }}
            thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
            keyboard={{ enabled: true }}
            zoom={{ maxRatio: 2.75 }}
            pagination={multi ? { el: ".shoe-gallery-pagination", clickable: true } : false}
            onSlideChange={onMainSlide}
            loop={multi}
            spaceBetween={0}
            speed={340}
            a11y={{ prevSlideMessage: "Previous photograph", nextSlideMessage: "Next photograph" }}
          >
            {items.map((slide, i) => (
              <SwiperSlide key={`${slide.url}-${i}`}>
                <button
                  type="button"
                  className="shoe-gallery-slide-hit"
                  onClick={() => setLightbox(true)}
                  aria-label={`View ${slide.label} fullscreen`}
                >
                  <div className="swiper-zoom-container">
                    <ProductImage
                      src={slide.url}
                      alt={`${productName} — ${slide.label}`}
                      sizes="(max-width: 900px) 100vw, 50vw"
                      width="900"
                      height="900"
                      loading={i === 0 ? "eager" : "lazy"}
                      fetchPriority={i === 0 ? "high" : undefined}
                    />
                  </div>
                </button>
              </SwiperSlide>
            ))}
          </Swiper>

          <div className={`shoe-gallery-control-bar${multi ? "" : " is-single"}`}>
            <button
              type="button"
              className="shoe-gallery-bar-prev"
              aria-label="Previous image"
              disabled={!multi}
              onClick={() => mainRef.current?.swiper?.slidePrev()}
            >
              ‹
            </button>
            <div className="shoe-gallery-bar-meta">
              <span className="shoe-gallery-counter">
                {index + 1} / {items.length}
              </span>
              <span className="shoe-gallery-active-label">{activeLabel}</span>
            </div>
            <button
              type="button"
              className="shoe-gallery-bar-next"
              aria-label="Next image"
              disabled={!multi}
              onClick={() => mainRef.current?.swiper?.slideNext()}
            >
              ›
            </button>
          </div>
          {multi ? <div className="shoe-gallery-pagination" /> : null}
        </div>

        {multi && (
          <>
            <Swiper
              className="shoe-gallery-thumbs"
              onSwiper={setThumbsSwiper}
              modules={[Thumbs]}
              watchSlidesProgress
              slidesPerView="auto"
              spaceBetween={10}
              breakpoints={{
                0: { slidesPerView: 4.3 },
                640: { slidesPerView: 5.2 },
                1024: { slidesPerView: "auto" },
              }}
            >
              {items.map((slide, i) => (
                <SwiperSlide key={`thumb-${slide.url}-${i}`} className={index === i ? "is-active" : ""}>
                  <button type="button" className="shoe-thumb-btn" onClick={() => syncMain(i)} aria-label={slide.label} aria-current={index === i}>
                    <ProductImage src={slide.url} alt="" width="96" height="96" loading="lazy" />
                    <span className="shoe-thumb-caption">{slide.label}</span>
                  </button>
                </SwiperSlide>
              ))}
            </Swiper>
            <ul className="shoe-gallery-hints" aria-label="Gallery features">
              <li>⌕ Zoom</li>
              <li>⤢ Fullscreen</li>
              <li>⇄ Swipe</li>
            </ul>
          </>
        )}

        {limitation?.message && (
          <p className="shoe-gallery-limit" role="status">
            {limitation.message}
          </p>
        )}
      </div>

      <Lightbox
        open={lightbox}
        close={() => setLightbox(false)}
        index={index}
        slides={lightboxSlides}
        plugins={[Zoom, Thumbnails, Counter]}
        zoom={{ scrollToZoom: true, maxZoomPixelRatio: 3, pinchToZoom: true }}
        thumbnails={{ border: 2, gap: 8, vignette: false, width: 72, height: 72 }}
        counter={{ container: { style: { top: "unset", bottom: 48 } } }}
        carousel={{ finite: items.length <= 1, padding: 16, spacing: 0, imageFit: "contain" }}
        controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
        animation={{ fade: 240 }}
        on={{
          view: ({ index: i }) => {
            setIndex(i);
            syncMain(i);
          },
        }}
        styles={{
          root: { "--yarl__color_backdrop": "rgba(0, 0, 0, 0.92)", "--yarl__color_button": "#b4ff24" },
        }}
      />
    </section>
  );
}