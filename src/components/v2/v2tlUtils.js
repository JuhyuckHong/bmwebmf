// v2 타임라인 계산 (기존 TimelinePage와 같은 규칙: 현재 구간 7일 페이드, 15일 넘게 끊긴 뒤 재확인이면 재시작으로 본다)

export const FRESHNESS_FADE_DAYS = 7;
export const RESTART_GAP_DAYS = 15;
const DAY_MS = 1000 * 60 * 60 * 24;

export const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

export const today = () => fmt(new Date());

export const addDays = (dateStr, days) => {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    return fmt(d);
};

export const subtractDays = (dateStr, days) => addDays(dateStr, -days);

export const buildDateRange = (from, to) => {
    const dates = [];
    if (!from || !to) return dates;
    const cur = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    while (cur <= end) {
        dates.push(fmt(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
};

export const trimModuleId = (id) => {
    const n = Number(id);
    return Number.isNaN(n) ? String(id ?? "") : String(n);
};

const parseDateOnly = (value) => {
    if (!value) return null;
    const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const parseDateTime = (value) => {
    if (!value) return null;
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const diffDays = (later, earlier) => {
    if (!later || !earlier) return null;
    return Math.floor((later.getTime() - earlier.getTime()) / DAY_MS);
};

// 양 끝 포함 일수
export const spanDays = (from, to) => {
    const a = parseDateOnly(from);
    const b = parseDateOnly(to);
    if (!a || !b) return 0;
    return Math.round((b - a) / DAY_MS) + 1;
};

// 기본 범위: 지난달 1일 ~ 오늘
export const getDefaultRange = (now = new Date()) => {
    const from = new Date(now);
    from.setDate(1);
    from.setMonth(from.getMonth() - 1);
    return { from: fmt(from), to: fmt(now) };
};

// 오늘부터 n개월 전 같은 날
export const monthsAgo = (months, now = new Date()) => {
    const d = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
    return fmt(d);
};

export const getFreshnessText = (lastVerifiedAt, now = new Date()) => {
    if (!lastVerifiedAt) return "확인 시각 정보 없음";
    const verifiedAt = parseDateTime(lastVerifiedAt);
    if (!verifiedAt) return `마지막 확인 ${lastVerifiedAt}`;
    const staleDays = Math.max(diffDays(now, verifiedAt), 0);
    return `마지막 확인 ${lastVerifiedAt} (${staleDays === 0 ? "오늘" : `${staleDays}일 전`})`;
};

// 마지막 확인일 이후 7일 동안 1 → 0으로 옅어진다
export const getOpacityForDate = (dateStr, lastVerifiedAt) => {
    if (!lastVerifiedAt) return 0;
    const verifiedAt = parseDateTime(lastVerifiedAt);
    const cellDate = parseDateOnly(dateStr);
    if (!verifiedAt || !cellDate) return 0;
    const verifiedDate = fmt(verifiedAt);
    if (dateStr < verifiedDate) return 1;
    const staleDays = Math.max(diffDays(cellDate, parseDateOnly(verifiedDate)), 0);
    return Math.max(1 - Math.min(staleDays / FRESHNESS_FADE_DAYS, 1), 0);
};

export const getDisplaySegment = (seg, rowLastVerifiedAt, isLatestOperating, now = new Date()) => {
    const lastVerifiedAt = seg.last_verified_at ?? rowLastVerifiedAt ?? null;
    const displaySeg = {
        ...seg,
        visualStartDate: seg.start_date,
        visualEndDate: seg.end_date,
        freshnessText: getFreshnessText(lastVerifiedAt, now),
        lastVerifiedAt,
        isCurrent: false,
    };
    if (!isLatestOperating || !lastVerifiedAt) return displaySeg;

    displaySeg.isCurrent = true;
    const verifiedAt = parseDateTime(lastVerifiedAt);
    const gapDays = diffDays(verifiedAt, parseDateOnly(seg.end_date));
    if (gapDays !== null && gapDays > RESTART_GAP_DAYS) {
        displaySeg.visualStartDate = fmt(verifiedAt);
    }
    if (verifiedAt) {
        const fadeEndDate = addDays(fmt(verifiedAt), FRESHNESS_FADE_DAYS);
        if (displaySeg.visualEndDate > fadeEndDate) {
            displaySeg.visualEndDate = fadeEndDate;
        }
    }
    return displaySeg;
};

const segKey = (seg) => `${seg.start_date}|${seg.end_date}|${seg.module_id}|${seg.site_name}`;

// "이전" 불러오기 결과를 합친다 (경계에 걸쳐 두 번 온 구간은 한 번만)
export const mergeRows = (prev, more) => {
    const merged = new Map();
    for (const row of prev) {
        merged.set(row.key, { ...row, segments: [...(row.segments || [])] });
    }
    for (const row of more) {
        const existing = merged.get(row.key);
        if (!existing) {
            merged.set(row.key, { ...row, segments: [...(row.segments || [])] });
            continue;
        }
        const seen = new Set(existing.segments.map(segKey));
        const added = (row.segments || []).filter((seg) => !seen.has(segKey(seg)));
        existing.segments = [...added, ...existing.segments];
        existing.last_verified_at = existing.last_verified_at ?? row.last_verified_at ?? null;
    }
    return Array.from(merged.values());
};

const pct = (index, total) => (total > 0 ? (index / total) * 100 : 0);

// API rows → 화면용 행. 막대 위치는 범위 대비 % (left/width)
export const buildTimelineRows = (rows, { axis, dateFrom, dateTo, now = new Date() }) => {
    const total = spanDays(dateFrom, dateTo);
    if (!rows?.length || total <= 0) return [];
    const todayStr = fmt(now);
    let list = rows;
    if (axis === "site") {
        list = list.filter((row) =>
            (row.segments || []).some((seg) => seg.end_date >= dateFrom && seg.start_date <= dateTo)
        );
    }
    if (axis === "module") {
        list = [...list].sort((a, b) => String(a.key).localeCompare(String(b.key), undefined, { numeric: true }));
    }
    const labelOf = (seg) => (axis === "module" ? seg.site_name : trimModuleId(seg.module_id));

    return list.map((row, rowIndex) => {
        const segments = row.segments || [];
        const latestOperating = [...segments]
            .filter((s) => s.is_operating)
            .sort((a, b) => b.end_date.localeCompare(a.end_date))[0];

        const distinctLabels = [];
        for (const seg of segments) {
            const label = labelOf(seg);
            if (!distinctLabels.includes(label)) distinctLabels.push(label);
        }

        const display = segments
            .map((seg) => getDisplaySegment(seg, row.last_verified_at, seg === latestOperating, now))
            .filter((seg) => seg.visualEndDate >= dateFrom && seg.visualStartDate <= dateTo
                && seg.visualStartDate <= seg.visualEndDate)
            .sort((a, b) => a.visualStartDate.localeCompare(b.visualStartDate));

        // 같은 대상이 이어지는 구간은 하나로 (이전 불러오기 경계 등)
        const joined = [];
        for (const seg of display) {
            const prev = joined[joined.length - 1];
            if (
                prev && labelOf(prev) === labelOf(seg) && prev.confidence === seg.confidence
                && seg.visualStartDate <= addDays(prev.visualEndDate, 1)
            ) {
                const current = seg.isCurrent ? seg : prev.isCurrent ? prev : null;
                joined[joined.length - 1] = {
                    ...(current || prev),
                    start_date: prev.start_date < seg.start_date ? prev.start_date : seg.start_date,
                    end_date: prev.end_date > seg.end_date ? prev.end_date : seg.end_date,
                    visualStartDate: prev.visualStartDate,
                    visualEndDate: prev.visualEndDate > seg.visualEndDate ? prev.visualEndDate : seg.visualEndDate,
                };
            } else {
                joined.push(seg);
            }
        }

        const bars = joined.map((seg, i) => {
            const start = seg.visualStartDate < dateFrom ? dateFrom : seg.visualStartDate;
            const end = seg.visualEndDate > dateTo ? dateTo : seg.visualEndDate;
            const startIndex = spanDays(dateFrom, start) - 1;
            const len = spanDays(start, end);
            const label = labelOf(seg);
            const bar = {
                id: `${seg.visualStartDate}-${label}-${i}`,
                label,
                toneIndex: Math.min(Math.max(distinctLabels.indexOf(label), 0), 3),
                confidence: seg.confidence,
                isCurrent: seg.isCurrent,
                start,
                end,
                days: len,
                visualStartDate: seg.visualStartDate,
                visualEndDate: seg.visualEndDate,
                rawStart: seg.start_date,
                rawEnd: seg.end_date,
                freshnessText: seg.freshnessText,
                lastVerifiedAt: seg.lastVerifiedAt,
                ongoing: seg.isCurrent && seg.visualEndDate >= todayStr,
                left: pct(startIndex, total),
                width: pct(len, total),
                fadeStart: 100,
                endOpacity: 1,
            };
            if (seg.isCurrent) {
                const verifiedAt = parseDateTime(seg.lastVerifiedAt);
                const verifiedDate = verifiedAt ? fmt(verifiedAt) : start;
                const fadeFrom = verifiedDate < start ? start : verifiedDate;
                bar.fadeStart = fadeFrom > end ? 100 : pct(spanDays(start, fadeFrom) - 1, len);
                bar.endOpacity = getOpacityForDate(end, seg.lastVerifiedAt);
                bar.startOpacity = getOpacityForDate(start, seg.lastVerifiedAt);
            }
            return bar;
        });

        const sub = latestOperating
            ? axis === "module" ? latestOperating.site_name : trimModuleId(latestOperating.module_id)
            : null;
        return {
            key: row.key,
            label: axis === "module" ? trimModuleId(row.label) : row.label,
            sub,
            bars,
            rowIndex,
            hasCurrent: bars.some((b) => b.isCurrent),
            ongoing: bars.some((b) => b.ongoing),
        };
    });
};

// 축 표시: 월 경계(%)와 주말 칸
export const buildAxis = (dateFrom, dateTo) => {
    const dates = buildDateRange(dateFrom, dateTo);
    const total = dates.length;
    const months = [];
    dates.forEach((d, i) => {
        const key = d.slice(0, 7);
        const last = months[months.length - 1];
        if (last && last.key === key) {
            last.len += 1;
        } else {
            const month = parseInt(d.slice(5, 7), 10);
            const showYear = !last || d.slice(0, 4) !== last.key.slice(0, 4);
            months.push({ key, label: showYear ? `${d.slice(0, 4)}.${month}월` : `${month}월`, start: i, len: 1 });
        }
    });
    const days = dates.map((d) => {
        const dow = new Date(d + "T00:00:00").getDay();
        return { date: d, day: Number(d.slice(8, 10)), weekend: dow === 0 || dow === 6 };
    });
    return {
        total,
        days,
        months: months.map((m) => ({ ...m, left: pct(m.start, total), width: pct(m.len, total) })),
    };
};
