import React from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useSettings } from "../contexts/SettingsContext.tsx";

export default function Layout() {
  const { user, logout } = useAuth();
  const { getSetting } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { name: "Schedules", href: "/schedules", icon: "calendar_month" },
    { name: "Leave", href: "/leaves", icon: "event_busy" },
    { name: "Overtime", href: "/overtime", icon: "schedule" },
    {
      name: "Users",
      href: "/users",
      icon: "admin_panel_settings",
      roles: ["ADMIN"],
    },
    {
      name: "Timesheets",
      href: "/timesheets",
      icon: "receipt_long",
      roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
    },
    {
      name: "Contractors",
      href: "/employees",
      icon: "groups",
      roles: ["ADMIN"],
    },
    {
      name: "Teams",
      href: "/teams",
      icon: "group_work",
      roles: ["ADMIN", "MANAGER", "TEAM_LEADER"],
    },
    {
      name: "Access Control",
      href: "/rbac",
      icon: "security",
      roles: ["ADMIN"],
    },
    { name: "Settings", href: "/settings", icon: "settings", roles: ["ADMIN"] },
  ];

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  });

  const currentPage = filteredNavigation.find(
    (item) =>
      location.pathname === item.href ||
      (item.href !== "/" && location.pathname.startsWith(item.href)),
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md">
        <div className="flex justify-between items-center px-8 h-16 w-full">
          <div className="flex items-center gap-8">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-stone-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-stone-600">
                menu
              </span>
            </button>
            <span className="text-xl font-bold tracking-tighter text-red-700 uppercase">
              {getSetting("company.name") || "TEAM MANAGEMENT"}
            </span>
            {/* Search bar */}
            <div className="hidden md:flex items-center bg-stone-100 rounded-full px-4 py-1.5 gap-2">
              <span className="material-symbols-outlined text-stone-500 text-sm">
                search
              </span>
              <input
                className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-64 placeholder:text-stone-400"
                placeholder="Search..."
                type="text"
              />
            </div>
          </div>

          {/* Top nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {filteredNavigation.slice(0, 4).map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== "/" && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-red-700 font-semibold border-b-2 border-red-700"
                      : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-stone-100 transition-colors duration-200 rounded-full">
              <span className="material-symbols-outlined text-stone-600">
                notifications
              </span>
            </button>
            <Link
              to="/settings"
              className="p-2 hover:bg-stone-100 transition-colors duration-200 rounded-full"
            >
              <span className="material-symbols-outlined text-stone-600">
                settings
              </span>
            </Link>
            <div className="h-8 w-8 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white text-sm font-bold">
              {user?.fullName?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </div>
        <div className="bg-stone-100 h-[1px] w-full"></div>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Side Navigation */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-stone-50 flex-col py-8 px-4 gap-6 pt-24 z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0 flex"
            : "-translate-x-full lg:flex hidden lg:block"
        }`}
      >
        <div className="px-4 mb-4">
          <h2 className="text-lg font-black text-red-700 uppercase tracking-widest">
            Management
          </h2>
          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">
            Admin Console
          </p>
        </div>

        <nav className="flex flex-col gap-1">
          {filteredNavigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm tracking-wide uppercase transition-all duration-300 ${
                  isActive
                    ? "text-red-700 bg-stone-200/50 border-r-4 border-red-700"
                    : "text-stone-600 hover:text-red-700 hover:translate-x-1"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-stone-200 pt-6">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
              {user?.fullName?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">
                {user?.fullName}
              </p>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">
                {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-stone-600 hover:text-red-700 hover:translate-x-1 transition-all duration-300 font-medium text-sm tracking-wide uppercase"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64 pt-16 min-h-screen">
        <main className="max-w-[1200px] mx-auto p-8 lg:p-12">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-stone-100 flex justify-around items-center h-16 px-4 z-50">
        {filteredNavigation.slice(0, 4).map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center gap-1 ${
                isActive ? "text-red-700" : "text-stone-400"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
