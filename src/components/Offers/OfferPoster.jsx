import './OfferPoster.css';

export default function OfferPoster({ image, alt, className = '' }) {
  return <figure className={`offer-poster-frame ${className}`}>
    <img src={`/assets/offers/${image}.png`} alt={alt} loading="lazy" decoding="async" />
  </figure>;
}
