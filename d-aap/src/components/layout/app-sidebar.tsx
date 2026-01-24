import { GalleryVerticalEnd, Home, Search, Sparkles, Calendar } from 'lucide-react';
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

const data = {
    teams: [
        {
            name: 'Acme Inc',
            logo: GalleryVerticalEnd,
            plan: 'Enterprise',
        },
    ],
    navMain: [
        {
            title: 'Home',
            url: '/dashboard',
            icon: Home,
            items: [],
        },
        {
            title: 'Wrap & Unwrap',
            url: '/wrap',
            icon: Search,
            items: [],
        },
        {
            title: 'Yield Staking',
            url: '/yield-staking',
            icon: Sparkles,
            items: [
                {
                    title: 'Stake',
                    url: '/stake',
                },
                {
                    title: 'Withdrawals',
                    url: '/withdrawals',
                },
                {
                    title: 'Reward History',
                    url: '/reward-history',
                },
            ],
        },
        {
            title: 'Earn',
            url: '/earn',
            icon: Calendar,
            items: [
                
            ],
        },
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={data.teams} />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
