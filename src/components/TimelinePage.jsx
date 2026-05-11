import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import Cookies from "js-cookie";
import { API } from "../API";
import "../CSS/Timeline.css";

const FRESHNESS_FADE_DAYS = 7;
const RESTART_GAP_DAYS = 15;
const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const buildDateRange = (from, to) => {
    const dates = [];
    const cur = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    while (cur <= end) {
        dates.push(fmt(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
};

const today = () => fmt(new Date());

const trimModuleId = (id) => String(Number(id));

const subtractDays = (dateStr, days) => {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() - days);
    return fmt(d);
};

const addDays = (dateStr, days) => {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    return fmt(d);
};

const parseDateOnly = (value) => {
    if (!value) return null;
    const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseDateTime = (value) => {
    if (!value) return null;
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const diffDays = (later, earlier) => {
    if (!later || !earlier) return null;
    return Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
};

const getDefaultRange = () => {
    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - 1);
    from.setDate(1);
    return {
        from: fmt(from),
        to: today(),
    };
};

const getFreshnessText = (lastVerifiedAt) => {
    if (!lastVerifiedAt) return "freshness unknown";
    const verifiedAt = parseDateTime(lastVerifiedAt);
    if (!verifiedAt) return `last verified ${lastVerifiedAt}`;
    const staleDays = Math.max(diffDays(new Date(), verifiedAt), 0);
    return `last verified ${lastVerifiedAt} (${staleDays}d ago)`;
};

const getOpacityForDate = (dateStr, lastVerifiedAt) => {
    if (!lastVerifiedAt) return 0;
    const verifiedAt = parseDateTime(lastVerifiedAt);
    const cellDate = parseDateOnly(dateStr);
    if (!verifiedAt || !cellDate) return 0;
    const verifiedDate = fmt(verifiedAt);
    if (dateStr < verifiedDate) return 1;
    const staleDays = Math.max(diffDays(cellDate, parseDateOnly(verifiedDate)), 0);
    const fadeRatio = Math.min(staleDays / FRESHNESS_FADE_DAYS, 1);
    return Math.max(1 - fadeRatio, 0);
};

const getDisplaySegment = (seg, rowLastVerifiedAt, isLatestOperating) => {
    const lastVerifiedAt = seg.last_verified_at ?? rowLastVerifiedAt ?? null;
    const displaySeg = {
        ...seg,
        visualStartDate: seg.start_date,
        visualEndDate: seg.end_date,
        freshnessText: getFreshnessText(lastVerifiedAt),
        lastVerifiedAt,
        isCurrent: false,
    };

    if (!isLatestOperating) {
        return displaySeg;
    }

    if (!lastVerifiedAt) {
        return displaySeg;
    }

    displaySeg.isCurrent = true;

    const verifiedAt = parseDateTime(lastVerifiedAt);
    const endDate = parseDateOnly(seg.end_date);
    const gapDays = diffDays(verifiedAt, endDate);

    if (gapDays !== null && gapDays > RESTART_GAP_DAYS) {
        displaySeg.visualStartDate = fmt(verifiedAt);
    }

    if (verifiedAt) {
        const verifiedDate = fmt(verifiedAt);
        const fadeEndDate = addDays(verifiedDate, FRESHNESS_FADE_DAYS);
        if (displaySeg.visualEndDate > fadeEndDate) {
            displaySeg.visualEndDate = fadeEndDate;
        }
    }

    return displaySeg;
};

const getSegmentFontSize = (spanLen) => {
    if (spanLen >= 10) return "0.65rem";
    if (spanLen >= 7) return "0.6rem";
    if (spanLen >= 5) return "0.55rem";
    if (spanLen >= 4) return "0.5rem";
    if (spanLen >= 3) return "0.42rem";
    if (spanLen >= 2) return "0.36rem";
    return "0.32rem";
};

const formatLabelDate = (value) => {
    if (!value) return "";
    return `${value.slice(0, 10).replaceAll("-", ".")}.`;
};

const getSegmentLabel = (span) => {
    if (!span.seg) return "";
    if (span.seg.isCurrent && span.opacity < 1) return "";
    if (span.seg.isCurrent && span.len >= 12 && span.seg.visualEndDate >= today()) {
        return `${span.label} (${formatLabelDate(span.seg.visualStartDate)} ~ 현재 운영중)`;
    }
    if (span.len >= 12) {
        return `${span.label} (${formatLabelDate(span.seg.visualStartDate)} ~ ${formatLabelDate(span.seg.visualEndDate)})`;
    }
    return span.label;
};

export default function TimelinePage() {
    const defaults = getDefaultRange();
    const [inputFrom, setInputFrom] = useState(defaults.from);
    const [dateTo, setDateTo] = useState(defaults.to);
    const [axis, setAxis] = useState("module");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [dateFrom, setDateFrom] = useState(defaults.from);
    const wrapRef = useRef(null);
    const tableRef = useRef(null);

    const effectiveTo = dateTo > today() ? today() : dateTo;

    const fetchData = useCallback(async (from, to) => {
        const headers = { Authorization: Cookies.get("BM") };
        const res = await API.getOperationTimeline(headers, {
            date_from: from,
            date_to: to,
            axis,
        });
        return res.data?.rows || [];
    }, [axis]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setDateFrom(inputFrom);
        fetchData(inputFrom, effectiveTo).then((newRows) => {
            if (cancelled) return;
            setRows(newRows);
            setLoading(false);
            setTimeout(() => {
                if (wrapRef.current) {
                    wrapRef.current.scrollLeft = wrapRef.current.scrollWidth;
                }
            }, 0);
        }).catch(() => {
            if (!cancelled) {
                setRows([]);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [inputFrom, effectiveTo, fetchData]);

    const loadMore = useCallback(async () => {
        if (loadingMore) return;
        setLoadingMore(true);
        const newFrom = subtractDays(dateFrom, 30);
        const newTo = subtractDays(dateFrom, 1);
        try {
            const prevScrollWidth = wrapRef.current?.scrollWidth || 0;
            const prevScrollLeft = wrapRef.current?.scrollLeft || 0;
            const moreRows = await fetchData(newFrom, newTo);
            setRows((prev) => {
                const merged = new Map();
                for (const row of prev) {
                    merged.set(row.key, { ...row });
                }
                for (const row of moreRows) {
                    if (merged.has(row.key)) {
                        const existing = merged.get(row.key);
                        existing.segments = [...row.segments, ...existing.segments];
                        existing.last_verified_at = existing.last_verified_at ?? row.last_verified_at ?? null;
                    } else {
                        merged.set(row.key, { ...row });
                    }
                }
                return Array.from(merged.values());
            });
            setDateFrom(newFrom);
            requestAnimationFrame(() => {
                if (wrapRef.current) {
                    const diff = wrapRef.current.scrollWidth - prevScrollWidth;
                    wrapRef.current.scrollLeft = prevScrollLeft + diff;
                }
            });
        } catch (err) {
            console.error("timeline load more error", err);
        } finally {
            setLoadingMore(false);
        }
    }, [dateFrom, loadingMore, fetchData]);

    const dates = useMemo(() => buildDateRange(dateFrom, effectiveTo), [dateFrom, effectiveTo]);

    const yearSpans = useMemo(() => {
        const spans = [];
        for (let i = 0; i < dates.length; i++) {
            const year = dates[i].slice(0, 4);
            if (spans.length && spans[spans.length - 1].label === year) {
                spans[spans.length - 1].len++;
            } else {
                spans.push({ label: year, len: 1 });
            }
        }
        return spans;
    }, [dates]);

    const monthSpans = useMemo(() => {
        const spans = [];
        for (let i = 0; i < dates.length; i++) {
            const month = dates[i].slice(0, 7);
            const label = `${parseInt(dates[i].slice(5, 7), 10)}월`;
            if (spans.length && spans[spans.length - 1].key === month) {
                spans[spans.length - 1].len++;
            } else {
                spans.push({ key: month, label, len: 1 });
            }
        }
        return spans;
    }, [dates]);

    const rowSpans = useMemo(() => {
        if (!rows.length) return [];
        let sorted = [...rows];
        if (axis === "site") {
            sorted = sorted.filter((row) =>
                row.segments.some((seg) => seg.end_date >= dateFrom && seg.start_date <= effectiveTo)
            );
        }
        if (axis === "module") {
            sorted.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
        }
        return sorted.map((row, rowIndex) => {
            const latestOperating = [...row.segments]
                .filter((s) => s.is_operating)
                .sort((a, b) => b.end_date.localeCompare(a.end_date))[0];

            const cellMap = {};
            for (const seg of row.segments) {
                const displaySeg = getDisplaySegment(seg, row.last_verified_at, seg === latestOperating);
                const startIndex = dates.indexOf(displaySeg.visualStartDate);
                const endIndex = displaySeg.visualEndDate > effectiveTo
                    ? dates.length - 1
                    : dates.indexOf(displaySeg.visualEndDate);
                const s = Math.max(startIndex, 0);
                const e = Math.min(endIndex, dates.length - 1);
                if (startIndex < 0 || endIndex < 0 || s > e) continue;
                for (let i = s; i <= e; i++) {
                    cellMap[i] = displaySeg;
                }
            }

            const labelKey = (seg) => axis === "module" ? seg.site_name : trimModuleId(seg.module_id);
            const distinctLabels = [];
            for (const seg of row.segments) {
                const label = labelKey(seg);
                if (!distinctLabels.includes(label)) {
                    distinctLabels.push(label);
                }
            }
            const spans = [];
            let i = 0;
            while (i < dates.length) {
                const seg = cellMap[i];
                if (!seg) {
                    spans.push({ start: i, len: 1, seg: null });
                    i++;
                    continue;
                }
                const label = labelKey(seg);
                const opacity = seg.isCurrent ? getOpacityForDate(dates[i], seg.lastVerifiedAt) : 1;
                let j = i + 1;
                while (
                    j < dates.length &&
                    cellMap[j] &&
                    labelKey(cellMap[j]) === label &&
                    (cellMap[j].isCurrent ? getOpacityForDate(dates[j], cellMap[j].lastVerifiedAt) : 1) === opacity
                ) {
                    j++;
                }
                spans.push({
                    start: i,
                    len: j - i,
                    seg,
                    label,
                    confidence: seg.confidence,
                    opacity,
                    toneIndex: Math.max(distinctLabels.indexOf(label), 0),
                });
                i = j;
            }

            const sub = latestOperating
                ? axis === "module" ? latestOperating.site_name : trimModuleId(latestOperating.module_id)
                : null;
            const displayLabel = axis === "module" ? trimModuleId(row.label) : row.label;
            const hasCurrent = spans.some((span) => span.seg?.isCurrent);
            return { key: row.key, label: displayLabel, sub, spans, rowIndex, hasCurrent };
        });
    }, [rows, dates, axis, dateFrom, effectiveTo]);

    useLayoutEffect(() => {
        const table = tableRef.current;
        if (!table) return;
        const firstTh = table.querySelector("thead tr:first-child th:first-child");
        if (!firstTh) return;
        table.style.setProperty("--tl-col1-w", `${Math.ceil(firstTh.getBoundingClientRect().width)}px`);
    }, [rowSpans]);

    return (
        <div className="timeline-page">
            <div className="timeline-card">
                <div className="timeline-toolbar">
                    <h2 className="timeline-toolbar-title">운영 타임라인</h2>
                    <label>
                        시작
                        <input
                            type="date"
                            value={inputFrom}
                            onChange={(e) => setInputFrom(e.target.value)}
                        />
                    </label>
                    <label>
                        종료
                        <input
                            type="date"
                            value={dateTo}
                            max={today()}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </label>
                    <label>
                        축
                        <select value={axis} onChange={(e) => setAxis(e.target.value)}>
                            <option value="module">모듈</option>
                            <option value="site">현장</option>
                        </select>
                    </label>
                    {loadingMore && <span className="timeline-loading-more">과거 데이터 로딩중...</span>}
                </div>

                {loading && <div className="timeline-loading">불러오는 중...</div>}

                {!loading && rowSpans.length === 0 && (
                    <div className="timeline-empty">해당 기간에 데이터가 없습니다.</div>
                )}

                {!loading && rowSpans.length > 0 && (
                    <div className="timeline-table-wrap" ref={wrapRef}>
                        <table className="timeline-table" ref={tableRef}>
                            <colgroup>
                                <col className="timeline-col-primary" />
                                <col className="timeline-col-secondary" />
                                <col className="timeline-col-load-more" />
                                {dates.map((d) => (
                                    <col key={d} className="timeline-col-day" />
                                ))}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className="timeline-corner timeline-corner-primary" rowSpan={3}>
                                        {axis === "module" ? "모듈" : "현장"}
                                    </th>
                                    <th className="timeline-corner timeline-corner-secondary" rowSpan={3}>
                                        {axis === "module" ? "현장" : "모듈"}
                                    </th>
                                    <th className="timeline-load-more-cell" rowSpan={3}>
                                        <button
                                            className="timeline-load-more"
                                            onClick={loadMore}
                                            disabled={loadingMore}
                                        >
                                            {loadingMore ? "..." : "이전"}
                                        </button>
                                    </th>
                                    {yearSpans.map((s) => (
                                        <th key={s.label} colSpan={s.len} className="timeline-year">
                                            {s.label}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    {monthSpans.map((s) => (
                                        <th key={s.key} colSpan={s.len} className="timeline-month">
                                            {s.label}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    {dates.map((d) => {
                                        const dt = new Date(d + "T00:00:00");
                                        const dow = dt.getDay();
                                        const isWeekend = dow === 0 || dow === 6;
                                        const day = String(dt.getDate());
                                        return (
                                            <th
                                                key={d}
                                                className={"timeline-day" + (isWeekend ? " timeline-weekend" : "")}
                                                title={d}
                                            >
                                                <span className="timeline-day-single">{day}</span>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {rowSpans.map((row) => (
                                    <tr
                                        key={row.key}
                                        className={row.rowIndex % 2 === 1 ? "timeline-row-alt" : undefined}
                                    >
                                        <th className={row.hasCurrent ? "timeline-row-current" : undefined}>
                                            <span className="timeline-row-main">{row.label}</span>
                                        </th>
                                        <th className={row.hasCurrent ? "timeline-row-current" : undefined}>
                                            <span className="timeline-row-subcell">{row.sub || ""}</span>
                                        </th>
                                        {row.key === rowSpans[0]?.key && (
                                            <td
                                                className="timeline-load-more-cell timeline-load-more-cell-body"
                                                rowSpan={rowSpans.length}
                                            >
                                                <button
                                                    className="timeline-load-more timeline-load-more-body"
                                                    onClick={loadMore}
                                                    disabled={loadingMore}
                                                >
                                                    {loadingMore ? "..." : "이전"}
                                                </button>
                                            </td>
                                        )}
                                        {row.spans.map((span) =>
                                            span.seg ? (
                                                <td
                                                    key={span.start}
                                                    colSpan={span.len}
                                                    className={
                                                        span.seg.isCurrent
                                                            ? "timeline-cell-current" + (span.opacity < 1 ? " timeline-cell-fade-start" : "")
                                                            : undefined
                                                    }
                                                    title={`${span.label} (${span.seg.visualStartDate} ~ ${span.seg.visualEndDate}) ${span.seg.freshnessText}`}
                                                    style={span.seg.isCurrent
                                                        ? { "--segment-opacity": span.opacity }
                                                        : undefined}
                                                >
                                                    <div
                                                        className={
                                                            "timeline-cell-segment" +
                                                            (span.seg.isCurrent ? " is-current" : "") +
                                                            ` tone-${Math.min(span.toneIndex, 3)}` +
                                                            (span.confidence === "medium"
                                                                ? " confidence-medium"
                                                                : "")
                                                        }
                                                        style={{
                                                            ...(span.seg.isCurrent
                                                                ? { "--segment-opacity": span.opacity }
                                                                : {}),
                                                            "--segment-font-size": getSegmentFontSize(span.len),
                                                        }}
                                                    >
                                                        {getSegmentLabel(span)}
                                                    </div>
                                                </td>
                                            ) : (
                                                <td key={span.start} colSpan={span.len} />
                                            ),
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
