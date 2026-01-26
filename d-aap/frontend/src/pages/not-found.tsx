import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, MapPin, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import mapSvg from '@/assets/map-v5.svg';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-1 flex-col">
            <div className="relative flex min-h-[calc(100vh-var(--header-height))] flex-col overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-orange-50/30 to-amber-50/20 dark:from-red-950/20 dark:via-orange-950/10 dark:to-amber-950/10" />
                
                <div className="absolute inset-0 opacity-10 dark:opacity-5">
                    <img 
                        src={mapSvg} 
                        alt="Map" 
                        className="w-full h-full object-cover"
                        style={{ filter: 'blur(2px)' }}
                    />
                </div>

                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-32 h-32 bg-red-300/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-20 right-10 w-40 h-40 bg-orange-300/20 rounded-full blur-3xl animate-pulse delay-1000" />
                    <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-amber-300/20 rounded-full blur-2xl animate-pulse delay-500" />
                </div>

                <div className="relative z-10 flex flex-1 items-center justify-center p-8 lg:p-12">
                    <div className="w-full max-w-4xl">
                        <div className="grid lg:grid-cols-2 gap-8 items-center">
                            <div className="hidden lg:flex items-center justify-center relative">
                                <div className="relative w-full max-w-md">
                                    <div className="absolute inset-0 animate-pulse">
                                        <div className="absolute inset-0 rounded-full bg-red-300/20 blur-3xl" />
                                        <div className="absolute inset-0 rounded-full bg-orange-300/15 blur-3xl" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="rounded-2xl bg-background/80 backdrop-blur-sm border border-border/50 p-8 shadow-2xl">
                                            <img 
                                                src={mapSvg} 
                                                alt="Map" 
                                                className="w-full h-auto opacity-80 dark:opacity-60"
                                            />
                                        </div>
                                        <div className="absolute -top-4 -right-4 animate-bounce">
                                            <div className="rounded-full bg-destructive/20 p-3 backdrop-blur-sm border border-destructive/30">
                                                <MapPin className="size-6 text-destructive" />
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-4 -left-4 animate-bounce delay-500">
                                            <div className="rounded-full bg-orange-500/20 p-3 backdrop-blur-sm border border-orange-500/30">
                                                <Compass className="size-6 text-orange-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                                <style>
                                    {`
                                        @keyframes floatUp {
                                            0% {
                                                opacity: 0;
                                                transform: translateY(30px);
                                            }
                                            100% {
                                                opacity: 1;
                                                transform: translateY(0);
                                            }
                                        }
                                        @keyframes scaleIn {
                                            0% {
                                                opacity: 0;
                                                transform: scale(0.8);
                                            }
                                            100% {
                                                opacity: 1;
                                                transform: scale(1);
                                            }
                                        }
                                        .error-number {
                                            animation: floatUp 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                                        }
                                        .error-content {
                                            animation: floatUp 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s forwards;
                                            opacity: 0;
                                        }
                                        .error-actions {
                                            animation: floatUp 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s forwards;
                                            opacity: 0;
                                        }
                                    `}
                                </style>

                                <Card className="relative z-10 border-0 shadow-2xl bg-background/90 backdrop-blur-sm w-full">
                                    <CardContent className="flex flex-col items-center lg:items-start p-8 lg:p-12">
                                        <div className="mb-6 relative error-number">
                                            <div className="absolute inset-0 animate-pulse">
                                                <div className="absolute inset-0 rounded-full bg-destructive/20 blur-3xl" />
                                            </div>
                                            <div className="relative z-10">
                                                <h1 className="text-9xl font-bold text-destructive mb-2 leading-none">
                                                    404
                                                </h1>
                                            </div>
                                        </div>

                                        <div className="error-content mb-8 space-y-4">
                                            <h2 className="text-4xl font-bold text-foreground mb-4">
                                                Page Not Found
                                            </h2>
                                            <p className="text-muted-foreground text-lg max-w-md">
                                                Looks like you're lost! The page you're looking for doesn't exist or has been moved. 
                                                Use the map to navigate back home.
                                            </p>
                                        </div>

                                        <div className="error-actions flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                            <Button
                                                onClick={() => navigate('/')}
                                                size="lg"
                                                className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow"
                                            >
                                                <Home className="mr-2 size-5" />
                                                Go Home
                                            </Button>
                                            <Button
                                                onClick={() => navigate(-1)}
                                                variant="outline"
                                                size="lg"
                                                className="w-full sm:w-auto"
                                            >
                                                <ArrowLeft className="mr-2 size-5" />
                                                Go Back
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
