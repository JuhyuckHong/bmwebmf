import { useState } from "react";
import Cookies from "js-cookie";
import { API } from "../API";
import {
    INTERVAL_OPTIONS,
    SCHEDULE_STATUS_LABELS,
    isInShootingHours,
    toHHMM,
    toTimeInput,
    validateSchedule,
} from "./scheduleUtils";


export default function ScheduleDialog({ module, onClose, onSaved }) {
    const isLegacy = module.type !== "modern";
    const [timeStart, setTimeStart] = useState(toTimeInput(module.time_start));
    const [timeEnd, setTimeEnd] = useState(toTimeInput(module.time_end));
    const [interval, setIntervalMinutes] = useState(
        INTERVAL_OPTIONS.includes(Number(module.time_interval)) ? Number(module.time_interval) : 10,
    );
    const [applyMode, setApplyMode] = useState("next_boot");
    const [phase, setPhase] = useState("edit");
    const [result, setResult] = useState(null);

    const start = toHHMM(timeStart);
    const end = toHHMM(timeEnd);
    const error = validateSchedule(module.type, start, end, interval);
    const unchanged = start === module.time_start && end === module.time_end && interval === Number(module.time_interval);
    // 같은 값이어도 레거시는 지금 재부팅으로 저장만 해둔 설정을 바로 반영할 수 있다
    const canSubmit = !unchanged || (isLegacy && applyMode === "reboot_now");
    const rebootDuringShooting = isLegacy && applyMode === "reboot_now"
        && isInShootingHours(module.time_start, module.time_end);
    const lastChange = module.schedule_change;

    const submit = async () => {
        if (rebootDuringShooting
            && !window.confirm("지금은 촬영 시간대입니다. 재부팅하는 동안 사진이 1장 누락될 수 있습니다. 계속할까요?")) {
            return;
        }
        setPhase("submitting");
        try {
            const headers = { Authorization: Cookies.get("BM") };
            const res = await API.setModuleSchedule(headers, module.id, {
                time_start: start,
                time_end: end,
                time_interval: interval,
                ...(isLegacy && { apply_mode: applyMode }),
            });
            setResult({ ok: true, message: res.data?.message, warnings: res.data?.warnings ?? [] });
            setPhase("done");
            onSaved?.();
        } catch (err) {
            setResult({ ok: false, message: err.response?.data?.message ?? err.message ?? "변경 요청에 실패했습니다." });
            setPhase("edit");
        }
    };

    return (
        <div className="control-modal-overlay" onClick={onClose}>
            <div className="control-confirm-modal schedule-dialog" onClick={(e) => e.stopPropagation()}>
                <h3 className="control-confirm-title">촬영 시간·간격 변경</h3>
                <p className="control-confirm-text">
                    <strong>{module.site_name}</strong> ({parseInt(module.id, 10)}) · {isLegacy ? "레거시" : "현행"} 모듈
                </p>

                <div className="schedule-form">
                    <label>
                        <span>시작</span>
                        <input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)}
                            disabled={phase !== "edit"} />
                    </label>
                    <label>
                        <span>종료</span>
                        <input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)}
                            disabled={phase !== "edit"} />
                    </label>
                    <label>
                        <span>간격</span>
                        <select value={interval} onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                            disabled={phase !== "edit"}>
                            {INTERVAL_OPTIONS.map((value) => (
                                <option key={value} value={value}>{value}분</option>
                            ))}
                        </select>
                    </label>
                </div>

                {isLegacy && (
                    <div className="schedule-apply">
                        <label>
                            <input type="radio" name="apply_mode" value="next_boot" checked={applyMode === "next_boot"}
                                onChange={() => setApplyMode("next_boot")} disabled={phase !== "edit"} />
                            저장만 하기 (다음 05:00 자동 재부팅 때 반영)
                        </label>
                        <label>
                            <input type="radio" name="apply_mode" value="reboot_now" checked={applyMode === "reboot_now"}
                                onChange={() => setApplyMode("reboot_now")} disabled={phase !== "edit"} />
                            저장하고 지금 재부팅 (1~2분 동안 모듈 꺼짐)
                        </label>
                    </div>
                )}
                <p className="control-confirm-subtext">
                    {isLegacy
                        ? "레거시 모듈은 재부팅해야 새 설정으로 촬영합니다. 간격에 비례해 상태 점검·리포트 주기도 바뀝니다."
                        : "현행 모듈은 저장하면 촬영 서비스가 바로 재시작됩니다."}
                </p>
                {rebootDuringShooting && (
                    <p className="control-confirm-status schedule-warn">지금은 촬영 시간대라 재부팅 중 사진 1장이 누락될 수 있습니다.</p>
                )}
                {lastChange && phase === "edit" && !result && (
                    <p className="control-confirm-subtext">
                        최근 변경: {lastChange.created_at?.slice(5, 16)} · {SCHEDULE_STATUS_LABELS[lastChange.status] ?? lastChange.status}
                        {lastChange.message ? ` · ${lastChange.message}` : ""}
                    </p>
                )}
                {phase === "edit" && error && <p className="control-confirm-status schedule-warn">{error}</p>}
                {result && (
                    <p className={`control-confirm-status${result.ok ? "" : " schedule-warn"}`}>{result.message}</p>
                )}
                {result?.warnings?.map((text) => (
                    <p key={text} className="control-confirm-subtext">⚠ {text}</p>
                ))}

                <div className="control-confirm-actions">
                    <button className="hist-close-btn" onClick={onClose}>
                        {phase === "done" ? "닫기" : "취소"}
                    </button>
                    {phase !== "done" && (
                        <button className="admin-btn" onClick={submit} disabled={phase !== "edit" || !!error || !canSubmit}>
                            {phase === "submitting" ? "적용 중..." : "저장"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
