import { ChevronRight, type LucideIcon } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';

export function NavMain({
    items,
}: {
    items: {
        title: string;
        url: string;
        icon?: LucideIcon;
        isActive?: boolean;
        items?: {
            title: string;
            url: string;
        }[];
    }[];
}) {
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;

    // Local state for which items are open.
    // Initialize only the items that match the current pathname.
    const [openItems, setOpenItems] = useState<Record<string, boolean>>(() => {
        const initialOpen: Record<string, boolean> = {};
        items.forEach((item) => {
            const sectionActive =
                item.isActive ||
                pathname === item.url ||
                (item.items?.some((s) => pathname === s.url || pathname.startsWith(`${s.url}/`)) ?? false);
            if (sectionActive) {
                initialOpen[item.title] = true;
            }
        });
        return initialOpen;
    });

    // When the user navigates, if they go to a new section, open it.
    useEffect(() => {
        setOpenItems((prev) => {
            const nextOpen = { ...prev };
            let changed = false;
            items.forEach((item) => {
                const sectionActive =
                    item.isActive ||
                    pathname === item.url ||
                    (item.items?.some((s) => pathname === s.url || pathname.startsWith(`${s.url}/`)) ?? false);
                
                // If the section is active but not open, open it.
                if (sectionActive && !prev[item.title]) {
                    nextOpen[item.title] = true;
                    changed = true;
                }
            });
            return changed ? nextOpen : prev;
        });
    }, [pathname, items]);

    const handleNavigate = useCallback(
        (url: string) => {
            navigate(url);
        },
        [navigate],
    );

    const toggleItem = (title: string) => {
        setOpenItems((prev) => ({
            ...prev,
            [title]: !prev[title],
        }));
    };

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Platform Management</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const sectionActive =
                        item.isActive ||
                        pathname === item.url ||
                        (item.items?.some((s) => pathname === s.url || pathname.startsWith(`${s.url}/`)) ?? false);
                    const hasSubItems = item.items && item.items.length > 0;
                    const isOpen = !!openItems[item.title];

                    if (hasSubItems) {
                        return (
                            <Collapsible
                                key={item.title}
                                asChild
                                open={isOpen}
                                onOpenChange={() => toggleItem(item.title)}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            isActive={sectionActive}
                                        >
                                            {item.icon && <item.icon />}
                                            <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {item.items?.map((subItem) => {
                                                const isActive =
                                                    pathname === subItem.url ||
                                                    pathname.startsWith(`${subItem.url}/`);
                                                return (
                                                    <SidebarMenuSubItem key={subItem.title}>
                                                        <SidebarMenuSubButton
                                                            isActive={isActive}
                                                            onClick={() =>
                                                                handleNavigate(subItem.url)
                                                            }
                                                        >
                                                            <span>{subItem.title}</span>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                );
                                            })}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        );
                    }

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                tooltip={item.title}
                                isActive={sectionActive}
                                onClick={() => handleNavigate(item.url)}
                            >
                                {item.icon && <item.icon />}
                                <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
