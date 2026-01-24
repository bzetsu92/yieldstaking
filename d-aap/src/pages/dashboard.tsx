import { Lock, Eye, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
    return (
        <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col">
                <div className="relative flex min-h-[calc(100vh-var(--header-height))] flex-col overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 via-pink-50/30 to-white dark:from-purple-950/20 dark:via-pink-950/10 dark:to-background" />
                    
                    <div className="relative z-10 flex flex-1 flex-col lg:flex-row">
                        <div className="flex flex-1 items-center justify-center p-8 lg:p-12">
                            <div className="relative">
                                <div className="relative">
                                    <div className="absolute inset-0 animate-pulse">
                                        <div className="absolute inset-0 rounded-full bg-yellow-300/25 blur-3xl" />
                                        <div className="absolute inset-0 rounded-full bg-amber-300/20 blur-3xl" />
                                    </div>
                                    
                                    <div className="relative z-10">
                                        <style>
                                            {`
                                                @keyframes floatInCenter {
                                                    0% {
                                                        opacity: 0;
                                                        transform: translateY(30px) scale(0.8);
                                                    }
                                                    100% {
                                                        opacity: 1;
                                                        transform: translateY(0) scale(1);
                                                    }
                                                }
                                                @keyframes floatInMiddle {
                                                    0% {
                                                        opacity: 0;
                                                        transform: translateX(-40px) rotate(-10deg);
                                                    }
                                                    100% {
                                                        opacity: 1;
                                                        transform: translateX(0) rotate(0deg);
                                                    }
                                                }
                                                @keyframes floatInOuter {
                                                    0% {
                                                        opacity: 0;
                                                        transform: translateY(-50px) rotate(10deg);
                                                    }
                                                    100% {
                                                        opacity: 1;
                                                        transform: translateY(0) rotate(0deg);
                                                    }
                                                }
                                                .diamond-center {
                                                    animation: floatInCenter 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                                                    animation-delay: 0.2s;
                                                    opacity: 0;
                                                    transform-origin: center;
                                                }
                                                .diamond-middle {
                                                    animation: floatInMiddle 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                                                    animation-delay: 0.8s;
                                                    opacity: 0;
                                                    transform-origin: center;
                                                }
                                                .diamond-outer {
                                                    animation: floatInOuter 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                                                    animation-delay: 1.4s;
                                                    opacity: 0;
                                                    transform-origin: center;
                                                }
                                            `}
                                        </style>
                                        <svg
                                            width="400"
                                            height="400"
                                            viewBox="0 0 200 200"
                                            className="drop-shadow-xl"
                                        >
                                            <path
                                                d="M100 20 L180 100 L100 180 L20 100 Z"
                                                fill="#F6D365"
                                                className="diamond-outer"
                                                fillOpacity="0.85"
                                            />
                                            <path
                                                d="M100 50 L150 100 L100 150 L50 100 Z"
                                                fill="#D4A84B"
                                                className="diamond-middle"
                                                fillOpacity="0.9"
                                            />
                                            <path
                                                d="M100 75 L125 100 L100 125 L75 100 Z"
                                                fill="#B8860B"
                                                className="diamond-center"
                                                fillOpacity="0.95"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-1 items-center justify-center p-8 lg:p-12">
                            <div className="w-full max-w-2xl space-y-8">
                                <div className="space-y-2">
                                    <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
                                        Simple staking with
                                    </h1>
                                    <h1 className="text-5xl font-bold tracking-tight text-primary lg:text-6xl">
                                    AUR
                                    </h1>
                                </div>

                                <p className="text-lg text-muted-foreground">
                                    Empowering and securing AUR since 2026
                                </p>

                                <div className="flex flex-wrap items-end gap-8">
                                    <div className="space-y-1">
                                        <div className="text-3xl font-bold lg:text-4xl">2.4%</div>
                                        <div className="text-sm text-muted-foreground">APR*</div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="text-3xl font-bold lg:text-4xl">
                                            $27,692,621,897
                                        </div>
                                        <div className="text-sm text-muted-foreground">TVL**</div>
                                    </div>

                                    <Button variant="outline" className="rounded-full px-6 group">
                                    Staking with
                                    <span className="font-bold">AUR</span>
                                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                                        </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="relative py-20 px-8 lg:px-12">
                    <div className="mx-auto max-w-7xl">
                        <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-8">
                            The Most Performant Node<br />
                            Operator Set at Scale
                        </h2>

                        <div className="grid lg:grid-cols-5 gap-8">
                            <div className="lg:col-span-3">
                                <h3 className="text-xl font-semibold mb-2">Geographical diversity</h3>
                                <p className="text-sm text-muted-foreground mb-6">Curated & Simple DVT modules</p>
                                
                                    <img 
                                        src="/map-v5.svg" 
                                        alt="Geographical diversity map" 
                                        className="w-full h-full object-contain"
                                    />
                            </div>

                            <div className="lg:col-span-2">
                                <Card className="h-full bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-0 shadow-lg">
                                    <CardContent className="p-8 space-y-8">
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">Aureus Validator Set Performance</p>
                                            <p className="text-3xl font-bold">97.35%</p>
                                            <p className="text-sm text-muted-foreground mt-1">Network performance 96.70%.</p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">Node Operators</p>
                                            <p className="text-3xl font-bold">800+</p>
                                            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                                A vast array of independent Node Operators, from professionals to home stakers, use the Aureus protocol via permissioned and permissionless modules.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Governance Section */}
                <div className="relative py-24 px-8 lg:px-12 overflow-hidden">
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-pink-50/50 to-amber-50/30 dark:from-purple-950/30 dark:via-pink-950/20 dark:to-amber-950/10" />
                    
                    <div className="relative mx-auto max-w-6xl">
                        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
                            {/* Left Side - DAO Info */}
                            <div className="lg:w-2/5 flex-shrink-0">
                                <div className="relative inline-block">
                                    {/* Top-left corner */}
                                    <span className="absolute -top-2 -left-4 text-2xl text-muted-foreground/40 font-light">┌</span>
                                    {/* Bottom-left corner */}
                                    <span className="absolute -bottom-2 -left-4 text-2xl text-muted-foreground/40 font-light">└</span>
                                    
                                    <div className="pl-4">
                                        <p className="text-[11px] tracking-[0.35em] text-muted-foreground mb-5">GOVERNED BY</p>
                                        <h2 className="text-[4rem] lg:text-[5rem] font-black tracking-tighter leading-[0.85] mb-6">
                                            AUREUS<br />DAO
                                        </h2>
                                    </div>
                                </div>
                                
                                <p className="text-[11px] tracking-[0.2em] text-muted-foreground/70 leading-relaxed mt-8">
                                    MISSION-DRIVEN<br />
                                    DECENTRALIZED<br />
                                    ORGANIZATION
                                </p>
                            </div>

                            {/* Right Side - Features */}
                            <div className="lg:w-3/5 space-y-12">
                                {/* Non-custodial */}
                                <div className="flex gap-5 items-start">
                                    <div className="w-12 h-12 rounded-full bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                                        <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-semibold mb-3">Non-custodial</h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            Aureus protocol's design ensures no one can access or control stakers' funds
                                        </p>
                                    </div>
                                </div>

                                {/* Transparent */}
                                <div className="flex gap-5 items-start">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-300/40 to-purple-300/40 flex items-center justify-center flex-shrink-0">
                                        <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-semibold mb-3">Transparent</h3>
                                        <p className="text-muted-foreground leading-relaxed mb-5">
                                            Key decisions require public votes by AUR token holders, ensuring accountability to both users and the wider community
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-5 items-start">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-300/40 to-pink-300/40 flex items-center justify-center flex-shrink-0">
                                        <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-semibold mb-3">Resilient</h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            Whether it is governance, geographic/jurisdictional diversity, or node software, Aureus ecosystem participants are always pushing to make the protocol more resilient
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
