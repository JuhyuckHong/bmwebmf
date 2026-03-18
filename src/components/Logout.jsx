import Cookies from "js-cookie";

function Logout({ setAuth, className = "", icon, label = "Logout", ariaLabel = "Logout", onLogout }) {
    const logout = () => {
        Cookies.remove("BM");
        setAuth(false);
        onLogout?.();
    };

    return (
        <button className={className} onClick={logout} aria-label={ariaLabel}>
            {icon && (
                <span className="menu-item-icon" aria-hidden="true">
                    {icon}
                </span>
            )}
            <span className="menu-item-label">{label}</span>
        </button>
    );
}

export default Logout;
