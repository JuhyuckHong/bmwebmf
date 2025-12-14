import { useEffect, useCallback, useRef } from 'react';

const DEBOUNCE_DELAY = 100;

/**
 * 현재 포커스된 요소가 입력 필드인지 확인
 */
function isInputElement(element) {
    if (!element) return false;
    const tagName = element.tagName?.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return true;
    }
    if (element.isContentEditable) return true;
    return false;
}

/**
 * 키보드 이벤트 처리를 위한 커스텀 훅
 * @param {Object} keyHandlers - { key: handler } 형태의 핸들러 맵
 * @param {Object} options - 옵션
 * @param {boolean} options.enabled - 활성화 여부 (기본: true)
 * @param {boolean} options.preventDefault - 기본 동작 방지 (기본: true)
 * @param {boolean} options.allowInInputs - 입력 필드에서도 작동 (기본: false)
 */
export function useKeyboardNavigation(keyHandlers, options = {}) {
    const {
        enabled = true,
        preventDefault = true,
        allowInInputs = false
    } = options;

    const lastKeyTimeRef = useRef({});
    const handlersRef = useRef(keyHandlers);

    // 핸들러 업데이트 시 ref도 업데이트
    useEffect(() => {
        handlersRef.current = keyHandlers;
    }, [keyHandlers]);

    const handleKeyDown = useCallback((event) => {
        if (!enabled) return;

        // 입력 필드 내부에서는 단축키 무시 (옵션에 따라)
        if (!allowInInputs && isInputElement(event.target)) return;

        const key = event.key;
        const handler = handlersRef.current[key];

        if (handler) {
            // 디바운싱: 연속 키 입력 방지
            const now = Date.now();
            if (lastKeyTimeRef.current[key] && now - lastKeyTimeRef.current[key] < DEBOUNCE_DELAY) {
                return;
            }
            lastKeyTimeRef.current[key] = now;

            if (preventDefault) {
                event.preventDefault();
            }
            handler(event);
        }
    }, [enabled, preventDefault, allowInInputs]);

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown, enabled]);
}

export default useKeyboardNavigation;
