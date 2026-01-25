import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import React, { useMemo } from 'react';
import { WagmiProvider } from 'wagmi';

import { AuthenticationProvider } from '@/components/auth';
import { createCustomAuthenticationAdapter } from '@/lib/auth';
import { wagmiConfig as config } from '@/lib/blockchain';
import { QUERY_CLIENT_CONFIG, RAINBOW_KIT_THEME_CONFIG } from '@/lib/constants/query';

export function Providers({ children }: { children: React.ReactNode }) {
    const { theme } = useTheme();

    const queryClient = useMemo(() => new QueryClient(QUERY_CLIENT_CONFIG), []);

    const rainbowKitTheme = useMemo(() => {
        return theme === 'dark'
            ? darkTheme(RAINBOW_KIT_THEME_CONFIG)
            : lightTheme(RAINBOW_KIT_THEME_CONFIG);
    }, [theme]);

    const authenticationAdapter = useMemo(() => createCustomAuthenticationAdapter(), []);

    if (!config || !config.chains || config.chains.length === 0) {
        return <>{children}</>;
    }

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <AuthenticationProvider authenticationAdapter={authenticationAdapter}>
                    <RainbowKitProvider
                        theme={rainbowKitTheme}
                        modalSize="compact"
                        initialChain={config.chains[0]}
                        showRecentTransactions={true}
                        coolMode={true}
                    >
                        {children}
                    </RainbowKitProvider>
                </AuthenticationProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
