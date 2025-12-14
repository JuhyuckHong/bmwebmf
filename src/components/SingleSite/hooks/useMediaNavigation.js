import { useCallback } from 'react';
import { useKeyboardNavigation } from '../../../hooks';

/**
 * SingleSite 페이지 키보드 제어를 위한 커스텀 훅
 * - ←→: 시간 탐색 (사진)
 * - ↑↓: 날짜 탐색
 * - [ ]: 현장 간 이동
 * - PageUp/Down: 현장 간 이동
 * - 1,2,3: 뷰 모드 전환
 */
export function useMediaNavigation({
    viewMode,
    onViewModeChange,
    photoHandlers,
    videoHandlers,
    siteHandlers,
    enabled = true,
}) {
    // 시간 탐색 (사진 모드에서만)
    const navigateTime = useCallback((direction) => {
        if ((viewMode === 'photo' || viewMode === 'both') && photoHandlers?.handleTimeNav) {
            photoHandlers.handleTimeNav(direction);
        }
    }, [viewMode, photoHandlers]);

    // 날짜 탐색
    const navigateDate = useCallback((direction) => {
        if ((viewMode === 'photo' || viewMode === 'both') && photoHandlers?.handleDateNav) {
            photoHandlers.handleDateNav(direction);
        }
        if ((viewMode === 'video' || viewMode === 'both') && videoHandlers?.handleDateNav) {
            videoHandlers.handleDateNav(direction);
        }
    }, [viewMode, photoHandlers, videoHandlers]);

    // 현장 간 이동
    const navigateSite = useCallback((direction) => {
        if (siteHandlers?.goToSiteByIndex) {
            siteHandlers.goToSiteByIndex(direction);
        }
    }, [siteHandlers]);

    const keyHandlers = {
        // 시간 탐색
        'ArrowLeft': () => navigateTime(-1),
        'ArrowRight': () => navigateTime(1),

        // 날짜 탐색
        'ArrowUp': () => navigateDate(-1),
        'ArrowDown': () => navigateDate(1),

        // 현장 간 이동
        '[': () => navigateSite(-1),
        ']': () => navigateSite(1),
        'PageUp': () => navigateSite(-1),
        'PageDown': () => navigateSite(1),

        // 뷰 모드 전환
        '1': () => onViewModeChange?.('both'),
        '2': () => onViewModeChange?.('photo'),
        '3': () => onViewModeChange?.('video'),
    };

    useKeyboardNavigation(keyHandlers, { enabled });
}

export default useMediaNavigation;
