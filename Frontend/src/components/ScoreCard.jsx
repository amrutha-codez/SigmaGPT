import "./ScoreCard.css";

function ScoreCard({ label, score }) {
  return (
    <div className="ui-score-card">
      <div className="ui-score-value">{score}%</div>
      <div className="ui-score-label">{label}</div>
    </div>
  );
}

export default ScoreCard;