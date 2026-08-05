import React from 'react';
import { Home, FileText, LayoutTemplate, User } from 'lucide-react';
import type { DashboardTab } from '../Dashboard';

interface BottomTabBarProps {
    active: DashboardTab;
    onChange: (tab: DashboardTab) => void;
}

const TABS: { id: DashboardTab; label: string; Icon: typeof Home }[] = [
    { id: 'dashboard', label: 'Home', Icon: Home },
    { id: 'resumes', label: 'Resumes', Icon: FileText },
    { id: 'templates', label: 'Templates', Icon: LayoutTemplate },
    { id: 'profile', label: 'Profile', Icon: User },
];

/** Root tab bar for the mobile shell — replaces the hamburger-triggered
 *  sidebar drawer as the primary way to move between the four main areas. */
const BottomTabBar: React.FC<BottomTabBarProps> = ({ active, onChange }) => (
    <nav className="pb-safe flex shrink-0 border-t border-border bg-white/95 backdrop-blur-md">
        {TABS.map(({ id, label, Icon }) => {
            const isActive = active === id;
            return (
                <button
                    key={id}
                    type="button"
                    onClick={() => onChange(id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`tap-target flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 ${isActive ? 'text-primary' : 'text-gray-400'}`}
                >
                    <Icon size={23} strokeWidth={isActive ? 2 : 1.75} />
                    <span className="text-[10.5px] font-semibold">{label}</span>
                </button>
            );
        })}
    </nav>
);

export default BottomTabBar;
