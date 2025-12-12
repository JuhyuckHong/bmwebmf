import Cookies from "js-cookie";

function Logout({ setAuth, className = "", icon, ariaLabel = "Logout" }) {
    const logout = () => {
        Cookies.remove("BM");
        setAuth(false);
    };

    return (
        <button className={className} onClick={logout} aria-label={ariaLabel}>
            {icon && (
                <span className="btn-icon" aria-hidden="true">
                    {icon}
                </span>
            )}
            <span className="btn-label">Logout</span>
        </button>
    );
}

export default Logout;
