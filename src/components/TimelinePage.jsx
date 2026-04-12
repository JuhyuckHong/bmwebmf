import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Cookies from "js-cookie";
import { API } from "../API";
import "../CSS/Timeline.css";

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

    // 초기 로드 및 사용자가 직접 날짜/축을 변경했을 때
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
            const label = parseInt(dates[i].slice(5, 7), 10) + "월";
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
        return sorted.map((row) => {
            const cellMap = {};
            for (const seg of row.segments) {
                const s = Math.max(dates.indexOf(seg.start_date), 0);
                const e = Math.min(
                    seg.end_date > effectiveTo ? dates.length - 1 : dates.indexOf(seg.end_date),
                    dates.length - 1,
                );
                if (s < 0 || e < 0) continue;
                for (let i = s; i <= e; i++) {
                    cellMap[i] = seg;
                }
            }

            const labelKey = (seg) => axis === "module" ? seg.site_name : trimModuleId(seg.module_id);
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
                let j = i + 1;
                while (j < dates.length && cellMap[j] && labelKey(cellMap[j]) === label) {
                    j++;
                }
                spans.push({ start: i, len: j - i, seg, label, confidence: seg.confidence });
                i = j;
            }
            // 현재 운영중인 최신 segment에서 부가 정보
            const latest = [...row.segments]
                .filter((s) => s.is_operating)
                .sort((a, b) => b.end_date.localeCompare(a.end_date))[0];
            const sub = latest
                ? axis === "module" ? latest.site_name : trimModuleId(latest.module_id)
                : null;
            const displayLabel = axis === "module" ? trimModuleId(row.label) : row.label;
            return { key: row.key, label: displayLabel, sub, spans };
        });
    }, [rows, dates, axis, dateFrom, effectiveTo]);

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
                        <table className="timeline-table">
                            <thead>
                                <tr>
                                    <th className="timeline-corner" rowSpan={3}>
                                        {axis === "module" ? "모듈" : "현장"}
                                    </th>
                                    <th className="timeline-load-more-cell" rowSpan={3}>
                                        <button
                                            className="timeline-load-more"
                                            onClick={loadMore}
                                            disabled={loadingMore}
                                        >
                                            {loadingMore ? "..." : "← 이전"}
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
                                        const top = day.length > 1 ? day[0] : "";
                                        const bottom = day.length > 1 ? day[1] : day[0];
                                        return (
                                            <th
                                                key={d}
                                                className={"timeline-day" + (isWeekend ? " timeline-weekend" : "")}
                                                title={d}
                                            >
                                                <span className="timeline-day-top">{top}</span>
                                                <span className="timeline-day-bottom">{bottom}</span>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {rowSpans.map((row) => (
                                    <tr key={row.key}>
                                        <th>
                                            {row.label}
                                            {row.sub && <span className="timeline-row-sub"> ({row.sub})</span>}
                                        </th>
                                        <td className="timeline-load-more-cell" />
                                        {row.spans.map((span) =>
                                            span.seg ? (
                                                <td
                                                    key={span.start}
                                                    colSpan={span.len}
                                                    title={`${span.label} (${span.seg.start_date} ~ ${span.seg.end_date})`}
                                                >
                                                    <div
                                                        className={
                                                            "timeline-cell-segment" +
                                                            (span.confidence === "medium"
                                                                ? " confidence-medium"
                                                                : "")
                                                        }
                                                    >
                                                        {span.len > 1 ? span.label : ""}
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
