import React from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.tsx";
import api from "../services/api.ts";

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [quote, setQuote] = React.useState<{ text: string; author: string } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    api
      .get<{ text: string; author: string }>("/quotes/daily")
      .then((res) => {
        if (!cancelled) setQuote(res.data);
      })
      .catch(() => {
        /* keep the fallback line below */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  interface NavChild {
    name: string;
    href: string;
    roles?: string[];
  }

  interface NavItem {
    name: string;
    href: string;
    icon: string;
    roles?: string[];
    children?: NavChild[];
  }

  const navigation: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { name: "Schedules", href: "/schedules", icon: "calendar_month" },
    {
      name: "Leave",
      href: "/leaves",
      icon: "event_busy",
      children: [
        { name: "Personal Leave", href: "/leaves" },
        { name: "Company Leave", href: "/leaves/monitor", roles: ["ADMIN", "MANAGER", "TEAM_LEADER"] },
      ],
    },
    { name: "Overtime", href: "/overtime", icon: "schedule" },
    {
      name: "Employees",
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
    {
      name: "Activity Log",
      href: "/activity",
      icon: "history",
      roles: ["ADMIN", "MANAGER"],
    },
    { name: "Settings", href: "/settings", icon: "settings", roles: ["ADMIN"] },
  ];

  const filteredNavigation = navigation
    .map((item) =>
      item.children
        ? {
            ...item,
            children: item.children.filter(
              (child) => !child.roles || (user?.role && child.roles.includes(user.role)),
            ),
          }
        : item,
    )
    .filter((item) => {
      if (item.roles && !(user?.role && item.roles.includes(user.role))) return false;
      if (item.children && item.children.length === 0) return false;
      return true;
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
              className="lg:hidden p-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-zinc-600">
                menu
              </span>
            </button>
            <img
              src="/omnitask-logo.png"
              alt="OMNITASK"
              className="h-8 w-auto"
            />
            {/* Search bar */}
            <div className="hidden md:flex items-center bg-zinc-100 rounded-full px-4 py-1.5 gap-2">
              <span className="material-symbols-outlined text-zinc-500 text-sm">
                search
              </span>
              <input
                className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-64 placeholder:text-zinc-400"
                placeholder="Search..."
                type="text"
              />
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-zinc-100 transition-colors duration-200 rounded-full">
              <span className="material-symbols-outlined text-zinc-600">
                notifications
              </span>
            </button>
            <Link
              to="/settings"
              className="p-2 hover:bg-zinc-100 transition-colors duration-200 rounded-full"
            >
              <span className="material-symbols-outlined text-zinc-600">
                settings
              </span>
            </Link>
            <div className="h-8 w-8 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white text-sm font-bold">
              {user?.fullName?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </div>
        <div className="bg-zinc-100 h-[1px] w-full"></div>
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
        className={`fixed left-0 top-0 h-full w-64 bg-zinc-50 flex-col py-8 px-4 gap-4 pt-24 lg:pt-28 z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0 flex"
            : "-translate-x-full lg:flex hidden lg:block"
        }`}
      >
        <div className="px-4 mb-4">
          <div className="inline-block max-w-full">
            <h2 className="text-lg font-black text-violet-700 uppercase tracking-widest">
              Workday Hub
            </h2>
            <p className="mt-1 w-full text-center text-[10px] text-zinc-500 font-bold uppercase tracking-[0.18em]">
              Time, Leave &amp; Teams
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {filteredNavigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <React.Fragment key={item.name}>
                <Link
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm tracking-wide uppercase transition-all duration-300 ${
                    isActive
                      ? "text-violet-700 bg-zinc-200/50 border-r-4 border-violet-700"
                      : "text-zinc-600 hover:text-violet-700 hover:translate-x-1"
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
                {item.children?.map((child) => {
                  const childActive = location.pathname === child.href;
                  return (
                    <Link
                      key={child.name}
                      to={child.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center pl-12 pr-4 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-colors duration-200 ${
                        childActive
                          ? "text-violet-700 bg-zinc-200/40"
                          : "text-zinc-500 hover:text-violet-700 hover:bg-zinc-100"
                      }`}
                    >
                      {child.name}
                    </Link>
                  );
                })}
              </React.Fragment>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-zinc-200 pt-6">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
              {user?.fullName?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">
                {user?.fullName}
              </p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-600 hover:text-violet-700 hover:translate-x-1 transition-all duration-300 font-medium text-sm tracking-wide uppercase"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64 pt-16 min-h-screen">
        <main className="max-w-[1200px] mx-auto p-6 lg:p-8">
          {/* Quote of the Day (changes daily, same for everyone) */}
          <div className="bg-primary/5 border border-primary/15 rounded-xl px-6 py-4 mb-6">
            <p className="text-[9px] font-bold text-primary/70 uppercase tracking-[0.2em] mb-1">
              Quote of the Day
            </p>
            <p className="font-bold text-primary tracking-tight">
              &ldquo;{quote?.text ?? 'A small update today saves a big correction later.'}&rdquo;
              {quote?.author ? (
                <span className="font-medium text-primary/80"> &mdash; {quote.author}</span>
              ) : null}
            </p>
          </div>
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-zinc-100 flex justify-around items-center h-16 px-4 z-50">
        {filteredNavigation.slice(0, 4).map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center gap-1 ${
                isActive ? "text-violet-700" : "text-zinc-400"
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
