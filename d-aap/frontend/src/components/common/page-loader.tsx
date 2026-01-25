export const PageLoader = () => (
    <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <div className="text-muted-foreground">Loading...</div>
        </div>
    </div>
);
