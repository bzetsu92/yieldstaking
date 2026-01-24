import React from 'react';
import { useAccount } from 'wagmi';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { WalletBalance, ChainSwitcher, WalletDisplay } from '@/components/wallet';

import { ModeSwitcher } from './mode-switcher';

function SiteHeaderComponent() {
    const { isConnected } = useAccount();

    return (
        <header className="sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) shadow-sm">
            <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
                <div className="flex items-center gap-1 lg:gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mx-2 data-[orientation=vertical]:h-4"
                    />
                    <ModeSwitcher />
                </div>
                <div className="flex items-center gap-2">
                    {isConnected ? (
                        <>
                            <ChainSwitcher />
                            <WalletBalance />
                        </>
                    ) : (
                        <WalletDisplay />
                    )}
                </div>
            </div>
        </header>
    );
}

export const SiteHeader = React.memo(SiteHeaderComponent);
