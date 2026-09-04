import React from 'react';
import { Home, FileText, LayoutTemplate, User } from 'lucide-react';
import type { DashboardTab } from '../Dashboard';
import { useTranslation } from '../../services/translationService';

interface BottomTabBarProps {
    active: DashboardTab;
    onChange: (tab: DashboardTab) => void;
}

const TABS: { id: DashboardTab; key: string; label: string; Icon: typeof Home }[] = [
    { id: 'dashboard', key: 'tabbar.home', label: 'Home', Icon: Home },
    { id: 'resumes', key: 'tabbar.resumes', label: 'Resumes', Icon: FileText },
    { id: 'templates', key: 'tabbar.templates', label: 'Templates', Icon: LayoutTemplate },
    { id: 'profile', key: 'tabbar.profile', label: 'Profile', Icon: User },
];

/** Root tab bar for the mobile shell — replaces the hamburger-triggered
 *  sidebar drawer as the primary way to move between the four main areas. */
const BottomTabBar: React.FC<BottomTabBarProps> = ({ active, onChange }) => {
    const { t } = useTranslation();
    return (
        <nav className="pb-safe flex shrink-0 border-t border-border bg-white/95 backdrop-blur-md">
            {TABS.map(({ id, key, label, Icon }) => {
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
                        <span className="text-[10.5px] font-semibold">{t(key, label)}</span>
                    </button>
                );
            })}
        </nav>
    );
};

export default BottomTabBar;
