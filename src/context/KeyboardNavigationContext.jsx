import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

const KeyboardNavigationContext = createContext(null);

/**
 * 전역 키보드 단축키를 관리하는 Provider
 * - ESC: 뒤로가기 또는 모달 닫기
 * - H: 홈(AllSites)으로 이동
 */
export function KeyboardNavigationProvider({ children }) {
    const [enabled, setEnabled] = useState(true);
    const [modalStack, setModalStack] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();

    const disableKeyboard = useCallback(() => setEnabled(false), []);
    const enableKeyboard = useCallback(() => setEnabled(true), []);

    const pushModal = useCallback((modalId) => {
        setModalStack(prev => [...prev, modalId]);
    }, []);

    const popModal = useCallback((modalId) => {
        setModalStack(prev => {
            if (modalId) {
                return prev.filter(id => id !== modalId);
            }
            return prev.slice(0, -1);
        });
    }, []);

    const keyHandlers = {
        'Escape': () => {
            if (modalStack.length > 0) {
                // 가장 위의 모달 닫기 - 커스텀 이벤트 발생
                const topModalId = modalStack[modalStack.length - 1];
                window.dispatchEvent(new CustomEvent('closeModal', {
                    detail: { modalId: topModalId }
                }));
            } else if (location.pathname !== '/all' && location.pathname !== '/login') {
                navigate(-1);
            }
        },
        'h': () => {
            if (location.pathname !== '/all' && location.pathname !== '/login') {
                navigate('/all');
            }
        },
        'H': () => {
            if (location.pathname !== '/all' && location.pathname !== '/login') {
                navigate('/all');
            }
        },
    };

    useKeyboardNavigation(keyHandlers, { enabled, preventDefault: false });

    // 모달 닫힘 이벤트 리스너 (모달 스택에서 제거)
    useEffect(() => {
        const handleModalClosed = (e) => {
            popModal(e.detail?.modalId);
        };
        window.addEventListener('modalClosed', handleModalClosed);
        return () => window.removeEventListener('modalClosed', handleModalClosed);
    }, [popModal]);

    return (
        <KeyboardNavigationContext.Provider value={{
            enabled,
            enableKeyboard,
            disableKeyboard,
            pushModal,
            popModal,
            modalStack,
        }}>
            {children}
        </KeyboardNavigationContext.Provider>
    );
}

export function useKeyboardContext() {
    const context = useContext(KeyboardNavigationContext);
    if (!context) {
        throw new Error('useKeyboardContext must be used within KeyboardNavigationProvider');
    }
    return context;
}

export default KeyboardNavigationContext;
