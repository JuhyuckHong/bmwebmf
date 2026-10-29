import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/AllSites.css";
import { ThumbnailStyle } from '../styled-components/allsites';
import { useGridNavigation, useKeyboardNavigation } from '../hooks';
import { useKeyboardContext } from '../context';
import {
    buildMonitorRows,
    computeExpectedShots,
    computeMissingPercent,
    computePlanShots,
    formatDeviceNumber,
    formatRecentPhoto,
    formatTime,
    getMissingBadgeClass,
    getSiteStatus,
    sortRowsBySeverity,
} from './siteMetrics';

// Status priority for sorting (lower = more urgent)
const STATUS_PRIORITY = {
    'need-solution': 0,
    'need-check': 1,
    'remote-issue': 2,
    'operational': 3,
    'not-operational-time': 4,
    '': 5,
};

function AllSites({
    admin,
    onSelectSite,
    sortType = 'status', // 'name' | 'device' | 'status'
    thumbnails = [],
    siteInformation = {},
    staticURLs = {},
}) {
    const navigate = useNavigate();
    const thumbnailsRef = useRef(null);
    const lastHeightRef = useRef(null);
    const dynamicHeightSetRef = useRef(false);
    const [imageLoadState, setImageLoadState] = useState({});
    const [displayedURLs, setDisplayedURLs] = useState({});
    const { pushModal } = useKeyboardContext();

    const handleThumbnailClick = (imageName) => {
        const safeName = encodeURIComponent(imageName);
        navigate(`/site/${safeName}`);
        if (onSelectSite) onSelectSite(imageName);
    };

    // Sorting state and function, useMemo for optimization
    const sortFunc = useCallback((a, b) => {
        if (sortType === 'name') {
            const nameA = a.site.toUpperCase();
            const nameB = b.site.toUpperCase();
            return nameA.localeCompare(nameB);
        } else if (sortType === 'device') {
            const nameA = siteInformation[a.site]?.device_number || "";
            const nameB = siteInformation[b.site]?.device_number || "";
            return nameA.localeCompare(nameB);
        } else {
            // Sort by status
            const infoA = siteInformation[a.site] || {};
            const infoB = siteInformation[b.site] || {};
            const percentA = computeMissingPercent(infoA);
            const percentB = computeMissingPercent(infoB);
            const statusA = getSiteStatus(infoA, percentA);
            const statusB = getSiteStatus(infoB, percentB);
            const priorityA = STATUS_PRIORITY[statusA] ?? 5;
            const priorityB = STATUS_PRIORITY[statusB] ?? 5;
            if (priorityA !== priorityB) return priorityA - priorityB;
            // Secondary sort by name for stability
            return a.site.toUpperCase().localeCompare(b.site.toUpperCase());
        }
    }, [sortType, siteInformation]);
    const sortedThumbnails = useMemo(() => {
        return [...thumbnails].sort(sortFunc);
    }, [thumbnails, sortFunc]);

    // 키보드 그리드 탐색
    const { focusedIndex } = useGridNavigation(sortedThumbnails, {
        enabled: true,
        gridContainerRef: thumbnailsRef,
        itemSelector: '.thumbnails-individual',
        onSelect: (thumbnail) => handleThumbnailClick(thumbnail.site),
    });

    // Monitor image show
    const [showMonitorLarge, setShowMonitorLarge] = useState(false);
    const handleMonitorClick = () => {
        setShowMonitorLarge(true);
        pushModal('monitor-large');
    };

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleCloseModal = (e) => {
            if (e.detail?.modalId === 'monitor-large') {
                setShowMonitorLarge(false);
            }
        };
        window.addEventListener('closeModal', handleCloseModal);
        return () => window.removeEventListener('closeModal', handleCloseModal);
    }, []);

    // M 키로 요약보기 토글 (admin만)
    useKeyboardNavigation({
        'm': () => admin && handleMonitorClick(),
        'M': () => admin && handleMonitorClick(),
    }, { enabled: admin && !showMonitorLarge });

    const monitorRows = useMemo(
        () => buildMonitorRows(sortedThumbnails, siteInformation),
        [sortedThumbnails, siteInformation],
    );
    const sortedMonitorRows = useMemo(
        () => sortRowsBySeverity(monitorRows),
        [monitorRows],
    );

    // Preload thumbnails and only swap the displayed URL after the new image is ready.
    useEffect(() => {
        if (!thumbnails.length) {
            setDisplayedURLs({});
            setImageLoadState({});
            return;
        }

        thumbnails.forEach((thumbnail) => {
            const siteKey = thumbnail.site;
            const nextURL = staticURLs[siteKey];
            if (!nextURL) return;

            const img = new Image();
            const applyReady = () => {
                setDisplayedURLs((prev) => {
                    if (prev[siteKey] === nextURL) return prev;
                    return { ...prev, [siteKey]: nextURL };
                });
                setImageLoadState((prev) => ({
                    ...prev,
                    [siteKey]: { loaded: true, url: nextURL },
                }));
            };

            img.onload = () => {
                if (img.decode) {
                    img.decode().then(applyReady).catch(applyReady);
                } else {
                    applyReady();
                }
            };
            img.onerror = () => {
                setImageLoadState((prev) => ({
                    ...prev,
                    [siteKey]: { loaded: false, url: nextURL },
                }));
            };
            img.src = nextURL;
        });
    }, [thumbnails, staticURLs]);

    // Keep summary card height in sync with thumbnail aspect ratio and width changes.
    useEffect(() => {
        if (!thumbnailsRef.current) return;
        const firstThumb =
            thumbnailsRef.current.querySelector(".thumbnails-individual");
        if (!firstThumb) return;

        const MIN_HEIGHT = 120;
        const applyHeight = (height) => {
            if (!Number.isFinite(height) || height < MIN_HEIGHT) return;
            const last = lastHeightRef.current;
            if (last && Math.abs(height - last) < 1) return;
            thumbnailsRef.current.style.setProperty(
                "--dynamic-card-height",
                `${height}px`,
            );
            lastHeightRef.current = height;
            dynamicHeightSetRef.current = true;
        };

        applyHeight(firstThumb.getBoundingClientRect().height);

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            applyHeight(entry.contentRect.height);
        });
        observer.observe(firstThumb);

        return () => observer.disconnect();
    }, [sortedThumbnails.length]);

    return (
        <>
            <div className="thumbnails" ref={thumbnailsRef}>
                {admin && (
                    <div
                        className="summary monitor-table-card"
                        role="button"
                        tabIndex={0}
                        onClick={handleMonitorClick}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleMonitorClick();
                        }}>
                        <button
                            type="button"
                            className="monitor-view-all-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMonitorLarge(true);
                            }}>
                            전체 현장 보기
                        </button>
                        <MonitorTable
                            rows={sortedMonitorRows}
                            compact
                        />
                    </div>
                )}
                {showMonitorLarge && (
                    <div
                        className="modal"
                        onClick={() => setShowMonitorLarge(false)}>
                        <div
                            className="monitor-modal-content"
                            onClick={(e) => e.stopPropagation()}>
                            <MonitorTable
                                rows={sortedMonitorRows}
                            />
                        </div>
                    </div>
                )}
                {sortedThumbnails.map((thumbnail, idx) => {
                    const siteInfo = siteInformation[thumbnail.site] || {};
                    const imageURL = staticURLs[thumbnail.site];
                    const displayURL =
                        displayedURLs[thumbnail.site] || imageURL;
                    const plannedShots =
                        computePlanShots(siteInfo) ??
                        (Number(siteInfo.shooting_count) ||
                            Number(siteInfo.shooting_count_till_now) ||
                            0);
                    const expectedByNow =
                        computeExpectedShots(siteInfo) ??
                        (Number(siteInfo.shooting_count_till_now) ||
                            plannedShots);
                    const uploaded = Number(siteInfo.photos_count) || 0;
                    const missingTotal = plannedShots
                        ? Math.max(plannedShots - uploaded, 0)
                        : 0;
                    const missingPercent =
                        plannedShots > 0
                            ? Math.round((missingTotal / plannedShots) * 100)
                            : 0;
                    const deviceNumber = formatDeviceNumber(
                        siteInfo.device_number,
                    );
                    const siteLabel = thumbnail.site.replaceAll("_", " ");
                    const remoteStatus = siteInfo.ssh;
                    const hasRemoteInfo =
                        remoteStatus !== undefined && remoteStatus !== null;
                    const isRemoteOn = Boolean(remoteStatus);
                    const remoteIndicatorClass = hasRemoteInfo
                        ? isRemoteOn
                            ? "on"
                            : "off"
                        : "unknown";
                    const remoteLabel = hasRemoteInfo
                        ? isRemoteOn
                            ? "원격 on"
                            : "원격 off"
                        : "원격 정보 없음";
                    const expectedWithGrace = Math.max(expectedByNow - 2, 0);
                    const missingAgainstGrace = Math.max(
                        expectedWithGrace - uploaded,
                        0,
                    );
                    const missingCountLabel = Number.isFinite(
                        missingAgainstGrace,
                    )
                        ? missingAgainstGrace
                        : "-";
                    const missingPercentGrace =
                        (expectedWithGrace || plannedShots) > 0
                            ? Math.round(
                                  (missingAgainstGrace /
                                      (expectedWithGrace || plannedShots)) *
                                      100,
                              )
                            : missingPercent;
                    const missingClass = getMissingBadgeClass(
                        missingPercentGrace,
                        expectedWithGrace || plannedShots,
                    );
                    const siteStatus = getSiteStatus(
                        siteInfo,
                        missingPercentGrace,
                    );
                    const isLoaded =
                        imageLoadState[thumbnail.site]?.loaded &&
                        imageLoadState[thumbnail.site]?.url === displayURL;

                    return (
                        <ThumbnailStyle
                            key={thumbnail.site}
                            className={`thumbnails-individual ${siteStatus}${focusedIndex === idx ? ' keyboard-focused' : ''}`}
                            tabIndex={focusedIndex === idx ? 0 : -1}>
                        <div
                            className={`thumb-wrapper ${isLoaded ? "loaded" : "loading"}`}>
                                <div
                                    className={`thumb-placeholder ${isLoaded ? "is-hidden" : ""}`}
                                    aria-hidden="true"
                                />
                                {displayURL && (
                                    <img
                                        src={displayURL}
                                        alt={thumbnail.site}
                                        loading="lazy"
                                        onLoad={() =>
                                            setImageLoadState((prev) => ({
                                                ...prev,
                                                [thumbnail.site]: {
                                                    loaded: true,
                                                    url: displayURL,
                                                },
                                            }))
                                        }
                                        onError={() =>
                                            setImageLoadState((prev) => ({
                                                ...prev,
                                                [thumbnail.site]: {
                                                    loaded: false,
                                                    url: displayURL,
                                                },
                                            }))
                                        }
                                        onClick={() =>
                                            handleThumbnailClick(thumbnail.site)
                                        }
                                    />
                                )}
                                <div className="overlay-top-row">
                                    <span className="overlay-site">
                                        {siteLabel}
                                    </span>
                                    <span className="overlay-device">
                                    #{deviceNumber || "--"}
                                    </span>
                                </div>
                                <div className="overlay-bottom">
                                    <div className="bottom-left">
                                        <div className="bottom-line">
                                            <span className="chip-text">
                                                {formatTime(siteInfo.time_start) ||
                                                    "--:--"}{" "}
                                                -{" "}
                                                {formatTime(siteInfo.time_end) ||
                                                    "--:--"}
                                            </span>
                                            <span className="chip-text">
                                                {siteInfo.time_interval
                                                    ? `${siteInfo.time_interval}분`
                                                    : "간격 정보 없음"}
                                            </span>
                                        </div>
                                        <div className="bottom-line">
                                            <span className="chip-text recent-text">
                                                {formatRecentPhoto(
                                                    siteInfo.recent_photo,
                                                ) || "최근 기록 없음"}
                                            </span>
                                            <span
                                                className={`chip-text chip-missing ${missingClass}`}>
                                                {uploaded} / {plannedShots || "-"}
                                            </span>
                                            <span
                                                className={`chip-text chip-missing ${missingClass}`}>
                                                누락 {missingCountLabel}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="remote-inline">
                                        <span
                                            className={`remote-dot ${remoteIndicatorClass}`}
                                            aria-label={remoteLabel}
                                            title={remoteLabel}
                                        />
                                    </div>
                                </div>
                            </div>

                        </ThumbnailStyle>
                    );
                })}
            </div>
        </>
    );
}

function MonitorTable({ rows, compact = false }) {
    const displayRows = rows;
    const mid = Math.ceil(displayRows.length / 2);
    const useTwoColumns = !compact && displayRows.length > 0;
    const columnRows = useTwoColumns
        ? [
              displayRows.slice(0, mid),
              displayRows.slice(mid),
          ].filter((col) => col.length > 0)
        : [displayRows];

    return (
        <div className={`monitor-table ${compact ? "compact" : ""}`}>
            <div className="monitor-table-wrapper">
                {displayRows.length === 0 ? (
                    <table>
                        <tbody>
                            <tr>
                                <td colSpan="8" className="monitor-empty">
                                    데이터가 없습니다
                                </td>
                            </tr>
                        </tbody>
                    </table>
                ) : (
                    <div className={`monitor-table-columns ${compact ? "single" : ""}`}>
                        {columnRows.map((col, idx) => (
                            <div className="monitor-table-section" key={idx}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>No</th>
                                            <th>현장 이름</th>
                                            <th>모듈정보</th>
                                            <th>최근사진</th>
                                            <th>촬영</th>
                                            <th>누락</th>
                                            <th>원격</th>
                                            <th>작동 시간/간격</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {col.map((row) => (
                                            <tr
                                                key={row.siteKey}
                                                className={row.statusClass}
                                                title={row.statusLabel}>
                                                <td>{row.index}</td>
                                                <td>{row.siteLabel}</td>
                                                <td>{row.device}</td>
                                                <td>{row.recent}</td>
                                                <td>{row.shots}</td>
                                                <td>{row.missing}</td>
                                                <td>
                                                    <span
                                                        className={"status-light " + row.remoteLightClass}
                                                        aria-label={row.remoteLabel}
                                                        title={row.remoteLabel}
                                                    />
                                                </td>
                                                <td>
                                                    {row.timeRange} / {row.intervalLabel}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AllSites;
