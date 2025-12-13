import "./PhotoViewer.css";

function PhotoViewer({ imageURL, loading = false }) {
    return (
        <div className={`photo-viewer ${loading ? "loading" : ""}`}>
            {loading ? (
                <div className="viewer-loading">
                    <div className="spinner" />
                    <span className="loading-text">이미지 로딩 중...</span>
                </div>
            ) : imageURL ? (
                <img
                    src={imageURL}
                    alt="현장 사진"
                    className="photo-image"
                    loading="lazy"
                />
            ) : (
                <div className="viewer-empty">
                    <span className="empty-icon">&#x1F5BC;</span>
                    <span className="empty-text">이미지를 선택하세요</span>
                </div>
            )}
        </div>
    );
}

export default PhotoViewer;
