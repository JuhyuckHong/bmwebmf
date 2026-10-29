import { useCallback, useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { API } from "../API";
import "../CSS/Control.css";
import "../CSS/Changes.css";
import ScheduleDialog from "./ScheduleDialog";
import { SCHEDULE_STATUS_LABELS, toTimeInput } from "./scheduleUtils";

// 모듈 설정 변경 페이지 (/changes). 메뉴에서 연결하지 않고 주소로만 들어온다.
// 설정 항목이 늘어나면 SETTINGS에 추가하고 해당 편집 화면을 연결한다.
const SETTINGS = [
    { key: "schedule", label: "촬영 시간·간격" },
];

const TYPE_FILTERS = [
    { key: "all", label: "전체" },
    { key: "legacy", label: "레거시" },
    { key: "modern", label: "현행" },
    { key: "changing", label: "변경 중" },
];

const isReachable = (m) => m.last_status === "SUCCESS" || m.last_status === "PARTIAL";

function ModuleCard({ module, onSelect }) {
    const change = module.schedule_change;
    const reachable = isReachable(module);
    return (
        <button type="button" className="changes-card" onClick={() => onSelect(module)}>
            <span className="changes-card-top">
                <span className="changes-card-id">{parseInt(module.id, 10)}</span>
                <span className="changes-card-name">{module.site_name}</span>
                <span className={`changes-chip ${module.type === "modern" ? "modern" : "legacy"}`}>
                    {module.type === "modern" ? "현행" : "레거시"}
                </span>
            </span>
            <span className="changes-card-bottom">
                <span className="changes-card-schedule">
                    {toTimeInput(module.time_start) || "—"} ~ {toTimeInput(module.time_end) || "—"}
                    <span className="muted"> · {module.time_interval ?? "—"}분</span>
                </span>
                {change && change.status !== "applied" && (
                    <span className={`schedule-badge ${change.status}`}>
                        {SCHEDULE_STATUS_LABELS[change.status] ?? change.status}
                    </span>
                )}
                {!reachable && <span className="changes-offline">응답 없음</span>}
            </span>
        </button>
    );
}

export default function ChangesPage() {
    const [setting, setSetting] = useState(SETTINGS[0].key);
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("all");
    const [selected, setSelected] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const headers = { Authorization: Cookies.get("BM") };
            const res = await API.getLatest(headers);
            setModules(res.data?.modules ?? []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const id = setInterval(fetchData, 60000);
        return () => clearInterval(id);
    }, [fetchData]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return modules.filter((m) => {
            if (filter === "legacy" && m.type === "modern") return false;
            if (filter === "modern" && m.type !== "modern") return false;
            if (filter === "changing" && m.schedule_change?.status !== "pending") return false;
            if (!q) return true;
            return String(parseInt(m.id, 10)) === q || m.id.includes(q)
                || (m.site_name ?? "").toLowerCase().includes(q);
        });
    }, [modules, query, filter]);

    return (
        <div className="changes-page">
            <header className="changes-header">
                <div className="changes-title-row">
                    <h2>설정 변경</h2>
                    <button type="button" className="changes-refresh" onClick={fetchData} aria-label="새로고침">↻</button>
                </div>
                {SETTINGS.length > 1 && (
                    <div className="changes-tabs">
                        {SETTINGS.map((s) => (
                            <button key={s.key} type="button" className={setting === s.key ? "active" : ""}
                                onClick={() => setSetting(s.key)}>{s.label}</button>
                        ))}
                    </div>
                )}
                <input
                    className="changes-search"
                    type="search"
                    inputMode="search"
                    placeholder="모듈 번호 또는 현장 이름"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <div className="changes-filters">
                    {TYPE_FILTERS.map((f) => (
                        <button key={f.key} type="button" className={filter === f.key ? "active" : ""}
                            onClick={() => setFilter(f.key)}>{f.label}</button>
                    ))}
                </div>
            </header>

            {loading && <p className="changes-empty">불러오는 중...</p>}
            {error && <p className="changes-empty schedule-warn">{error}</p>}
            {!loading && !error && visible.length === 0 && <p className="changes-empty">해당하는 모듈이 없습니다.</p>}

            <div className="changes-list">
                {visible.map((m) => (
                    <ModuleCard key={m.id} module={m} onSelect={setSelected} />
                ))}
            </div>

            {selected && setting === "schedule" && (
                <ScheduleDialog
                    module={selected}
                    onClose={() => setSelected(null)}
                    onSaved={fetchData}
                />
            )}
        </div>
    );
}
