import { useState, useEffect } from "react";
import { decodeJwt } from "jose";
import cookie from "react-cookies";
import Login from "./components/Login";
import Logout from "./components/Logout";
import AllSites from "./components/AllSites";
import { API } from "./API";
import "./App.css";
import SingleSite from "./components/SingleSite";
import Signup from "./components/Signup";
import PendingUsers from "./components/PendingUsers";
import UserPermission from "./components/UserPermission";

function App() {
    const [auth, setAuth] = useState(false);
    const [site, setSite] = useState(null);
    const [admin, setAdmin] = useState(false);
    const [reload, setReload] = useState(false);
    const [adminToggle, setAdminToggle] = useState(false);
    const [loginToggle, setLoginToggle] = useState(false);

    useEffect(() => {
        const token = cookie.load("BM");
        if (token && decodeJwt(token).exp < parseInt(Date.now() / 1000)) {
            // delete token and
            cookie.remove("BM");
        } else if (token) {
            // if token has not expired, try login
            API.auth({ Authorization: token })
                .then((res) => {
                    const identity = res?.data.identity;
                    if (identity.class === identity.username) setAdmin(true);
                    setAuth(true);
                })
                .catch((err) => console.log("error in auth", err));
        } else {
            setAuth(false);
            setAdmin(false);
        }
    }, [auth]);

    const handleAdminToggle = () => setAdminToggle((prev) => !prev);
    // 회원가입 ↔ 로그인
    const handleLoginToggle = () => setLoginToggle((prev) => !prev);

    return (
        <>
            {auth ? (
                <div className="user">
                    <Logout setAuth={setAuth} />
                    <span>&nbsp;</span>
                    {admin && (
                        <button onClick={handleAdminToggle}>
                            {adminToggle ? "User" : "Admin"}
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="landing">
                        {loginToggle ? (
                            <Login
                                setAuth={setAuth}
                                handleLoginToggle={handleLoginToggle}
                            />
                        ) : (
                            <Signup handleLoginToggle={handleLoginToggle} />
                        )}
                    </div>
                </>
            )}

            <div className="display">
                {auth && !adminToggle ? (
                    site ? (
                        <SingleSite site={site} setSite={setSite} />
                    ) : (
                        <AllSites setSite={setSite} reload={reload} />
                    )
                ) : (
                    ""
                )}
            </div>
            <div>{auth && adminToggle && <PendingUsers />}</div>
            <div>
                {auth && adminToggle && (
                    <UserPermission reload={reload} setReload={setReload} />
                )}
            </div>
        </>
    );
}

export default App;
