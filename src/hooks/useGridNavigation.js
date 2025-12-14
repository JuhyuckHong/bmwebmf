import { useState, useEffect, useCallback } from 'react';
import { useKeyboardNavigation } from './useKeyboardNavigation';

/**
 * 2D 그리드 키보드 탐색을 위한 커스텀 훅
 * @param {Array} items - 그리드 아이템 배열
 * @param {Object} options - 옵션
 */
export function useGridNavigation(items, options = {}) {
    const {
        onSelect,
        enabled = true,
        gridContainerRef,
        itemSelector = '.thumbnails-individual',
        initialIndex = -1,
        wrapAround = false,
    } = options;

    const [focusedIndex, setFocusedIndex] = useState(initialIndex);
    const [columnsPerRow, setColumnsPerRow] = useState(4);

    // 컨테이너 너비에 따른 컬럼 수 계산
    useEffect(() => {
        if (!gridContainerRef?.current) return;

        const calculateColumns = () => {
            const container = gridContainerRef.current;
            const firstItem = container?.querySelector(itemSelector);
            if (!firstItem || !container) return;

            const containerWidth = container.clientWidth;
            const itemWidth = firstItem.offsetWidth;
            const gap = 20;
            const cols = Math.floor((containerWidth + gap) / (itemWidth + gap));
            setColumnsPerRow(Math.max(1, cols));
        };

        calculateColumns();
        const observer = new ResizeObserver(calculateColumns);
        observer.observe(gridContainerRef.current);

        return () => observer.disconnect();
    }, [gridContainerRef, itemSelector]);

    // 포커스된 아이템을 뷰포트로 스크롤
    useEffect(() => {
        if (focusedIndex < 0 || !gridContainerRef?.current) return;

        const itemElements = gridContainerRef.current.querySelectorAll(itemSelector);
        const focusedItem = itemElements[focusedIndex];
        if (focusedItem) {
            focusedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [focusedIndex, gridContainerRef, itemSelector]);

    // 아이템 변경 시 포커스 리셋
    useEffect(() => {
        if (focusedIndex >= items.length) {
            setFocusedIndex(items.length > 0 ? 0 : -1);
        }
    }, [items.length, focusedIndex]);

    const navigate = useCallback((direction) => {
        const total = items.length;
        if (total === 0) return;

        setFocusedIndex(prev => {
            // 포커스가 없으면 첫 번째 아이템으로
            if (prev < 0) return 0;

            let next = prev;
            switch (direction) {
                case 'up':
                    next = prev - columnsPerRow;
                    break;
                case 'down':
                    next = prev + columnsPerRow;
                    break;
                case 'left':
                    next = prev - 1;
                    break;
                case 'right':
                    next = prev + 1;
                    break;
                default:
                    break;
            }

            // 경계 처리
            if (wrapAround) {
                if (next < 0) next = total - 1;
                if (next >= total) next = 0;
            } else {
                if (next < 0 || next >= total) return prev;
            }

            return next;
        });
    }, [items.length, columnsPerRow, wrapAround]);

    const handleSelect = useCallback(() => {
        if (focusedIndex >= 0 && focusedIndex < items.length && onSelect) {
            onSelect(items[focusedIndex], focusedIndex);
        }
    }, [focusedIndex, items, onSelect]);

    const keyHandlers = {
        'ArrowUp': () => navigate('up'),
        'ArrowDown': () => navigate('down'),
        'ArrowLeft': () => navigate('left'),
        'ArrowRight': () => navigate('right'),
        'Enter': handleSelect,
    };

    useKeyboardNavigation(keyHandlers, { enabled });

    return {
        focusedIndex,
        setFocusedIndex,
        columnsPerRow,
    };
}

export default useGridNavigation;
