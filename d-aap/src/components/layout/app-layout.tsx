import { Outlet } from 'react-router-dom';

import { AppSidebar, SiteHeader } from '@/components/layout';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function AppLayout() {
    return (
        <SidebarProvider
            style={
                {
                    '--sidebar-width': 'calc(var(--spacing) * 72)',
                    '--header-height': 'calc(var(--spacing) * 12)',
                } as React.CSSProperties
            }
        >
            <AppSidebar />
            <SidebarInset className="flex flex-col h-screen overflow-hidden">
                <SiteHeader />
                <div className="flex-1 overflow-y-auto">
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
