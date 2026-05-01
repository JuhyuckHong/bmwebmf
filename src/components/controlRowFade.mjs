const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function getControlRowFadeState(module, now = Date.now()) {
    const hasData = module.last_status != null || module.last_success_time != null;

    if (!hasData) {
        return {
            fadeRatio: 0,
            isWithdrawn: false,
            rowClasses: "row-unknown",
        };
    }

    if (module.last_status !== "ERROR" || !module.last_attempt_time) {
        return {
            fadeRatio: 0,
            isWithdrawn: false,
            rowClasses: "",
        };
    }

    const msSinceErrorAttempt = now - new Date(module.last_attempt_time).getTime();
    const fadeRatio = Math.min(
        Math.max((msSinceErrorAttempt - THREE_DAYS) / (SEVEN_DAYS - THREE_DAYS), 0),
        1,
    );
    const isWithdrawn = fadeRatio >= 1;

    return {
        fadeRatio,
        isWithdrawn,
        rowClasses: isWithdrawn
            ? "row-withdrawn"
            : fadeRatio > 0.05
                ? "row-error row-fading"
                : "row-error",
    };
}
