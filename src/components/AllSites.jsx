import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/AllSites.css";
import { ThumbnailStyle } from '../styled-components/allsites';

function AllSites({
    admin,
    onSelectSite,
    sortByName = true,
    thumbnails = [],
    siteInformation = {},
    staticURLs = {},
}) {
    const navigate = useNavigate();
    const thumbnailsRef = useRef(null);

    const handleThumbnailClick = (imageName) => {
        const safeName = encodeURIComponent(imageName);
        navigate(`/site/${safeName}`);
        if (onSelectSite) onSelectSite(imageName);
    };

    // Sorting state and function, useMemo for optimization
    const sorting = sortByName;
    const sortFunc = useCallback((a, b) => {
        if (sorting) {
            const nameA = a.site.toUpperCase();
            const nameB = b.site.toUpperCase();
            return nameA.localeCompare(nameB);
        } else {
            const nameA = siteInformation[a.site]?.device_number || "";
            const nameB = siteInformation[b.site]?.device_number || "";
            return nameA.localeCompare(nameB);
        }
    }, [sorting, siteInformation]);
    const sortedThumbnails = useMemo(() => {
        return [...thumbnails].sort(sortFunc);
    }, [thumbnails, sortFunc]);

    // Monitor image show
    const [showMonitorLarge, setShowMonitorLarge] = useState(false);
    const handleMonitorClick = () => setShowMonitorLarge(true);

    const monitorRows = useMemo(
        () => buildMonitorRows(sortedThumbnails, siteInformation),
        [sortedThumbnails, siteInformation],
    );
    const sortedMonitorRows = useMemo(
        () => sortRowsBySeverity(monitorRows),
        [monitorRows],
    );

    useEffect(() => {
        if (!thumbnailsRef.current) return;
        const firstThumb =
            thumbnailsRef.current.querySelector(".thumbnails-individual");
        if (!firstThumb) return;

        const setHeight = (height) =>
            thumbnailsRef.current?.style.setProperty(
                "--dynamic-card-height",
                `${height}px`,
            );

        const measured = firstThumb.getBoundingClientRect().height;
        if (measured) setHeight(measured);

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            setHeight(entry.contentRect.height);
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
                {sortedThumbnails.map((thumbnail) => {
                    const siteInfo = siteInformation[thumbnail.site] || {};
                    const imageURL = staticURLs[thumbnail.site];
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
                        missingAgainstGrace,
                    );

                    return (
                        <ThumbnailStyle
                            key={thumbnail.site}
                            className={`thumbnails-individual ${siteStatus}`}>
                            <div className="thumb-wrapper">
                                {imageURL && (
                                    <img
                                        src={imageURL}
                                        alt={thumbnail.site}
                                        loading="lazy"
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
                                            <span className="chip-divider">|</span>
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
                                            <span className="chip-divider">|</span>
                                            <span
                                                className={`chip-text chip-missing ${missingClass}`}>
                                                {uploaded} / {plannedShots || "-"}
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

const formatRecentPhoto = (photo) => {
    if (photo === "No Photo Available" || !photo) return photo;
    const [date, time] = photo.split("_");
    return `${date?.replaceAll("-", "/")} ${time
        ?.split(".")[0]
        .replaceAll("-", ":")}`;
};

const formatTime = (time) => {
    if (!time) return "";
    return `${time.slice(0, 2)}:${time.slice(2)}`;
};

const parseTimeToMinutes = (time) => {
    if (!time || time.length < 4) return null;
    const hours = parseInt(time.slice(0, 2), 10);
    const minutes = parseInt(time.slice(2), 10);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
};

const formatDeviceNumber = (device) => {
    if (!device) return "";
    return parseInt(device.replace("bmotion", ""));
};

const formatTimeRange = (siteInfo) => {
    const start = formatTime(siteInfo.time_start) || "--:--";
    const end = formatTime(siteInfo.time_end) || "--:--";
    return `${start}-${end}`;
};

const getCurrentMinutes = () =>
    new Date().getHours() * 60 + new Date().getMinutes();

const getSiteStatus = (siteInfo, missingAgainstGrace = 0) => {
    const startTime = parseTimeToMinutes(siteInfo.time_start);
    const endTime = parseTimeToMinutes(siteInfo.time_end);
    const nowMinutes = getCurrentMinutes();
    const hasTimeRange =
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        endTime > startTime;
    const operational = hasTimeRange
        ? nowMinutes >= startTime && nowMinutes <= endTime
        : true;
    const remote = siteInfo.ssh;

    if (!operational) return "not-operational-time";
    if (missingAgainstGrace >= 5 && !remote) return "need-solution";
    if (missingAgainstGrace >= 5 && remote) return "need-check";
    if (missingAgainstGrace < 5 && !remote) return "remote-issue";
    if (missingAgainstGrace < 5 && remote) return "operational";

    return "";
};

const getMissingBadgeClass = (missingPercent, plannedShots) => {
    if (!plannedShots) return "missing-unknown";
    if (missingPercent < 10) return "missing-low";
    if (missingPercent <= 20) return "missing-mid";
    return "missing-high";
};

const getStatusMeta = (missingPercent, remoteStatus) => {
    if (!Number.isFinite(missingPercent))
        return { label: "정보 없음", className: "status-gray" };
    if (missingPercent > 20)
        return { label: "누락 심각", className: "status-red" };
    if (missingPercent <= 5 && remoteStatus === true)
        return { label: "정상", className: "status-green" };
    if (missingPercent <= 5 && remoteStatus === false)
        return { label: "원격 미연결", className: "status-orange" };
    if (remoteStatus === true)
        return { label: "확인 필요", className: "status-orange" };
    if (remoteStatus === false)
        return { label: "원격 미연결", className: "status-red" };
    return { label: "정보 없음", className: "status-gray" };
};

const getRemoteMeta = (remoteStatus) => {
    if (remoteStatus === true)
        return {
            label: "원격 연결",
            className: "remote-on",
            lightClass: "status-green",
        };
    if (remoteStatus === false)
        return {
            label: "원격 미연결",
            className: "remote-off",
            lightClass: "status-unplugged",
        };
    return {
        label: "원격 정보 없음",
        className: "remote-unknown",
        lightClass: "status-gray",
    };
};

const computePlanShots = (siteInfo) => {
    const start = parseTimeToMinutes(siteInfo.time_start);
    const end = parseTimeToMinutes(siteInfo.time_end);
    const interval = Number(siteInfo.time_interval);
    if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        !Number.isFinite(interval) ||
        interval <= 0 ||
        end <= start
    )
        return null;
    const duration = end - start;
    return Math.max(Math.floor(duration / interval), 0);
};

const computeExpectedShots = (siteInfo) => {
    const start = parseTimeToMinutes(siteInfo.time_start);
    const end = parseTimeToMinutes(siteInfo.time_end);
    const interval = Number(siteInfo.time_interval);
    const planned = computePlanShots(siteInfo);
    if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        !Number.isFinite(interval) ||
        interval <= 0 ||
        end <= start ||
        !Number.isFinite(planned)
    )
        return null;

    const nowMinutes = getCurrentMinutes();

    if (nowMinutes <= start) return 0;

    const cutoff = Math.min(nowMinutes, end);
    const elapsed = cutoff - start;
    const expected = Math.floor(elapsed / interval);

    return Math.min(expected, planned);
};

const buildMonitorRows = (thumbnails, siteInformation) =>
    thumbnails.map((thumbnail, idx) => {
        const siteInfo = siteInformation[thumbnail.site] || {};
        const siteLabel = thumbnail.site.replaceAll("_", " ");
        const expectedShots = computeExpectedShots(siteInfo);
        const uploadedRaw = Number(siteInfo.photos_count);
        const uploaded = Number.isFinite(uploadedRaw) ? uploadedRaw : 0;
        const missingRaw =
            Number.isFinite(expectedShots) && expectedShots > 0
                ? Math.max(expectedShots - uploaded, 0)
                : "-";
        const missing =
            missingRaw === "-"
                ? "-"
                : Math.max(missingRaw - 2, 0); // 초기 2장은 업로드 지연 가능성이 있어 제외
        const missingPercent =
            Number.isFinite(expectedShots) && expectedShots > 0
                ? (missing / expectedShots) * 100
                : null;
        const status = getStatusMeta(missingPercent, siteInfo.ssh);
        const remote = getRemoteMeta(siteInfo.ssh);
        const intervalLabel = siteInfo.time_interval
            ? `${siteInfo.time_interval}분`
            : "--분";

        return {
            index: idx + 1,
            siteKey: thumbnail.site,
            siteLabel,
            device: formatDeviceNumber(siteInfo.device_number) || "--",
            recent: formatRecentPhoto(siteInfo.recent_photo) || "No File",
            shots:
                uploaded || uploaded === 0
                    ? uploaded
                    : "-",
            missing,
            statusLabel: status.label,
            statusClass: status.className,
            remoteLabel: remote.label,
            remoteClass: remote.className,
            remoteLightClass: remote.lightClass,
            timeRange: formatTimeRange(siteInfo),
            intervalLabel,
        };
    });

const sortRowsBySeverity = (rows) => {
    const order = {
        "status-red": 0,
        "status-orange": 1,
        "status-green": 2,
        "status-gray": 3,
    };
    return [...rows].sort((a, b) => {
        const oa = order[a.statusClass] ?? 4;
        const ob = order[b.statusClass] ?? 4;
        if (oa !== ob) return oa - ob;
        return a.index - b.index;
    });
};

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
                                            <th>모듈</th>
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
                                                <td className="site-name">{row.siteLabel}</td>
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
