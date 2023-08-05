import cookie from "react-cookies"

function Logout({ setAuth }) {
    const logout = () => {
        cookie.remove("BM");
        setAuth(false);
    };

    return (
        <button onClick={logout}>Logout</button>
    );
}

export default Logout
