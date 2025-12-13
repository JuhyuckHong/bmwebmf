import "./VideoViewer.css";

function VideoViewer({ videoURL, loading = false, videoRef }) {
    return (
        <div className={`video-viewer ${loading ? "loading" : ""}`}>
            {loading ? (
                <div className="viewer-loading">
                    <div className="spinner" />
                    <span className="loading-text">영상 로딩 중...</span>
                </div>
            ) : videoURL ? (
                <video
                    ref={videoRef}
                    className="video-player"
                    controls
                    autoPlay
                    muted
                >
                    <source src={videoURL} type="video/mp4" />
                    브라우저가 비디오 태그를 지원하지 않습니다.
                </video>
            ) : (
                <div className="viewer-empty">
                    <span className="empty-icon">&#x1F3AC;</span>
                    <span className="empty-text">영상을 선택하세요</span>
                </div>
            )}
        </div>
    );
}

export default VideoViewer;
