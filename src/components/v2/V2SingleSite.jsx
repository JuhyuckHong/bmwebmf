import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Cookies from "js-cookie";
import { API } from "../../API";
import V2Header from "./V2Header";
import { usePhotoData, useVideoData } from "../SingleSite/hooks/useMediaData";
import { computeSiteSummary, formatDeviceNumber, formatTime } from "../siteMetrics";
import { STATUS_META, formatAgo, formatDateLabel, formatPhotoClock, readStored, writeStored } from "./v2Utils";
import "./v2.css";

const SWIPE_MIN_PX = 50;

// 좌우로 밀면 이전/다음 사진
function useSwipe(onSwipe) {
    const start = useRef(null);
    return {
        onTouchStart: (e) => {
            const t = e.touches[0];
            start.current = { x: t.clientX, y: t.clientY };
        },
        onTouchEnd: (e) => {
            if (!start.current || e.touches.length > 0) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - start.current.x;
            const dy = t.clientY - start.current.y;
            start.current = null;
            if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
        },
    };
}

function Stepper({ label, onPrev, onNext, prevDisabled, nextDisabled, children }) {
    return (
        <div className="v2-stepper">
            <button type="button" className="v2-step-btn" onClick={onPrev} disabled={prevDisabled} aria-label={`이전 ${label}`}>‹</button>
            <div className="v2-step-body">{children}</div>
            <button type="button" className="v2-step-btn" onClick={onNext} disabled={nextDisabled} aria-label={`다음 ${label}`}>›</button>
        </div>
    );
}

function PhotoPanel({ site }) {
    const photo = usePhotoData(site);
    const [fullscreen, setFullscreen] = useState(false);
    const swipe = useSwipe(photo.handleTimeNav);
    const { dates, times, selectedDateIndex: dateIdx, selectedTimeIndex: timeIdx } = photo;
    const currentTime = times[timeIdx];
    const isLatest = dates.length > 0 && dateIdx === dates.length - 1 && timeIdx === times.length - 1;

    const goLatest = () => {
        photo.handleDateChange(dates.length - 1);
        photo.handleTimeChange(times.length - 1);
    };

    return (
        <section className="v2-panel">
            <div className="v2-media" {...swipe} onClick={() => photo.mediaURL && setFullscreen(true)}>
                {photo.mediaURL && <img src={photo.mediaURL} alt={currentTime ?? ""} />}
                {!photo.mediaURL && !photo.loading && <span className="v2-media-empty">사진이 없습니다</span>}
                {photo.loading && <span className="v2-spinner" aria-label="불러오는 중" />}
                {currentTime && <span className="v2-media-badge">{formatPhotoClock(currentTime)}</span>}
            </div>

            <Stepper
                label="날짜"
                onPrev={() => photo.handleDateNav(-1)}
                onNext={() => photo.handleDateNav(1)}
                prevDisabled={dateIdx <= 0}
                nextDisabled={dateIdx >= dates.length - 1}
            >
                <select className="v2-select" value={dateIdx} onChange={(e) => photo.handleDateChange(e.target.value)}
                    disabled={!dates.length}>
                    {dates.map((d, i) => <option key={d} value={i}>{formatDateLabel(d)}</option>)}
                </select>
            </Stepper>

            <Stepper
                label="사진"
                onPrev={() => photo.handleTimeNav(-1)}
                onNext={() => photo.handleTimeNav(1)}
                prevDisabled={timeIdx <= 0}
                nextDisabled={timeIdx >= times.length - 1}
            >
                <div className="v2-slider">
                    <input
                        type="range"
                        min={0}
                        max={Math.max(times.length - 1, 0)}
                        value={Math.min(timeIdx, Math.max(times.length - 1, 0))}
                        onChange={(e) => photo.handleTimeChange(e.target.value)}
                        disabled={times.length < 2}
                        aria-label="사진 시각"
                    />
                    <span className="v2-slider-label">
                        {formatPhotoClock(currentTime) || "--:--"}
                        <span className="v2-muted"> · {times.length ? `${timeIdx + 1}/${times.length}` : "0장"}</span>
                    </span>
                </div>
            </Stepper>

            <div className="v2-actions">
                <button type="button" className="v2-btn" onClick={goLatest} disabled={isLatest || !dates.length}>최신 사진</button>
                {photo.mediaURL && (
                    <a className="v2-btn" href={photo.mediaURL} download={currentTime ?? "photo.jpg"}>저장</a>
                )}
            </div>
            <p className="v2-hint">사진을 좌우로 밀면 이전·다음 사진, 누르면 크게 봅니다.</p>

            {fullscreen && (
                <div className="v2-fullscreen" onClick={() => setFullscreen(false)} {...swipe}>
                    <img src={photo.mediaURL} alt={currentTime ?? ""} />
                    <span className="v2-fullscreen-label">
                        {formatDateLabel(dates[dateIdx])} {formatPhotoClock(currentTime)}
                    </span>
                    <button type="button" className="v2-fullscreen-close" aria-label="닫기">✕</button>
                </div>
            )}
        </section>
    );
}

function VideoPanel({ site }) {
    const video = useVideoData(site);
    const { dates, selectedDateIndex: idx } = video;

    return (
        <section className="v2-panel">
            <div className="v2-media video">
                {video.mediaURL && (
                    <video ref={video.videoRef} src={video.mediaURL} controls playsInline preload="metadata" />
                )}
                {!video.mediaURL && !video.loading && <span className="v2-media-empty">영상이 없습니다</span>}
                {video.loading && <span className="v2-spinner" aria-label="불러오는 중" />}
            </div>
            <Stepper
                label="날짜"
                onPrev={() => video.handleDateNav(-1)}
                onNext={() => video.handleDateNav(1)}
                prevDisabled={idx <= 0}
                nextDisabled={idx >= dates.length - 1}
            >
                <select className="v2-select" value={idx} onChange={(e) => video.handleDateChange(e.target.value)}
                    disabled={!dates.length}>
                    {dates.map((d, i) => <option key={d} value={i}>{formatDateLabel(d)}</option>)}
                </select>
            </Stepper>
            {video.mediaURL && (
                <div className="v2-actions">
                    <a className="v2-btn" href={video.mediaURL} download={dates[idx] ?? "video.mp4"}>저장</a>
                </div>
            )}
        </section>
    );
}

export default function V2SingleSite({ authSites, admin, setAuth }) {
    const navigate = useNavigate();
    const { siteId: site } = useParams();
    const [tab, setTab] = useState(() => readStored("bm-v2-tab", "photo"));
    const [info, setInfo] = useState(null);

    useEffect(() => {
        if (authSites && !authSites.includes(site)) navigate("/v2/all", { replace: true });
    }, [authSites, site, navigate]);

    useEffect(() => {
        let cancelled = false;
        setInfo(null);
        API.getInformation({ Authorization: Cookies.get("BM") }, site)
            .then((res) => { if (!cancelled) setInfo(res.data ?? {}); })
            .catch(() => { if (!cancelled) setInfo({}); });
        return () => { cancelled = true; };
    }, [site]);

    if (!authSites || !authSites.includes(site)) return null;

    const index = authSites.indexOf(site);
    const prevSite = authSites[index - 1];
    const nextSite = authSites[index + 1];
    const goSite = (target) => navigate(`/v2/site/${encodeURIComponent(target)}`, { replace: true });
    const changeTab = (key) => {
        setTab(key);
        writeStored("bm-v2-tab", key);
    };

    const summary = info ? computeSiteSummary(info) : null;
    const meta = summary ? STATUS_META[summary.siteStatus] ?? STATUS_META[""] : null;
    const device = info ? formatDeviceNumber(info.device_number) : "";

    return (
        <div className="v2">
            <V2Header
                title={site.replaceAll("_", " ")}
                subtitle={`${index + 1} / ${authSites.length}${device ? ` · 모듈 #${device}` : ""}`}
                onBack={() => navigate("/v2/all")}
                admin={admin}
                setAuth={setAuth}
                legacyPath={`/site/${encodeURIComponent(site)}`}
            >
                <div className="v2-segment wide" role="tablist">
                    <button type="button" role="tab" aria-selected={tab === "photo"} className={tab === "photo" ? "active" : ""}
                        onClick={() => changeTab("photo")}>사진</button>
                    <button type="button" role="tab" aria-selected={tab === "video"} className={tab === "video" ? "active" : ""}
                        onClick={() => changeTab("video")}>타임랩스 영상</button>
                </div>
            </V2Header>

            <main className="v2-content narrow">
                {summary && (
                    <div className="v2-info">
                        <span className={`v2-status ${meta.tone}`}>{meta.label}</span>
                        <span>최근 {formatAgo(info.recent_photo)}</span>
                        <span>
                            {formatTime(info.time_start) || "--:--"}~{formatTime(info.time_end) || "--:--"}
                            {info.time_interval ? ` · ${info.time_interval}분` : ""}
                        </span>
                        <span className={`v2-count ${summary.missingClass}`}>
                            오늘 {summary.uploaded} / {summary.plannedShots || "-"}장 · 누락 {summary.missingCount}
                        </span>
                    </div>
                )}

                {tab === "photo" ? <PhotoPanel key={site} site={site} /> : <VideoPanel key={site} site={site} />}

                <nav className="v2-site-nav">
                    <button type="button" className="v2-btn" disabled={!prevSite} onClick={() => goSite(prevSite)}>
                        ‹ {prevSite ? prevSite.replaceAll("_", " ") : "처음"}
                    </button>
                    <button type="button" className="v2-btn" disabled={!nextSite} onClick={() => goSite(nextSite)}>
                        {nextSite ? nextSite.replaceAll("_", " ") : "마지막"} ›
                    </button>
                </nav>
            </main>
        </div>
    );
}
