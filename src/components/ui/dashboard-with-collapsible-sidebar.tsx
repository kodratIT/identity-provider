"use client"
import React, { useState, useEffect } from "react";
import {
  Home,
  Monitor,
  Users,
  ChevronDown,
  ChevronsRight,
  Moon,
  Sun,
  TrendingUp,
  Activity,
  Bell,
  Settings,
  HelpCircle,
  User,
  Building2,
  Shield,
  Key,
  FileText,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  children?: React.ReactNode;
}

export const DashboardWithCollapsibleSidebar = ({ children }: SidebarProps) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className={`flex min-h-screen w-full ${isDark ? 'dark' : ''}`}>
      <div className="flex w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Sidebar />
        <MainContent isDark={isDark} setIsDark={setIsDark}>
          {children}
        </MainContent>
      </div>
    </div>
  );
};

interface Option {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  href: string;
  notifs?: number;
}

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState("Dashboard");

  // Main navigation items
  const mainNavigation: Option[] = [
    { Icon: Home, title: "Dashboard", href: "/dashboard" },
    { Icon: Users, title: "Users", href: "/users", notifs: 3 },
    { Icon: Building2, title: "Tenants", href: "/tenants" },
    { Icon: Shield, title: "Roles & Permissions", href: "/roles" },
    { Icon: Key, title: "Applications", href: "/applications" },
    { Icon: Monitor, title: "Sessions", href: "/sessions" },
    { Icon: FileText, title: "Audit Logs", href: "/audit-logs" },
  ];

  // Account navigation items
  const accountNavigation: Option[] = [
    { Icon: User, title: "Profile", href: "/profile" },
    { Icon: Settings, title: "Settings", href: "/settings" },
    { Icon: HelpCircle, title: "Help & Support", href: "/help" },
  ];

  // Super admin navigation (conditional)
  const superAdminNavigation: Option[] = [
    { Icon: ShieldCheck, title: "Super Admin", href: "/admin" },
  ];

  return (
    <nav
      className={`sticky top-0 h-screen shrink-0 border-r transition-all duration-300 ease-in-out ${
        open ? 'w-64' : 'w-16'
      } border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm`}
    >
      <TitleSection open={open} />

      {/* Super Admin Section */}
      <div className="mb-2">
        {superAdminNavigation.map((item) => (
          <OptionItem
            key={item.title}
            Icon={item.Icon}
            title={item.title}
            href={item.href}
            selected={selected}
            setSelected={setSelected}
            open={open}
            notifs={item.notifs}
            isSuperAdmin={true}
          />
        ))}
      </div>

      {open && (
        <div className="border-b border-gray-200 dark:border-gray-800 mb-2"></div>
      )}

      {/* Main Navigation */}
      <div className="space-y-1 mb-8">
        {mainNavigation.map((item) => (
          <OptionItem
            key={item.title}
            Icon={item.Icon}
            title={item.title}
            href={item.href}
            selected={selected}
            setSelected={setSelected}
            open={open}
            notifs={item.notifs}
          />
        ))}
      </div>

      {/* Account Section */}
      {open && (
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-1">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Account
          </div>
          {accountNavigation.map((item) => (
            <OptionItem
              key={item.title}
              Icon={item.Icon}
              title={item.title}
              href={item.href}
              selected={selected}
              setSelected={setSelected}
              open={open}
            />
          ))}
        </div>
      )}

      <ToggleClose open={open} setOpen={setOpen} />
    </nav>
  );
};

interface OptionItemProps {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  href: string;
  selected: string;
  setSelected: (title: string) => void;
  open: boolean;
  notifs?: number;
  isSuperAdmin?: boolean;
}

const OptionItem = ({ Icon, title, href, selected, setSelected, open, notifs, isSuperAdmin }: OptionItemProps) => {
  const isSelected = selected === title;
  
  return (
    <a
      href={href}
      onClick={() => setSelected(title)}
      className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
        isSuperAdmin
          ? isSelected
            ? "bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 shadow-sm border-l-2 border-red-500"
            : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
          : isSelected 
            ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm border-l-2 border-blue-500" 
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
      }`}
    >
      <div className="grid h-full w-12 place-content-center">
        <Icon className="h-4 w-4" />
      </div>
      
      {open && (
        <span
          className={`text-sm font-medium transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {title}
        </span>
      )}

      {notifs && open && (
        <span className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 dark:bg-blue-600 text-xs text-white font-medium">
          {notifs}
        </span>
      )}
    </a>
  );
};

const TitleSection = ({ open }: { open: boolean }) => {
  return (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
        <div className="flex items-center gap-3">
          <Logo />
          {open && (
            <div className={`transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-2">
                <div>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Identity Provider
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    School Ecosystem
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {open && (
          <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
      </div>
    </div>
  );
};

const Logo = () => {
  return (
    <div className="grid size-10 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
      <Building2 className="h-5 w-5 text-white" />
    </div>
  );
};

const ToggleClose = ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
  return (
    <button
      onClick={() => setOpen(!open)}
      className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <div className="flex items-center p-3">
        <div className="grid size-10 place-content-center">
          <ChevronsRight
            className={`h-4 w-4 transition-transform duration-300 text-gray-500 dark:text-gray-400 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
        {open && (
          <span
            className={`text-sm font-medium text-gray-600 dark:text-gray-300 transition-opacity duration-200 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Hide
          </span>
        )}
      </div>
    </button>
  );
};

interface MainContentProps {
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
  children?: React.ReactNode;
}

const MainContent = ({ isDark, setIsDark, children }: MainContentProps) => {
  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-end gap-4">
          <button className="relative p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
          </button>
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <button className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default DashboardWithCollapsibleSidebar;
