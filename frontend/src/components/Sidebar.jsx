import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, BriefcaseMedicalIcon, HomeIcon, SearchIcon } from "lucide-react";

const Sidebar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const currentPath = location.pathname;

  // Generate full name from first and last name
  const fullName = `${authUser?.firstName || ''} ${authUser?.lastName || ''}`.trim() || 'User';

  return (
    <aside className="w-64 bg-base-200 border-r border-base-300 hidden lg:flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-base-300">
        <Link to="/" className="flex items-center gap-2.5">
          <BriefcaseMedicalIcon className="size-9 text-primary" />
          <span className="text-primary text-3xl font-bold font-mono tracking-wider">
            MedConnect
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <Link
          to="/"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${currentPath === "/" ? "btn-active" : ""
            }`}
        >
          <HomeIcon className="size-5 text-base-content opacity-70" />
          <span>Home</span>
        </Link>

        <Link
          to="/search"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${currentPath === "/search" ? "btn-active" : "" // Fixed: was checking for /friends
            }`}
        >
          <SearchIcon className="size-5 text-base-content opacity-70" />
          <span>Search</span>
        </Link>

        <Link
          to="/notifications"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${currentPath === "/notifications" ? "btn-active" : ""
            }`}
        >
          <BellIcon className="size-5 text-base-content opacity-70" />
          <span>Notifications</span>
        </Link>
      </nav>

      {/* USER PROFILE SECTION */}
      <Link to={"/profile"} className="btn btn-ghost w-full justify-start normal-case h-auto min-h-0 p-0 hover:bg-base-200">
        <div className="p-4 border-t border-base-300 w-full">
          <div className="flex items-center gap-3">
            <div className="avatar">
              <div className="w-10 rounded-full">
                {authUser?.profilePic ? (
                  <img src={authUser.profilePic} alt="User Avatar" />
                ) : (
                  <div className="bg-base-300 w-10 h-10 rounded-full flex items-center justify-center">
                    <span className="text-sm">👤</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">{fullName}</p>
              <p className="text-xs text-success flex items-center gap-1">
                <span className="size-2 rounded-full bg-success inline-block" />
                Online
              </p>
            </div>
          </div>
        </div>
      </Link>
    </aside>
  );
};

export default Sidebar;