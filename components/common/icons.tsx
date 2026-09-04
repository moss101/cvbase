
import React from 'react';
import {
    Link2Off, CircleCheck, CircleAlert, TriangleAlert, CircleX, LayoutDashboard, KeyRound,
    Waypoints, Rows3, ListChecks, Wand2, CloudCheck, FileUp, ClipboardPaste, Radar, Sparkles,
    IdCard, Building2, MapPin, Calendar, CalendarDays, Sun, Moon, Contrast,
    Globe, CircleUserRound, Palette, Database,
} from 'lucide-react';

// lucide-react doesn't export its shared props type, so mirror the bits we use.
type LucideProps = React.SVGProps<SVGSVGElement> & { size?: string | number; strokeWidth?: string | number };

// Name -> component map for glyph names that arrive as data (config arrays,
// computed fields) rather than literal JSX. Keys are the original Material
// Symbols glyph names so call sites didn't need to change their data shape.
const ICON_MAP = {
    link_off: Link2Off,
    check_circle: CircleCheck,
    error: CircleAlert,
    warning: TriangleAlert,
    cancel: CircleX,
    dashboard: LayoutDashboard,
    key: KeyRound,
    conversion_path: Waypoints,
    segment: Rows3,
    rule: ListChecks,
    auto_fix_high: Wand2,
    cloud_done: CloudCheck,
    upload_file: FileUp,
    content_paste: ClipboardPaste,
    radar: Radar,
    auto_awesome: Sparkles,
    badge: IdCard,
    business: Building2,
    location_on: MapPin,
    calendar_today: Calendar,
    event: CalendarDays,
    light_mode: Sun,
    dark_mode: Moon,
    contrast: Contrast,
    language: Globe,
    account_circle: CircleUserRound,
    palette: Palette,
    database: Database,
} as const satisfies Record<string, React.ComponentType<LucideProps>>;

export type IconName = keyof typeof ICON_MAP;

/**
 * Renders a lucide icon looked up by name. Use this only where the glyph
 * name comes from data (a config array, a computed field) — literal icon
 * usages should import the lucide component directly instead.
 */
export const Icon: React.FC<{ name: string } & LucideProps> = ({ name, ...props }) => {
    const Cmp = (ICON_MAP as Record<string, React.ComponentType<LucideProps>>)[name];
    if (!Cmp) return null;
    return <Cmp {...props} />;
};

const iconProps = {
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.5,
    stroke: "currentColor",
    className: "w-5 h-5"
};

export const ContactIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A1.875 1.875 0 0 1 17.624 22H6.375a1.875 1.875 0 0 1-1.875-1.882Z" />
    </svg>
);

export const SummaryIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

export const ExperienceIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.02a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18.17V14.15M20.25 14.15v-4.02a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 10.13v4.02m16.5 0H3.75" />
    </svg>
);

export const ProjectsIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
);

export const EducationIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
);

export const SkillsIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.629.507-1.137 1.137-1.137h1.5a1.137 1.137 0 0 1 1.137 1.137v1.5c0 .629-.507 1.137-1.137 1.137h-1.5a1.137 1.137 0 0 1-1.137-1.137v-1.5Zm0 7.5c0-.629.507-1.137 1.137-1.137h1.5a1.137 1.137 0 0 1 1.137 1.137v1.5c0 .629-.507 1.137-1.137 1.137h-1.5a1.137 1.137 0 0 1-1.137-1.137v-1.5Zm-7.5 0c0-.629.507-1.137 1.137-1.137h1.5a1.137 1.137 0 0 1 1.137 1.137v1.5c0 .629-.507 1.137-1.137 1.137h-1.5a1.137 1.137 0 0 1-1.137-1.137v-1.5Zm-3.363-3.363a1.137 1.137 0 0 1 1.137-1.137h1.5a1.137 1.137 0 0 1-1.137-1.137v1.5a1.137 1.137 0 0 1-1.137-1.137h-1.5a1.137 1.137 0 0 1-1.137-1.137v-1.5Z" />
    </svg>
);

export const CertificationsIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

export const FinalizeIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 12.75 1.148-.957a.64.64 0 0 1 .704 0l1.148.957m-4.246 4.95-.976-.976a.64.64 0 0 1 0-.905l4.246-4.246a.64.64 0 0 1 .905 0l4.246 4.246a.64.64 0 0 1 0 .905l-.976.976" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 12.75 1.148-.957a.64.64 0 0 1 .704 0l1.148.957M15 12.75l-1.148-.957a.64.64 0 0 0-.704 0L12 12.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 15a.64.64 0 0 1 .64-.64h15.22a.64.64 0 0 1 .64.64v3.36a.64.64 0 0 1-.64.64H4.39a.64.64 0 0 1-.64-.64V15Z" />
    </svg>
);

export const WandIcon = () => (
    <svg {...iconProps} className="w-4 h-4 mr-2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.475 2.118 3.375 3.375 0 0 0-.917 4.255 3 3 0 0 0 4.242 0l1.06-1.06c.453-.453.82-1.012 1.03-1.616l.21.21a2.25 2.25 0 0 0 3.182 0l2.121-2.121a2.25 2.25 0 0 0 0-3.182l-1.06-1.061a2.25 2.25 0 0 0-1.894-.872Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12.75a3.375 3.375 0 0 0 0-4.773 3.375 3.375 0 0 0-4.773 0l-.527.527c-.283.283-.418.664-.418 1.06 0 .396.135.777.418 1.06l.527.527a3.375 3.375 0 0 0 4.773 0Z" />
    </svg>
);

export const SparklesIcon = () => (
    <svg {...iconProps} strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-1.813-2.846a4.5 4.5 0 0 0-6.38-6.38L.75 9l2.846-1.813a4.5 4.5 0 0 0 6.38-6.38L15 2.25l-2.846 1.813a4.5 4.5 0 0 0-6.38 6.38ZM12 3.75l2.121 2.121a3.375 3.375 0 0 0 4.773 0l2.121-2.121M12 12l2.121 2.121a3.375 3.375 0 0 0 4.773 0l2.121-2.121" />
    </svg>
);

export const CheckIcon = () => (
    <svg {...iconProps} className="w-4 h-4" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
);

export const AtsIcon = () => (
     <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M10.5 12v6.75a1.5 1.5 0 0 0 1.5 1.5h1.5a1.5 1.5 0 0 0 1.5-1.5V12M10.5 12V4.5a1.5 1.5 0 0 0-1.5-1.5H3.75a1.5 1.5 0 0 0-1.5 1.5v15a1.5 1.5 0 0 0 1.5 1.5h3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.5 6.75 3 3-3 3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 9.75h-6" />
    </svg>
);

export const LanguagesIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C13.18 7.061 14.287 7.5 15.5 7.5c1.213 0 2.32-.439 3.166-1.136m0 0V3m-3.166 1.136c.846.697 1.953 1.136 3.166 1.136 1.213 0 2.32-.439 3.166-1.136M3 21v-1.5A2.25 2.25 0 0 1 5.25 17.25h13.5A2.25 2.25 0 0 1 21 19.5V21" />
    </svg>
);

export const AwardIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.961 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.962 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
    </svg>
);

export const TrainingIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
);

export const PublicationIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
);

export const VolunteerIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
);

export const CustomIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.475 2.118 3.375 3.375 0 0 0-.917 4.255 3 3 0 0 0 4.242 0l1.06-1.06c.453-.453.82-1.012 1.03-1.616l.21.21a2.25 2.25 0 0 0 3.182 0l2.121-2.121a2.25 2.25 0 0 0 0-3.182l-1.06-1.061a2.25 2.25 0 0 0-1.894-.872Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12.75a3.375 3.375 0 0 0 0-4.773 3.375 3.375 0 0 0-4.773 0l-.527.527c-.283.283-.418.664-.418 1.06 0 .396.135.777.418 1.06l.527.527a3.375 3.375 0 0 0 4.773 0Z" />
    </svg>
);

export const CustomizeIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
    </svg>
);

export const HomeIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
);

export const DocumentIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
);

export const TemplateIcon = () => (
    <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
);

// Icons for Rich Text Editor
export const BoldIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg {...iconProps} className={className || "w-5 h-5"} viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5h4.5a3.5 3.5 0 110 7H8m0-7v7m0 7h5a3.5 3.5 0 100-7H8v7z" />
    </svg>
);

export const ItalicIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg {...iconProps} className={className || "w-5 h-5"} viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 4h6M9 20h6M12 4l-4 16" />
    </svg>
);

export const UnderlineIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg {...iconProps} className={className || "w-5 h-5"} viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 4v7a6 6 0 0012 0V4M4 20h16" />
    </svg>
);

export const ListBulletIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg {...iconProps} className={className || "w-5 h-5"} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM3.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM3.75 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
);

export const ListNumberedIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg {...iconProps} className={className || "w-5 h-5"} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h11M9 12h11M9 18h11M4.5 6H6M4.5 12H6m-1.5 6H6M4.5 18v-2m0 0v-2m0 2h.75a.75.75 0 00.75-.75V15a.75.75 0 00-.75-.75H4.5M3 12h1.5M3 6h1.5" />
    </svg>
);
