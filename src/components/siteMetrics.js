// 현장 촬영 현황 계산 (AllSites와 v2 화면이 같이 쓴다)

export const formatRecentPhoto = (photo) => {
    if (photo === "No Photo Available" || !photo) return photo;
    const [date, time] = photo.split("_");
    return `${date?.replaceAll("-", "/")} ${time
        ?.split(".")[0]
        .replaceAll("-", ":")}`;
};

export const formatTime = (time) => {
    if (!time) return "";
    return `${time.slice(0, 2)}:${time.slice(2)}`;
};

export const parseTimeToMinutes = (time) => {
    if (!time || time.length < 4) return null;
    const hours = parseInt(time.slice(0, 2), 10);
    const minutes = parseInt(time.slice(2), 10);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
};

export const formatDeviceNumber = (device) => {
    if (!device) return "";
    return parseInt(device.replace("bmotion", ""));
};

export const formatTimeRange = (siteInfo) => {
    const start = formatTime(siteInfo.time_start) || "--:--";
    const end = formatTime(siteInfo.time_end) || "--:--";
    return `${start}-${end}`;
};

export const getCurrentMinutes = () =>
    new Date().getHours() * 60 + new Date().getMinutes();

export const getSiteStatus = (siteInfo, missingPercent = 0) => {
    const startTime = parseTimeToMinutes(siteInfo.time_start);
    const endTime = parseTimeToMinutes(siteInfo.time_end);
    const nowMinutes = getCurrentMinutes();
    const hasTimeRange =
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        startTime !== endTime;
    let operational = true;
    if (hasTimeRange) {
        const overnight = endTime < startTime;
        if (overnight) {
            // 자정 통과: 시작~자정 또는 자정~종료 구간에 있으면 운영 중
            operational = nowMinutes >= startTime || nowMinutes <= endTime;
        } else {
            operational = nowMinutes >= startTime && nowMinutes <= endTime;
        }
    }
    const remote = siteInfo.ssh;

    if (!operational) return "not-operational-time";

    const isRecovering = checkIsRecovering(siteInfo);

    if (missingPercent > 20) {
        return isRecovering ? "need-check" : "need-solution";
    }

    if (missingPercent <= 5) {
        if (remote === true) return "operational";
        if (remote === false) {
             return isRecovering ? "need-check" : "remote-issue";
        }
        return "operational";
    }

    if (remote === true) return "need-check";
    if (remote === false) {
        return isRecovering ? "need-check" : "need-solution";
    }

    return "";
};

export const getMissingBadgeClass = (missingPercent, plannedShots) => {
    if (!plannedShots) return "missing-unknown";
    if (missingPercent < 10) return "missing-low";
    if (missingPercent <= 20) return "missing-mid";
    return "missing-high";
};

export const getStatusMeta = (missingPercent, remoteStatus, isRecovering) => {
    if (!Number.isFinite(missingPercent))
        return { label: "정보 없음", className: "status-gray" };
    
    if (missingPercent > 20) {
        if (isRecovering) return { label: "복구 중", className: "status-orange" };
        return { label: "누락 심각", className: "status-red" };
    }

    if (missingPercent <= 5 && remoteStatus === true)
        return { label: "정상", className: "status-green" };
    
    if (missingPercent <= 5 && remoteStatus === false) {
        if (isRecovering) return { label: "복구 중", className: "status-orange" };
        return { label: "원격 미연결", className: "status-green" }; // 원래 로직 유지 (누락 적으면 원격 꺼져도 초록/빨강? 기존엔 초록이었음. isRecovering이면 오렌지로?) 
        // 기존: if (missingPercent <= 5 && remoteStatus === false) return { label: "원격 미연결", className: "status-green" };
        // 사용자가 "빨간색 중에서"라고 했으므로, 기존 초록색인 경우는 건드리지 않음.
    }

    if (remoteStatus === true)
        return { label: "확인 필요", className: "status-orange" };
    
    if (remoteStatus === false) {
        if (isRecovering) return { label: "복구 중", className: "status-orange" };
        return { label: "원격 미연결", className: "status-red" };
    }

    return { label: "정보 없음", className: "status-gray" };
};

export const getRemoteMeta = (remoteStatus) => {
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

export const parseRecentPhotoDate = (photoStr) => {
    if (!photoStr || photoStr === "No Photo Available") return null;
    // Format: YYYY-MM-DD_HH-mm-ss...
    try {
        const [datePart, timePart] = photoStr.split("_");
        if (!datePart || !timePart) return null;
        const [y, m, d] = datePart.split("-").map(Number);
        const [h, min, s] = timePart.split(".")[0].split("-").map(Number);
        return new Date(y, m - 1, d, h, min, s);
    } catch (e) {
        return null;
    }
};

export const checkIsRecovering = (siteInfo) => {
    const photoDate = parseRecentPhotoDate(siteInfo.recent_photo);
    if (!photoDate) return false;

    const interval = Number(siteInfo.time_interval);
    if (!interval || interval <= 0) return false;

    const now = new Date();
    const diffMinutes = (now - photoDate) / (1000 * 60);

    // Recent photo is within 2 * interval
    return diffMinutes <= interval * 2;
};

export const computePlanShots = (siteInfo) => {
    const start = parseTimeToMinutes(siteInfo.time_start);
    const end = parseTimeToMinutes(siteInfo.time_end);
    const interval = Number(siteInfo.time_interval);
    if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        !Number.isFinite(interval) ||
        interval <= 0 ||
        start === end
    )
        return null;
    const adjustedEnd = end < start ? end + 1440 : end;
    const duration = adjustedEnd - start;
    return Math.max(Math.floor(duration / interval), 0);
};

export const computeExpectedShots = (siteInfo) => {
    const start = parseTimeToMinutes(siteInfo.time_start);
    const end = parseTimeToMinutes(siteInfo.time_end);
    const interval = Number(siteInfo.time_interval);
    const planned = computePlanShots(siteInfo);
    if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        !Number.isFinite(interval) ||
        interval <= 0 ||
        start === end ||
        !Number.isFinite(planned)
    )
        return null;

    const adjustedEnd = end < start ? end + 1440 : end;
    let nowMinutes = getCurrentMinutes();
    // 자정 통과 모듈: 현재 시각이 자정 이후(종료 시각 이전)라면 +1440 보정
    if (end < start && nowMinutes <= end) {
        nowMinutes += 1440;
    }

    if (nowMinutes <= start) return 0;

    const cutoff = Math.min(nowMinutes, adjustedEnd);
    const elapsed = cutoff - start;
    const expected = Math.floor(elapsed / interval);

    return Math.min(expected, planned);
};



export const computeMissingPercent = (siteInfo) => {
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
    const missingPercentRaw =
        plannedShots > 0
            ? Math.round((missingTotal / plannedShots) * 100)
            : 0;

    const expectedWithGrace = Math.max(expectedByNow - 2, 0);
    const missingAgainstGrace = Math.max(
        expectedWithGrace - uploaded,
        0,
    );

    return (expectedWithGrace || plannedShots) > 0
        ? Math.round(
                (missingAgainstGrace /
                    (expectedWithGrace || plannedShots)) *
                    100,
            )
        : missingPercentRaw;
};

// 썸네일 카드 한 장에 보여주는 수치를 한 번에 계산한다
export const computeSiteSummary = (siteInfo = {}) => {
    const plannedShots =
        computePlanShots(siteInfo) ??
        (Number(siteInfo.shooting_count) ||
            Number(siteInfo.shooting_count_till_now) ||
            0);
    const expectedByNow =
        computeExpectedShots(siteInfo) ??
        (Number(siteInfo.shooting_count_till_now) || plannedShots);
    const uploaded = Number(siteInfo.photos_count) || 0;
    const missingTotal = plannedShots ? Math.max(plannedShots - uploaded, 0) : 0;
    const missingPercent =
        plannedShots > 0 ? Math.round((missingTotal / plannedShots) * 100) : 0;
    const expectedWithGrace = Math.max(expectedByNow - 2, 0);
    const missingAgainstGrace = Math.max(expectedWithGrace - uploaded, 0);
    const missingPercentGrace =
        (expectedWithGrace || plannedShots) > 0
            ? Math.round((missingAgainstGrace / (expectedWithGrace || plannedShots)) * 100)
            : missingPercent;
    return {
        plannedShots,
        uploaded,
        missingCount: missingAgainstGrace,
        missingClass: getMissingBadgeClass(missingPercentGrace, expectedWithGrace || plannedShots),
        siteStatus: getSiteStatus(siteInfo, missingPercentGrace),
    };
};

// 요약표(전체 현장 표) 한 줄씩
export const buildMonitorRows = (thumbnails, siteInformation) =>
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
        const isRecovering = checkIsRecovering(siteInfo);
        const status = getStatusMeta(missingPercent, siteInfo.ssh, isRecovering);
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

export const sortRowsBySeverity = (rows) => {
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
