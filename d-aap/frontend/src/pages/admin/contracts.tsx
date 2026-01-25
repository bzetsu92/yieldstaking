import * as React from 'react';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { ExternalLink, Pause, Play, Database, Wallet, Coins, Package, TrendingUp } from 'lucide-react';

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
import { useAdminContracts } from '@/hooks/use-admin';

import type { StakingPackageAdmin } from '@/interfaces/admin';

function formatAmount(amount: string, decimals: number = 6): string {
    const value = Number(BigInt(amount)) / Math.pow(10, decimals);
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

interface PackagesTableProps {
    packages: Omit<StakingPackageAdmin, 'contractId' | 'contract' | '_count'>[];
    stakeTokenDecimals: number;
    stakeTokenSymbol: string;
}

function PackagesTable({ packages, stakeTokenDecimals, stakeTokenSymbol }: PackagesTableProps) {
    const formatLockPeriod = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        return `${days} days`;
    };

    const columns: ColumnDef<StakingPackageAdmin>[] = React.useMemo(() => [
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
                    {formatAmount(row.original.totalStaked, stakeTokenDecimals)} {stakeTokenSymbol}
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
    ], [stakeTokenDecimals, stakeTokenSymbol]);

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
            <div className="overflow-hidden rounded-lg border">
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

export default function AdminContractsPage() {
    const { data: contracts, isLoading } = useAdminContracts();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Contracts</h1>
                <p className="text-muted-foreground">Manage all contracts in the system</p>
            </div>

            {contracts?.map((contract) => (
                <Card key={contract.id}>
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
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="flex items-center gap-3 p-4 rounded-lg border">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <Wallet className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Total Locked</div>
                                    <div className="text-xl font-bold">
                                        {formatAmount(contract.totalLocked, contract.stakeTokenDecimals)} {contract.stakeTokenSymbol}
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
                                    <div className="text-sm text-muted-foreground">Packages</div>
                                    <div className="text-xl font-bold">{contract.packages.length}</div>
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
                            <h4 className="font-semibold mb-3">Staking Packages</h4>
                            <PackagesTable 
                                packages={contract.packages}
                                stakeTokenDecimals={contract.stakeTokenDecimals}
                                stakeTokenSymbol={contract.stakeTokenSymbol}
                            />
                        </div>
                    </CardContent>
                </Card>
            ))}

            {contracts?.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Database className="h-12 w-12 opacity-50 mb-4" />
                    <p>No staking contracts found</p>
                </div>
            )}
        </div>
    );
}
