import { useEffect, useState } from "react";
import { API } from "../API";
import Cookies from "js-cookie";

function UserPermission({ reload, setReload }) {
    const [users, setUsers] = useState([]);
    const [allSites, setAllSites] = useState([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const resUsers = await API.allUsers({
                    Authorization: Cookies.get("BM"),
                });
                setUsers(resUsers.data);

                const resSites = await API.allSites({
                    Authorization: Cookies.get("BM"),
                });
                setAllSites(resSites.data.sort());
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        }

        fetchData();
    }, [reload]);

    return <UserList users={users} setReload={setReload} allSites={allSites} />;
}

function UserList({ users, setReload, allSites }) {
    const [selectedUser, setSelectedUser] = useState("");

    useEffect(() => {
        if (selectedUser) return;
        const firstActive = users.find((user) => user.activate);
        if (firstActive) {
            setSelectedUser(firstActive.username);
        }
    }, [users, selectedUser]);

    const activeUsers = users.filter((user) => user.activate);

    return (
        <div className="permission-layout">
            <div className="admin-card permission-card">
                <div className="card-header">
                    <div className="card-title">권한 설정</div>
                    <p className="card-subtitle">
                        사용자별 현장 접근 권한을 관리하세요.
                    </p>
                </div>
                <div className="field-label">사용자 선택</div>
                <div className="user-picker">
                    {activeUsers.length === 0 ? (
                        <div className="empty-state">
                            활성화된 사용자가 없습니다.
                        </div>
                    ) : (
                        activeUsers.map((user) => (
                            <button
                                key={user.username}
                                type="button"
                                className={`user-chip ${
                                    selectedUser === user.username
                                        ? "selected"
                                        : ""
                                }`}
                                onClick={() => setSelectedUser(user.username)}>
                                <span className="user-chip__name">
                                    {user.username}
                                </span>
                                <span className="user-chip__code">
                                    {user.code}
                                </span>
                            </button>
                        ))
                    )}
                </div>

                {users
                    .filter((user) => user.username === selectedUser)
                    .map((user) => {
                        return (
                            <div
                                className="permission-panel"
                                key={user.username}>
                                <ModifySiteForm
                                    username={user.username}
                                    user={user}
                                    setReload={setReload}
                                    allSites={allSites}
                                />
                            </div>
                        );
                    })}
            </div>
            <div className="admin-card user-state-card">
                <div className="card-header">
                    <div className="card-title">사용자 상태</div>
                    <p className="card-subtitle">
                        비활성화 · 삭제 등 계정 상태를 관리하세요.
                    </p>
                </div>
                <UserDeactivateDelete users={users} setReload={setReload} />
            </div>
        </div>
    );
}

function UserDeactivateDelete({ users, setReload }) {
    const handleDeactivateUser = async (username) => {
        await API.deactivateUser(
            {
                Authorization: Cookies.get("BM"),
            },
            username,
        );
        setReload((prev) => !prev);
    };

    const handleActivateUser = async (username) => {
        await API.activateUser(
            {
                Authorization: Cookies.get("BM"),
            },
            username,
        );
        setReload((prev) => !prev);
    };

    const handleDeleteUser = async (username) => {
        const isConfirmed = window.confirm(
            `사용자 ${username}을 삭제 하시겠습니까?`,
        );
        if (isConfirmed) {
            await API.deleteUser(
                {
                    Authorization: Cookies.get("BM"),
                },
                username,
            );
        }
        setReload((prev) => !prev);
    };

    const managedUsers = users.filter(
        (user) => user.username !== user.class,
    );

    return (
        <div className="user-state-container">
            {managedUsers.map((user) => (
                <div
                    key={user.username}
                    className={`user-state ${
                        user.activate ? "activated" : "deactivated"
                    }`}>
                    <div className="user-state-status">
                        {user.activate ? "활성 사용자" : "비활성 사용자"}
                    </div>
                    <div className="user-state-text">
                        아이디: {user.username}
                    </div>
                    <div className="user-state-text">
                        가입코드: {user.code}
                    </div>
                    <div className="user-state-actions">
                        {user.activate ? (
                            <button
                                className="admin-btn ghost"
                                onClick={() =>
                                    handleDeactivateUser(user.username)
                                }>
                                비활성화
                            </button>
                        ) : (
                            <>
                                <button
                                    className="admin-btn primary"
                                    onClick={() =>
                                        handleActivateUser(user.username)
                                    }>
                                    활성화
                                </button>
                                <button
                                    className="admin-btn danger"
                                    onClick={() =>
                                        handleDeleteUser(user.username)
                                    }>
                                    삭제
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ModifySiteForm({ username, user, setReload, allSites }) {
    const [selectedSites, setSelectedSites] = useState([...user.sites]);
    // 저장 결과를 보여주기 위한 modal
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState({
        added: [],
        removed: [],
    });
    const showSuccessModal = () => {
        const addedSites = selectedSites.filter(
            (site) => !user.sites.includes(site),
        );
        const removedSites = user.sites.filter(
            (site) => !selectedSites.includes(site),
        );

        setModalContent({
            added: addedSites,
            removed: removedSites,
        });

        setShowModal(true); // 모달 표시

        // 3초 후에 모달 숨기기
        setTimeout(() => {
            setShowModal(false);
        }, 3000);
    };

    useEffect(() => {
        setSelectedSites([...user.sites]);
    }, [user]);

    const handleSiteSelection = (site) => {
        if (Array.isArray(site)) {
            setSelectedSites(site);
        } else if (selectedSites.includes(site)) {
            setSelectedSites((prev) => prev.filter((s) => s !== site));
        } else {
            setSelectedSites((prev) => [...prev, site]);
        }
    };

    const handleModifySites = async (e) => {
        e.preventDefault();
        console.log("user permitted sites:", user.sites);
        console.log("handle modify sites:", selectedSites);

        // 변경 사항이 없는 경우 바로 return
        const equals = (a, b) =>
            a.length === b.length && a.every((v, i) => v === b[i]);
        if (equals(user.sites, selectedSites)) {
            showSuccessModal();
            return;
        }

        try {
            await API.userSiteViewAuthSet(
                {
                    Authorization: Cookies.get("BM"),
                },
                username,
                { sites: selectedSites },
            );

            showSuccessModal();

            setReload((prev) => !prev);
        } catch (error) {
            console.error(`Error modifying user's sites:`, error);
            showSuccessModal("Failed to modify site.");
        }
    };

    const addedList = modalContent.added.length > 0;
    const removedList = modalContent.removed.length > 0;

    return (
        <div className="permission-form">
            <div className="permission-toolbar">
                <div className="toolbar-actions">
                    <button
                        className="admin-btn primary"
                        onClick={(e) => handleModifySites(e)}>
                        저장하기
                    </button>
                    <button
                        className="admin-btn ghost"
                        onClick={() => handleSiteSelection(allSites)}>
                        전체선택
                    </button>
                    <button
                        className="admin-btn ghost"
                        onClick={() => handleSiteSelection([])}>
                        전체 해제
                    </button>
                    <button
                        className="admin-btn ghost"
                        onClick={() => handleSiteSelection(user.sites)}>
                        현재 설정값으로 복귀
                    </button>
                </div>
                <div className="legend">
                    <div className="legend-item">
                        <span className="legend-chip permitted" />
                        <span className="legend-text">권한 있음</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-chip non-permitted" />
                        <span className="legend-text">권한 없음</span>
                    </div>
                </div>
            </div>
            <div className="permission-site-container">
                {allSites.map((site) => {
                    const siteLabel = site.replaceAll("_", " ");
                    const labelLength = siteLabel.length;
                    const labelSizeClass =
                        labelLength > 24 ? "xlong" : labelLength > 16 ? "long" : "";
                    return (
                        <div
                            key={site}
                            onClick={() => handleSiteSelection(site)}
                            className={`permission-site ${labelSizeClass} ${
                                selectedSites.includes(site)
                                    ? "selected"
                                    : "non-selected"
                            }`}>
                            <span className="permission-site__label">
                                {siteLabel}
                            </span>
                        </div>
                    );
                })}
            </div>
            {showModal ? (
                <div className={`admin-modal ${showModal ? "show" : ""}`}>
                    <div className="admin-modal__content">
                        <div className="modal-title">저장 결과</div>
                        <div className="modal-body">
                            {addedList || removedList
                                ? "변경사항이 저장되었습니다."
                                : "변경사항 없음"}
                        </div>
                        {addedList && (
                            <div>
                                <div className="modal-subject">추가</div>
                                <ul>
                                    {modalContent.added.map((site) => (
                                        <li key={site}>{site}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {removedList && (
                            <div>
                                <div className="modal-subject">삭제</div>
                                <ul>
                                    {modalContent.removed.map((site) => (
                                        <li key={site}>{site}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default UserPermission;
