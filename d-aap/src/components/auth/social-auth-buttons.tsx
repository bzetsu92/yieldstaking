import { memo } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getGoogleAuthUrl } from '@/lib/api/auth';

interface SocialAuthButtonsProps {
    isLoading: boolean;
    isSigningMessage: boolean;
    onSignIn?: () => void | Promise<void>;
}

const buttonClassName = "w-full bg-white hover:bg-blue-50 dark:bg-gray-900 dark:hover:bg-blue-950 border-2 border-blue-200 hover:border-blue-400 dark:border-blue-700 dark:hover:border-blue-500 text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 transition-colors duration-200";

export const SocialAuthButtons = memo(function SocialAuthButtons({
    isLoading,
    isSigningMessage,
}: SocialAuthButtonsProps) {
    const disabled = isLoading || isSigningMessage;

    const handleGoogleAuth = () => {
        const url = getGoogleAuthUrl();
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            window.location.href = url;
        }
    };

    return (
        <>
            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                    Or continue with
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <ConnectButton.Custom>
                    {({ account, chain, openConnectModal, authenticationStatus, mounted }) => {
                        const ready = mounted && authenticationStatus !== 'loading';
                        const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

                        if (connected) {
                            return (
                                <Button
                                    variant="outline"
                                    type="button"
                                    className={buttonClassName}
                                    disabled={disabled}
                                    onClick={openConnectModal}
                                >
                                    <Wallet className="h-4 w-4" />
                                    <span>Wallet</span>
                                </Button>
                            );
                        }

                        return (
                            <Button
                                variant="outline"
                                type="button"
                                className={buttonClassName}
                                disabled={disabled}
                                onClick={openConnectModal}
                            >
                                <Wallet className="h-4 w-4" />
                                <span>Connect Wallet</span>
                            </Button>
                        );
                    }}
                </ConnectButton.Custom>

                <Button
                    variant="outline"
                    type="button"
                    className={buttonClassName}
                    disabled={disabled}
                    onClick={handleGoogleAuth}
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    <span>Google</span>
                </Button>
            </div>
        </>
    );
});
