import Cookies from "js-cookie";

function Logout({ setAuth }) {
    const logout = () => {
        Cookies.remove("BM");
        setAuth(false);
    };

    return <button onClick={logout}>Logout</button>;
}

export default Logout;
