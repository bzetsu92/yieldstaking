import { User, Lock, Bell, LogOut } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDisconnect } from 'wagmi';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { useAuthentication } from '@/hooks/use-authentication';
import { useUserInfo } from '@/hooks/use-user-info';
import { hasAccountAuth } from '@/lib/auth';

import { AccountSettingsModal } from '../../profile/account-settings-modal';
import { ChangePasswordModal } from '../../profile/change-password-modal';
import { MENU_ITEMS } from '../../profile/profile-constants';
import { UserAvatar } from '../../profile/user-avatar';

const TRIGGER_BUTTON_CLASSES =
    'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer border border-muted-foreground/40';

const iconMap = {
    User,
    Lock,
    Bell,
} as const;

export function NavUser() {
    const { isMobile } = useSidebar();
    const navigate = useNavigate();
    const { disconnect } = useDisconnect();
    const { signOut } = useAuthentication();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const userInfo = useUserInfo();

    const displaySubtext = useMemo(() => {
        if (userInfo.role && userInfo.role !== 'GUEST') {
            return userInfo.role;
        }
        return 'USER';
    }, [userInfo.role]);

    const handleMenuClick = useCallback(
        (itemId: string, path: string | null) => {
            if (path) {
                navigate(path);
            } else if (itemId === 'change-password') {
                setIsChangePasswordOpen(true);
            } else if (itemId === 'account') {
                setIsSettingsOpen(true);
            }
        },
        [navigate],
    );

    const handleLogout = useCallback(() => {
        signOut();
        if (!hasAccountAuth()) {
            disconnect();
        }
        navigate('/login');
    }, [navigate, signOut, disconnect]);

    const handleCloseSettings = useCallback(() => {
        setIsSettingsOpen(false);
    }, []);

    const handleCloseChangePassword = useCallback(() => {
        setIsChangePasswordOpen(false);
    }, []);

    const handleItemSelect = useCallback((e: Event) => {
        e.preventDefault();
    }, []);

    return (
        <>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button type="button" className={TRIGGER_BUTTON_CLASSES}>
                                <UserAvatar
                                    avatar={userInfo.avatar}
                                    name={userInfo.name}
                                    size="sm"
                                />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{userInfo.name}</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {displaySubtext}
                                    </span>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-lg"
                            side={isMobile ? 'bottom' : 'top'}
                            align="start"
                            sideOffset={8}
                        >
                            <DropdownMenuLabel className="p-0 font-normal">
                                <div className="flex items-center gap-3 px-2 py-3 text-left text-sm">
                                    <UserAvatar
                                        avatar={userInfo.avatar}
                                        name={userInfo.name}
                                        size="md"
                                    />
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">
                                            {userInfo.name}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {displaySubtext}
                                        </span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                {MENU_ITEMS.map((item: (typeof MENU_ITEMS)[number]) => {
                                    const Icon = iconMap[item.icon];
                                    return (
                                        <DropdownMenuItem
                                            key={item.id}
                                            onClick={() => handleMenuClick(item.id, item.path)}
                                            onSelect={handleItemSelect}
                                            className={
                                                item.id === 'account'
                                                    ? 'border border-border rounded-md my-1'
                                                    : ''
                                            }
                                        >
                                            <Icon className="h-4 w-4" />
                                            {item.label}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} onSelect={handleItemSelect}>
                                <LogOut className="h-4 w-4" />
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>

            {isSettingsOpen && (
                <AccountSettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
            )}
            {isChangePasswordOpen && (
                <ChangePasswordModal
                    isOpen={isChangePasswordOpen}
                    onClose={handleCloseChangePassword}
                />
            )}
        </>
    );
}
