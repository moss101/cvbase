import React from 'react';
import { Ellipsis } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { useNavigation, type CareerRoute } from '../../NavigationProvider';
import BottomSheet from '../../mobile/BottomSheet';
import { ACCOUNT_SPACES, LEGACY_TOOL_SPACES, MOBILE_TABS, PRIMARY_SPACES, UTILITY_SPACES, activeSpaceKey, type SpaceDescriptor } from './spaces';

interface MobileTabBarProps {
    route: CareerRoute;
    onOpenMore: () => void;
    moreActive: boolean;
}

/** Today, Opportunities, Coach, Campaigns, More — the mobile bottom bar. */
export const CareerTabBar: React.FC<MobileTabBarProps> = ({ route, onOpenMore, moreActive }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const active = activeSpaceKey(route);
    const item = (key: string, label: string, Icon: SpaceDescriptor['Icon'], isActive: boolean, onClick: () => void) => (
        <button
            key={key}
            type="button"
            onClick={onClick}
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
            className={`tap-target flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 ${isActive ? 'text-action-primary' : 'text-content-muted'}`}
        >
            <Icon size={23} strokeWidth={isActive ? 2 : 1.75} aria-hidden="true" />
            {/* Below 360px five labels cannot sit side by side; the icons carry it and the name stays accessible. */}
            <span className="max-w-full truncate px-0.5 text-[10.5px] font-semibold max-[359px]:sr-only" aria-hidden="true">{label}</span>
        </button>
    );
    return (
        <nav className="pb-safe flex shrink-0 border-t border-border-default bg-surface-panel" aria-label={t('careeros.nav.primary', 'Career OS navigation')}>
            {MOBILE_TABS.map((tab) => item(tab.key, t(tab.labelKey, tab.label), tab.Icon, active === tab.key && !moreActive, () => navigate(tab.route)))}
            {item('more', t('careeros.nav.more', 'More'), Ellipsis, moreActive || !MOBILE_TABS.some((tab) => tab.key === active), onOpenMore)}
        </nav>
    );
};

interface MoreSheetProps {
    open: boolean;
    onClose: () => void;
    isAdmin: boolean;
    unreadCount?: number;
}

/** More: Career, Library, utilities, tools, settings, integrations, help and admin. */
export const MoreSheet: React.FC<MoreSheetProps> = ({ open, onClose, isAdmin, unreadCount = 0 }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const go = (item: SpaceDescriptor) => { onClose(); navigate(item.route); };
    const Row: React.FC<{ item: SpaceDescriptor; badge?: number }> = ({ item, badge }) => (
        <button type="button" onClick={() => go(item)} className="tap-target flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14px] font-semibold text-dark transition active:bg-light">
            <item.Icon size={20} strokeWidth={1.75} aria-hidden="true" className="text-gray-500" />
            <span className="flex-1">{t(item.labelKey, item.label)}</span>
            {badge ? <span className="rounded-full bg-ember px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span> : null}
        </button>
    );
    const Group: React.FC<{ title: string; items: SpaceDescriptor[] }> = ({ title, items }) => (
        <section className="mb-2">
            <h3 className="px-3 pb-1 pt-2 text-[12px] font-medium text-content-muted">{title}</h3>
            {items.filter((i) => !i.adminOnly || isAdmin).map((item) => (
                <Row key={item.key} item={item} badge={item.key === 'notifications' ? unreadCount : undefined} />
            ))}
        </section>
    );
    return (
        <BottomSheet isOpen={open} onClose={onClose} title={t('careeros.nav.more', 'More')}>
            <div className="px-1 pb-2">
                <Group title={t('careeros.nav.spaces', 'Spaces')} items={[PRIMARY_SPACES[1], PRIMARY_SPACES[5]]} />
                <Group title={t('careeros.nav.utilities', 'Utilities')} items={UTILITY_SPACES} />
                <Group title={t('careeros.nav.workspaces', 'Workspaces')} items={LEGACY_TOOL_SPACES} />
                <Group title={t('dash.libraryAndAccount', 'Library & account')} items={ACCOUNT_SPACES} />
            </div>
        </BottomSheet>
    );
};
