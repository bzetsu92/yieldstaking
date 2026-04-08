import {
    GalleryVerticalEnd,
    Cpu,
    Home,
    Coins,
    History,
    ArrowDownCircle,
    Gift,
    LayoutDashboard,
    Users,
    Briefcase,
    Repeat,
    Activity,
    Settings2,
} from 'lucide-react';
import * as React from 'react';

import { TeamSwitcher } from '@/components/common';
import { NavMain } from '@/components/layout/nav/nav-main';
import { NavUser } from '@/components/layout/nav/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from '@/components/ui/sidebar';
import { useAuthProfile } from '@/hooks/use-api-queries';

const teams = [
    {
        name: 'Yield Staking',
        logo: GalleryVerticalEnd,
        plan: 'Platform',
    },
];

const userNavItems = [
    {
        title: 'Home',
        url: '/app/aureus',
        icon: Home,
        items: [
            {
                title: 'Yield Staking',
                url: '/app/stake',
                icon: Coins,
            },
            {
                title: 'Stake Assets',
                url: '/app/withdrawals',
                icon: ArrowDownCircle,
            },
            {
                title: 'Stake History',
                url: '/app/stake-history',
                icon: History,
            },
            {
                title: 'Claim History',
                url: '/app/reward-history',
                icon: Gift,
            }
        ]
    }
];

const adminNavItems = [
    {
        title: 'Admin Management',
        url: '/app/management',
        icon: LayoutDashboard,
        items: [
            {
                title: 'Overview',
                url: '/app/management',
                icon: LayoutDashboard,
            },
            {
                title: 'Users',
                url: '/app/management/users',
                icon: Users,
            },
            {
                title: 'Stake Positions',
                url: '/app/management/positions',
                icon: Briefcase,
            },
            {
                title: 'On-chain Transactions',
                url: '/app/management/transactions',
                icon: Repeat,
            },
        ],
    },
    {
        title: 'Blockchain Operations',
        url: '/app/network',
        icon: Cpu,
        items: [
            {
                title: 'Sync Monitor',
                url: '/app/network/monitor',
                icon: Activity,
            },
            {
                title: 'Contract Controls',
                url: '/app/network/setup',
                icon: Settings2,
            },
        ],
    },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { data: profile, isLoading: isProfileLoading } = useAuthProfile();
    const isAdmin = profile?.role === 'ADMIN';

    const navItems = React.useMemo(() => {
        if (isProfileLoading && !profile) {
            return [];
        }

        return isAdmin ? adminNavItems : userNavItems;
    }, [isAdmin, isProfileLoading, profile]);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={teams} homeUrl={isAdmin ? '/app/management' : '/app/aureus'} />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
