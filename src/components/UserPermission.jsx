import { useEffect, useState } from "react";
import { API } from "../API";
import cookie from "react-cookies";

function UserPermission({ reload, setReload }) {
    const [users, setUsers] = useState([]);
    const [allSites, setAllSites] = useState([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const resUsers = await API.allUsers({
                    Authorization: cookie.load("BM"),
                });
                setUsers(resUsers.data);

                const resSites = await API.allSites({
                    Authorization: cookie.load("BM"),
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
        <div className="user-permission-container">
            <hr />
            <form>
                <label for="user-select">권한 설정:</label>
                <select
                    id="user-select"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}>
                    <option value="" disabled>
                        사용자를 선택하세요.
                    </option>
                    {users.map((user) => (
                        <option key={user.username} value={user.username}>
                            {user.username}
                        </option>
                    ))}
                </select>
            </form>

            {users
                .filter((user) => user.username === selectedUser)
                .map((user) => {
                    if (user.username === user.class)
                        return (
                            <div
                                key={user.username}
                                className="permission-admin">
                                <div className="permission-userinfo">{`${user.username}은(는) 관리자입니다.`}</div>
                                <div className="permission-userinfo">
                                    관리계정은 전체 현장 조회 권한을 가집니다.
                                </div>
                                <hr />
                            </div>
                        );
                    else {
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
                    }
                })}
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
                    Authorization: cookie.load("BM"),
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
