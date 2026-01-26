import { GalleryVerticalEnd, Home, Sparkles, Shield } from 'lucide-react';
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
        title: 'Yield Staking',
        url: '/app/aureus',
        icon: Sparkles,
        items: [
            {
                title: 'Stake',
                url: '/app/aureus',
            },
            {
                title: 'Withdrawals',
                url: '/app/aureus/withdrawals',
            },
            {
                title: 'Reward History',
                url: '/app/aureus/reward-history',
            },
        ],
    },
];

const adminNavItems = [
    {
        title: 'Admin',
        url: '/app/admin',
        icon: Shield,
        items: [
            {
                title: 'Dashboard',
                url: '/app/admin',
            },
            {
                title: 'Users',
                url: '/app/admin/users',
            },
            {
                title: 'Contracts',
                url: '/app/admin/contracts',
            },
            {
                title: 'Positions',
                url: '/app/admin/positions',
            },
            {
                title: 'Transactions',
                url: '/app/admin/transactions',
            },
            {
                title: 'Blockchain',
                url: '/app/admin/blockchain',
            },
        ],
    },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { data: profile } = useAuthProfile();
    const isAdmin = profile?.role === 'ADMIN';

    const navItems = React.useMemo(() => {
        if (isAdmin) {
            return [...userNavItems, ...adminNavItems];
        }
        return userNavItems;
    }, [isAdmin]);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={teams} />
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
