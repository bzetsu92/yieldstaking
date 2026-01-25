import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useMetaColor } from '@/hooks/use-meta-color';
import { publicEnv } from '@/lib/config';

export function ModeSwitcher() {
    const { setTheme, resolvedTheme } = useTheme();
    const { setMetaColor } = useMetaColor();

    const toggleTheme = React.useCallback(() => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
        setMetaColor(
            resolvedTheme === 'dark' ? publicEnv.THEME_COLOR_LIGHT : publicEnv.THEME_COLOR_DARK,
        );
    }, [resolvedTheme, setTheme, setMetaColor]);

    return (
        <Button
            variant="ghost"
            size="icon"
            className="group/toggle h-9 w-9 border border-border/50 hover:border-border"
            onClick={toggleTheme}
        >
            <SunIcon className="h-4 w-4 hidden [html.dark_&]:block transition-all" />
            <MoonIcon className="h-4 w-4 hidden [html.light_&]:block transition-all" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
