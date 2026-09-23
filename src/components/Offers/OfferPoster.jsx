import './OfferPoster.css';

export default function OfferPoster({ image, imageUrl, alt, className = '' }) {
  if (!image && !imageUrl) return null;
  return <figure className={`offer-poster-frame ${className}`}>
    <img src={imageUrl || `/assets/offers/${image}.png`} alt={alt} loading="lazy" decoding="async" />
  </figure>;
}
