import "./Card.css";

function Card({ title, children, className = "" }) {
  return (
    <div className={`ui-card ${className}`}>
      {title && <h3 className="ui-card-title">{title}</h3>}
      <div className="ui-card-body">{children}</div>
    </div>
  );
}

export default Card;