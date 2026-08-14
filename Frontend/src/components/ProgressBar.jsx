import "./ProgressBar.css";

function ProgressBar({ value = 0, label }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="ui-progress">
      {label && (
        <div className="ui-progress-label">
          <span>{label}</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div className="ui-progress-track">
        <div className="ui-progress-fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export default ProgressBar;