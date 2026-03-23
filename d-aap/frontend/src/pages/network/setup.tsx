import * as React from 'react';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { ExternalLink, Pause, Play, Database, Wallet, Coins, Package, TrendingUp, Settings, Plus, ArrowDownToLine } from 'lucide-react';
import { parseUnits, formatUnits } from 'viem';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAdminContracts, useAdminBlockchainActions } from '@/hooks';
import { toast } from 'sonner';
import { AdminWalletGuard } from '@/components/auth/admin-wallet-guard';

import type { StakingContractAdmin } from '@/interfaces/admin';

function formatAmount(amount: string, decimals: number = 6): string {
    const value = Number(BigInt(amount)) / Math.pow(10, decimals);
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals > 6 ? 2 : 4 }).format(value);
}

interface PackagesTableProps {
    packages: any[];
    stakeTokenDecimals: number;
    stakeTokenSymbol: string;
    onUpdatePackage: (pkg: any) => void;
}

function PackagesTable({ packages, stakeTokenDecimals, stakeTokenSymbol, onUpdatePackage }: PackagesTableProps) {
    const formatLockPeriod = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        return `${days} days`;
    };

    const columns: ColumnDef<any>[] = React.useMemo(() => [
        {
            accessorKey: 'packageId',
            header: 'Package ID',
            cell: ({ row }) => `#${row.original.packageId}`,
        },
        {
            accessorKey: 'lockPeriod',
            header: 'Lock Period',
            cell: ({ row }) => formatLockPeriod(row.original.lockPeriod),
        },
        {
            accessorKey: 'apy',
            header: 'APY',
            cell: ({ row }) => (
                <span className="text-green-600 dark:text-green-400 font-medium">
                    {(row.original.apy / 100).toFixed(1)}%
                </span>
            ),
        },
        {
            accessorKey: 'totalStaked',
            header: 'Total Staked',
            cell: ({ row }) => (
                <span className="font-mono">
                    {formatAmount(row.original.totalStaked, 18)} {'AUR'}
                </span>
            ),
        },
        {
            accessorKey: 'stakersCount',
            header: 'Stakers',
            cell: ({ row }) => row.original.stakersCount,
        },
        {
            accessorKey: 'isEnabled',
            header: 'Status',
            cell: ({ row }) => (
                row.original.isEnabled ? (
                    <Badge className="bg-green-500">Enabled</Badge>
                ) : (
                    <Badge variant="outline">Disabled</Badge>
                )
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onUpdatePackage(row.original)}
                >
                    <Settings className="w-4 h-4" />
                </Button>
            ),
        },
    ], [stakeTokenDecimals, stakeTokenSymbol, onUpdatePackage]);

    const table = useReactTable({
        data: packages,
        columns: columns as ColumnDef<any, any>[],
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 5,
            },
        },
    });

    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-lg">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef.header,
                                                  header.getContext(),
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-16 text-center text-muted-foreground">
                                    No packages found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {packages.length > 5 && (
                <div className="flex items-center justify-end gap-2">
                    <div className="text-sm text-muted-foreground">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <IconChevronLeft className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <IconChevronRight className="size-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function NetworkSetupPage() {
    const { data: contracts, isLoading } = useAdminContracts();
    const { pause, unpause, setPackage, setMinStakeAmount, setMaxStakePerUser, setMaxTotalStakedPerPackage, withdrawExcessReward, isWritePending } = useAdminBlockchainActions();
    
    const [selectedContract, setSelectedContract] = React.useState<StakingContractAdmin | null>(null);
    const [isPackageDialogOpen, setIsPackageDialogOpen] = React.useState(false);
    const [isMinStakeDialogOpen, setIsMinStakeDialogOpen] = React.useState(false);
    const [isMaxStakeDialogOpen, setIsMaxStakeDialogOpen] = React.useState(false);
    
    const [packageForm, setPackageForm] = React.useState({
        id: 0,
        lockPeriodDays: 90,
        apyBasisPoints: 2000,
        enabled: true
    });

    const [isMaxTotalDialogOpen, setIsMaxTotalDialogOpen] = React.useState(false);
    const [isWithdrawRewardDialogOpen, setIsWithdrawRewardDialogOpen] = React.useState(false);

    const [minStakeValue, setMinStakeValue] = React.useState('500');
    const [maxStakeValue, setMaxStakeValue] = React.useState('0');
    const [maxTotalValue, setMaxTotalValue] = React.useState('0');
    const [withdrawRewardValue, setWithdrawRewardValue] = React.useState('');

    const handleUpdatePackage = (pkg: any) => {
        setPackageForm({
            id: pkg.packageId,
            lockPeriodDays: Math.floor(pkg.lockPeriod / 86400),
            apyBasisPoints: pkg.apy,
            enabled: pkg.isEnabled
        });
        setIsPackageDialogOpen(true);
    };

    const onSetPackageSubmit = async () => {
        if (!selectedContract) return;
        try {
            const lockPeriod = BigInt(packageForm.lockPeriodDays) * 86400n;
            await setPackage(packageForm.id, lockPeriod, packageForm.apyBasisPoints, packageForm.enabled);
            setIsPackageDialogOpen(false);
            toast.success('Package update transaction sent');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update package');
        }
    };

    const onSetMinStakeSubmit = async () => {
        if (!selectedContract) return;
        try {
            const amount = parseUnits(minStakeValue, selectedContract.stakeTokenDecimals);
            await setMinStakeAmount(amount);
            setIsMinStakeDialogOpen(false);
            toast.success('Min stake update transaction sent');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update minimum stake');
        }
    };

    const onSetMaxStakeSubmit = async () => {
        if (!selectedContract) return;
        try {
            const amount = parseUnits(maxStakeValue, selectedContract.stakeTokenDecimals);
            await setMaxStakePerUser(amount);
            setIsMaxStakeDialogOpen(false);
            toast.success('Max stake update transaction sent');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update maximum stake');
        }
    };

    const onSetMaxTotalSubmit = async () => {
        if (!selectedContract) return;
        try {
            const amount = parseUnits(maxTotalValue, selectedContract.stakeTokenDecimals);
            await setMaxTotalStakedPerPackage(amount);
            setIsMaxTotalDialogOpen(false);
            toast.success('Max total per package update transaction sent');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update max total per package');
        }
    };

    const onWithdrawRewardSubmit = async () => {
        if (!selectedContract) return;
        try {
            const amount = parseUnits(withdrawRewardValue, selectedContract.rewardTokenDecimals);
            await withdrawExcessReward(amount);
            setIsWithdrawRewardDialogOpen(false);
            toast.success('Withdraw excess reward transaction sent');
        } catch (err: any) {
            toast.error(err.message || 'Failed to withdraw excess reward');
        }
    };

    const handleTogglePause = async (contract: StakingContractAdmin) => {
        try {
            if (contract.isPaused) {
                await unpause();
                toast.success('Unpause transaction sent');
            } else {
                await pause();
                toast.success('Pause transaction sent');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to toggle pause');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Yield Staking</h1>
                    <p className="text-muted-foreground">Configure staking parameters and packages</p>
                </div>
            </div>

            {contracts?.map((contract) => (
                <Card key={contract.id} onClick={() => setSelectedContract(contract)} className={selectedContract?.id === contract.id ? 'ring-2 ring-primary' : ''}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    {contract.chain.name}
                                    {contract.isPaused ? (
                                        <Badge variant="destructive" className="gap-1">
                                            <Pause className="w-3 h-3" /> Paused
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-green-500 gap-1">
                                            <Play className="w-3 h-3" /> Active
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <code>{contract.address}</code>
                                    <a
                                        href={`https://sepolia.etherscan.io/address/${contract.address}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:opacity-80"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </CardDescription>
                            </div>
                            <AdminWalletGuard fallback={null}>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedContract(contract);
                                            setMinStakeValue(formatUnits(BigInt(contract.minStakeAmount || '0'), contract.stakeTokenDecimals));
                                            setIsMinStakeDialogOpen(true);
                                        }}
                                    >
                                        Min Stake
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedContract(contract);
                                            // @ts-ignore
                                            setMaxStakeValue(formatUnits(BigInt(contract.maxStakePerUser || '0'), contract.stakeTokenDecimals));
                                            setIsMaxStakeDialogOpen(true);
                                        }}
                                    >
                                        Max/User
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedContract(contract);
                                            // @ts-ignore
                                            setMaxTotalValue(formatUnits(BigInt(contract.maxTotalStakedPerPackage || '0'), contract.stakeTokenDecimals));
                                            setIsMaxTotalDialogOpen(true);
                                        }}
                                    >
                                        Max/Package
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedContract(contract);
                                            setWithdrawRewardValue('');
                                            setIsWithdrawRewardDialogOpen(true);
                                        }}
                                    >
                                        <ArrowDownToLine className="w-3 h-3 mr-1" />
                                        Withdraw Reward
                                    </Button>
                                    <Button 
                                        variant={contract.isPaused ? "default" : "destructive"}
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTogglePause(contract);
                                        }}
                                        disabled={isWritePending}
                                    >
                                        {contract.isPaused ? 'Unpause' : 'Pause'}
                                    </Button>
                                </div>
                            </AdminWalletGuard>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="flex items-center gap-3 p-4 rounded-lg border">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <Wallet className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Total Liquidity</div>
                                    <div className="text-xl font-bold">
                                        {formatAmount(contract.totalLocked, 18)} {contract.stakeTokenSymbol}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 rounded-lg border">
                                <div className="p-2 rounded-lg bg-green-500/10">
                                    <Coins className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Total Rewards</div>
                                    <div className="text-xl font-bold">
                                        {formatAmount(contract.totalRewardDebt, contract.rewardTokenDecimals)} {contract.rewardTokenSymbol}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 rounded-lg border">
                                <div className="p-2 rounded-lg bg-purple-500/10">
                                    <Package className="h-5 w-5 text-purple-500" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Min Stake</div>
                                    <div className="text-xl font-bold">
                                        {formatAmount(contract.minStakeAmount, contract.stakeTokenDecimals)} {contract.rewardTokenSymbol}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 rounded-lg border">
                                <div className="p-2 rounded-lg bg-orange-500/10">
                                    <TrendingUp className="h-5 w-5 text-orange-500" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Positions</div>
                                    <div className="text-xl font-bold">{contract._count.stakePositions}</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold">Staking Packages</h4>
                                <AdminWalletGuard fallback={null}>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 gap-1"
                                        onClick={() => {
                                            setSelectedContract(contract);
                                            setPackageForm({
                                                id: contract.packages.length,
                                                lockPeriodDays: 90,
                                                apyBasisPoints: 2000,
                                                enabled: true
                                            });
                                            setIsPackageDialogOpen(true);
                                        }}
                                    >
                                        <Plus className="w-3 h-3" /> Add Package
                                    </Button>
                                </AdminWalletGuard>
                            </div>
                            <PackagesTable 
                                packages={contract.packages}
                                stakeTokenDecimals={contract.stakeTokenDecimals}
                                stakeTokenSymbol={contract.stakeTokenSymbol}
                                onUpdatePackage={(pkg) => {
                                    setSelectedContract(contract);
                                    handleUpdatePackage(pkg);
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>
            ))}

            {/* Package Update Dialog */}
            <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Staking Package</DialogTitle>
                        <DialogDescription>
                            Configure the lock period and APY for package #{packageForm.id}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="days">Lock Period (Days)</Label>
                            <Input 
                                id="days" 
                                type="number" 
                                value={packageForm.lockPeriodDays}
                                onChange={(e) => setPackageForm({...packageForm, lockPeriodDays: parseInt(e.target.value)})}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="apy">APY (Basis Points: 1000 = 10%)</Label>
                            <Input 
                                id="apy" 
                                type="number" 
                                value={packageForm.apyBasisPoints}
                                onChange={(e) => setPackageForm({...packageForm, apyBasisPoints: parseInt(e.target.value)})}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox 
                                id="enabled" 
                                checked={packageForm.enabled}
                                onCheckedChange={(checked) => setPackageForm({...packageForm, enabled: !!checked})}
                            />
                            <Label htmlFor="enabled">Enabled</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPackageDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onSetPackageSubmit} disabled={isWritePending}>
                            {isWritePending ? 'Processing...' : 'Send Transaction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Min Stake Dialog */}
            <Dialog open={isMinStakeDialogOpen} onOpenChange={setIsMinStakeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Minimum Stake Amount</DialogTitle>
                        <DialogDescription>
                            Current token decimals: {selectedContract?.stakeTokenDecimals}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="minAmount">Minimum Amount ({selectedContract?.stakeTokenSymbol})</Label>
                            <Input 
                                id="minAmount" 
                                type="number" 
                                value={minStakeValue}
                                onChange={(e) => setMinStakeValue(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMinStakeDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onSetMinStakeSubmit} disabled={isWritePending}>
                            {isWritePending ? 'Processing...' : 'Send Transaction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Max Stake Dialog */}
            <Dialog open={isMaxStakeDialogOpen} onOpenChange={setIsMaxStakeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Maximum Stake Per User</DialogTitle>
                        <DialogDescription>
                            Set 0 for unlimited. Current token decimals: {selectedContract?.stakeTokenDecimals}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="maxAmount">Maximum Amount ({selectedContract?.stakeTokenSymbol})</Label>
                            <Input 
                                id="maxAmount" 
                                type="number" 
                                value={maxStakeValue}
                                onChange={(e) => setMaxStakeValue(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMaxStakeDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onSetMaxStakeSubmit} disabled={isWritePending}>
                            {isWritePending ? 'Processing...' : 'Send Transaction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isMaxTotalDialogOpen} onOpenChange={setIsMaxTotalDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Max Total Staked Per Package</DialogTitle>
                        <DialogDescription>
                            Set 0 for unlimited. Applies to each package individually.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="maxTotal">Maximum Amount ({selectedContract?.stakeTokenSymbol})</Label>
                            <Input
                                id="maxTotal"
                                type="number"
                                value={maxTotalValue}
                                onChange={(e) => setMaxTotalValue(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMaxTotalDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onSetMaxTotalSubmit} disabled={isWritePending}>
                            {isWritePending ? 'Processing...' : 'Send Transaction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Withdraw Excess Reward Dialog */}
            <Dialog open={isWithdrawRewardDialogOpen} onOpenChange={setIsWithdrawRewardDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Withdraw Excess Reward</DialogTitle>
                        <DialogDescription>
                            Withdraw reward tokens not needed to pay future rewards. Current reward token: {selectedContract?.rewardTokenSymbol}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="withdrawAmount">Amount ({selectedContract?.rewardTokenSymbol})</Label>
                            <Input
                                id="withdrawAmount"
                                type="number"
                                placeholder="0.00"
                                value={withdrawRewardValue}
                                onChange={(e) => setWithdrawRewardValue(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsWithdrawRewardDialogOpen(false)}>Cancel</Button>
                        <Button onClick={onWithdrawRewardSubmit} disabled={isWritePending || !withdrawRewardValue}>
                            {isWritePending ? 'Processing...' : 'Send Transaction'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {contracts?.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Database className="h-12 w-12 opacity-50 mb-4" />
                    <p>No staking contracts found</p>
                </div>
            )}
        </div>
    );
}
