// v2 화면 공통 표시 규칙

// getSiteStatus 결과 → 표시 이름·색·필터 묶음 (priority는 AllSites 상태순 정렬과 같다)
export const STATUS_META = {
    "need-solution": { label: "조치 필요", tone: "red", group: "issue", priority: 0 },
    "need-check": { label: "확인 필요", tone: "orange", group: "issue", priority: 1 },
    "remote-issue": { label: "원격 끊김", tone: "green", group: "ok", priority: 2 },
    operational: { label: "정상", tone: "green", group: "ok", priority: 3 },
    "not-operational-time": { label: "촬영 시간 외", tone: "gray", group: "off", priority: 4 },
    "": { label: "정보 없음", tone: "gray", group: "ok", priority: 5 },
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// "YYYY-MM-DD_HH-mm-ss(.jpg)" → Date
export const parsePhotoTime = (name) => {
    const match = name && String(name).match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})(?:-(\d{2}))?/);
    if (!match) return null;
    const [, y, mo, d, h, mi, s] = match;
    return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s || 0));
};

// 최근 사진 시각을 "12분 전" 형태로
export const formatAgo = (photoName, now = new Date()) => {
    const date = parsePhotoTime(photoName);
    if (!date) return "기록 없음";
    const minutes = Math.floor((now - date) / 60000);
    if (minutes < 1) return "방금";
    if (minutes < 60) return `${minutes}분 전`;
    if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간 전`;
    return `${Math.floor(minutes / (24 * 60))}일 전`;
};

// "...YYYY-MM-DD..." → "10/29 (목)"; 연도가 올해가 아니면 연도도 붙인다
export const formatDateLabel = (value, now = new Date()) => {
    const match = value && String(value).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return value ?? "";
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    const prefix = Number(y) === now.getFullYear() ? "" : `${y}/`;
    return `${prefix}${m}/${d} (${WEEKDAYS[date.getDay()]})`;
};

// "YYYY-MM-DD_HH-mm-ss.jpg" → "HH:mm"
export const formatPhotoClock = (name) => {
    const match = name && String(name).match(/_(\d{2})-(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : "";
};

export const readStored = (key, fallback) => {
    try {
        return localStorage.getItem(key) ?? fallback;
    } catch {
        return fallback;
    }
};

export const writeStored = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        // storage blocked: the choice just is not remembered
    }
};
