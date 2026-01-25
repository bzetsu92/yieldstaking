import { RainbowKitAuthenticationProvider } from '@rainbow-me/rainbowkit';
import React from 'react';

import { useAuthentication } from '@/hooks/use-authentication';

import type { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';

interface AuthenticationProviderProps {
    children: React.ReactNode;
    authenticationAdapter: ReturnType<typeof createAuthenticationAdapter>;
}

export function AuthenticationProvider({
    children,
    authenticationAdapter,
}: AuthenticationProviderProps) {
    const { status } = useAuthentication();

    return (
        <RainbowKitAuthenticationProvider adapter={authenticationAdapter} status={status}>
            {children}
        </RainbowKitAuthenticationProvider>
    );
}
