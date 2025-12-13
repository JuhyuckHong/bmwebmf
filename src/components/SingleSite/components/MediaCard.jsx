import "./MediaCard.css";

function MediaCard({ title, type, children, loading = false, headerInfo }) {
    return (
        <div className={`media-card ${type} ${loading ? "loading" : ""}`}>
            <div className="media-card-header">
                <h3 className="media-card-title">
                    <span className={`card-icon icon-${type}`} aria-hidden="true" />
                    {title}
                </h3>
                {headerInfo && <span className="media-card-info">{headerInfo}</span>}
            </div>
            <div className="media-card-body">
                {children}
            </div>
        </div>
    );
}

export default MediaCard;
