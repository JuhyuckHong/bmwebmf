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
    return (
        <>
            <div className="user-permission-container">
                <hr />
                <div className="label">권한 설정</div>
                <select
                    id="user-select"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}>
                    <option value="" disabled>
                        사용자를 선택하세요.
                    </option>
                    {users
                        .filter((user) => user.activate)
                        .map((user) => (
                            <option key={user.username} value={user.username}>
                                {user.username}
                            </option>
                        ))}
                </select>

                {users
                    .filter((user) => user.username === selectedUser)
                    .map((user) => {
                        return (
                            <>
                                <div className="permission-userinfo">{`이름: ${user.username}`}</div>
                                <div className="permission-userinfo">{`가입코드: ${user.code}`}</div>
                                <ModifySiteForm
                                    username={user.username}
                                    user={user}
                                    setReload={setReload}
                                    allSites={allSites}
                                />
                            </>
                        );
                    })}
            </div>
            <div>
                <UserDeactivateDelete users={users} setReload={setReload} />
            </div>
        </>
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

    return (
        <>
            <hr />
            <div className="label">사용자 설정</div>
            <div className="user-state-container">
                {users
                    .filter((user) => user.username !== user.class)
                    .map((user) => (
                        <div
                            key={user.username}
                            className={`user-state ${
                                user.activate ? "activated" : "deactivated"
                            }`}>
                            <div className="user-state-status">{`${
                                user.activate
                                    ? "[Activated User]"
                                    : "[Deactivated User]"
                            }`}</div>
                            <div className="user-state-text">
                                아이디: {user.username}
                            </div>
                            <div className="user-state-text">
                                가입코드: {user.code}
                            </div>
                            {user.activate ? (
                                <div
                                    className="deactivated-button"
                                    onClick={() =>
                                        handleDeactivateUser(user.username)
                                    }>
                                    비활성화
                                </div>
                            ) : (
                                <div className="deactivated-user-container">
                                    <div
                                        className="activated-button"
                                        onClick={() =>
                                            handleActivateUser(user.username)
                                        }>
                                        활성화
                                    </div>
                                    <div
                                        className="delete-button"
                                        onClick={() =>
                                            handleDeleteUser(user.username)
                                        }>
                                        삭제
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
            </div>
            <hr />
        </>
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

    return (
        <>
            <hr />
            <div className="permission-title">
                <button
                    className="permission-submit"
                    onClick={(e) => handleModifySites(e)}>
                    저장하기
                </button>
            </div>
            <div className="example-container">
                <div className="permission-title">표시:</div>
                <div className="example permitted ">권한 있는 현장</div>
                <span>&nbsp;</span>
                <div className="example non-permitted">권한 없는 현장</div>
            </div>
            <div className="permission-title">
                <button
                    className="permission-select-all"
                    onClick={() => handleSiteSelection(allSites)}>
                    전체선택
                </button>
                <button
                    className="permission-unselect-all"
                    onClick={() => handleSiteSelection([])}>
                    전체 해제
                </button>
                <button
                    className="permission-initial"
                    onClick={() => handleSiteSelection(user.sites)}>
                    현재 권한 설정값으로 복귀
                </button>
            </div>
            <div className="permission-site-container">
                {allSites.map((site) => {
                    return (
                        <div
                            key={site}
                            onClick={() => handleSiteSelection(site)}
                            className={`permission-site ${
                                selectedSites.includes(site)
                                    ? "selected"
                                    : "non-selected"
                            }`}>
                            {site.replaceAll("_", " ")}
                        </div>
                    );
                })}
            </div>
            <hr />
            {showModal ? (
                <div className={`modal ${showModal ? "show" : ""}`}>
                    <div className="modal-content">
                        <div>
                            {modalContent.added.length
                                ? "저장되었습니다."
                                : modalContent.removed.length
                                ? "저장되었습니다."
                                : "변경사항 없음"}
                        </div>
                        <div>
                            {modalContent.added.length ? (
                                <>
                                    <div className="modal-subject">추가:</div>
                                    <ul>
                                        {modalContent.added.map((site) => (
                                            <li key={site}>{site}</li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                ""
                            )}
                        </div>
                        <div>
                            {modalContent.removed.length ? (
                                <>
                                    <div className="modal-subject">삭제:</div>
                                    <ul>
                                        {modalContent.removed.map((site) => (
                                            <li key={site}>{site}</li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                ""
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}

export default UserPermission;
