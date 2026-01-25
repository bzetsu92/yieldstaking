interface LoginFormHeaderProps {
    isLoading: boolean;
    isSigningMessage: boolean;
}

export function LoginFormHeader({ isLoading, isSigningMessage }: LoginFormHeaderProps) {
    const getStatusMessage = () => {
        if (isSigningMessage) return 'Signing message in wallet...';
        if (isLoading) return 'Logging you in...';
        return '';
    };

    return (
        <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold">AUR</h1>
            <p className="text-muted-foreground text-balance">{getStatusMessage()}</p>
        </div>
    );
}
