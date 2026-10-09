import './LoadingIndicator.css';

export default function LoadingIndicator({ size = 'inline', label = 'กำลังโหลด', tone = 'blue' }) {
  return (
    <span className={`loading-hole loading-hole--${size} loading-hole--${tone}`} role="status" aria-label={label}>
      <span className="loading-hole__rings" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => <i key={index} style={{ '--ring-delay': `${(index - 10) * 0.3}s` }} />)}
      </span>
    </span>
  );
}
