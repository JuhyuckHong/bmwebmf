import "./MediaCard.css";

function MediaCard({ title, type, children, loading = false }) {
    return (
        <div className={`media-card ${type} ${loading ? "loading" : ""}`}>
            <div className="media-card-header">
                <h3 className="media-card-title">
                    <span className={`card-icon icon-${type}`} aria-hidden="true" />
                    {title}
                </h3>
            </div>
            <div className="media-card-body">
                {children}
            </div>
        </div>
    );
}

export default MediaCard;
