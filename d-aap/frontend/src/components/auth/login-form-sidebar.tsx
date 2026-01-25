import { Wallet } from 'lucide-react';

export function LoginFormSidebar() {
    return (
        <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 relative hidden md:block overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="relative h-full w-full flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                        <Wallet className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Welcome to AUR</h2>
                    <p className="text-white/80 text-sm max-w-xs">
                        Connect your wallet to start staking AUR tokens and earn passive rewards with competitive APY
                    </p>
                </div>
            </div>
        </div>
    );
}
