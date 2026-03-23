import { Outlet } from 'react-router-dom';

import { AppSidebar, SiteHeader } from '@/components/layout';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function AppLayout() {
    return (
        <SidebarProvider
            style={
                {
                    '--sidebar-width': '18rem',
                    '--header-height': '3.5rem',
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
