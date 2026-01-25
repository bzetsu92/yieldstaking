import * as React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Check, X, TrendingUp, Search, FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAdminPositions } from '@/hooks/use-admin';

import type { StakePositionAdmin } from '@/interfaces/admin';

function formatAmount(amount: string, decimals: number = 6): string {
    const value = Number(BigInt(amount)) / Math.pow(10, decimals);
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

export default function AdminPositionsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const userIdParam = searchParams.get('userId');

    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);
    
    const { data, isLoading } = useAdminPositions({ 
        page: 1, 
        limit: 100,
        isWithdrawn: statusFilter === 'withdrawn' ? true : statusFilter === 'active' ? false : undefined,
        userId: userIdParam ? parseInt(userIdParam) : undefined,
        search: debouncedSearch || undefined,
    });

    const clearUserFilter = () => {
        searchParams.delete('userId');
        setSearchParams(searchParams);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString();
    };

    const formatLockPeriod = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        return `${days} days`;
    };

    const columns: ColumnDef<StakePositionAdmin>[] = React.useMemo(() => [
        {
            accessorKey: 'wallet',
            header: 'User',
            cell: ({ row }) => (
                <div>
                    <Link 
                        to={`/admin/users`}
                        className="font-medium hover:underline"
                    >
                        {row.original.wallet.user.name}
                    </Link>
                    <code className="block text-xs text-muted-foreground">
                        {row.original.wallet.walletAddress.slice(0, 6)}...{row.original.wallet.walletAddress.slice(-4)}
                    </code>
                </div>
            ),
        },
        {
            accessorKey: 'package',
            header: 'Package',
            cell: ({ row }) => (
                <div>
                    <div>Package #{row.original.onChainPackageId}</div>
                    <div className="text-sm text-muted-foreground">
                        {(row.original.package.apy / 100).toFixed(1)}% APY
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'principal',
            header: 'Principal',
            cell: ({ row }) => (
                <span className="font-mono">
                    {formatAmount(row.original.principal, 6)} {row.original.contract.stakeTokenSymbol}
                </span>
            ),
        },
        {
            accessorKey: 'rewardTotal',
            header: 'Rewards',
            cell: ({ row }) => (
                <div className="font-mono">
                    <div className="text-green-600 dark:text-green-400">
                        +{formatAmount(row.original.rewardTotal, 18)} {row.original.contract.rewardTokenSymbol}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Claimed: {formatAmount(row.original.rewardClaimed, 18)}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'lockPeriod',
            header: 'Lock',
            cell: ({ row }) => formatLockPeriod(row.original.lockPeriod),
        },
        {
            accessorKey: 'unlockTimestamp',
            header: 'Unlock',
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.original.unlockTimestamp)}</span>
            ),
        },
        {
            accessorKey: 'isWithdrawn',
            header: 'Status',
            cell: ({ row }) => {
                const position = row.original;
                if (position.isWithdrawn) {
                    return (
                        <Badge variant="outline" className="gap-1">
                            <Check className="w-3 h-3" /> Withdrawn
                        </Badge>
                    );
                }
                if (new Date(position.unlockTimestamp) <= new Date()) {
                    return (
                        <Badge className="bg-green-500 gap-1">
                            <Check className="w-3 h-3" /> Unlocked
                        </Badge>
                    );
                }
                return (
                    <Badge variant="secondary" className="gap-1">
                        <X className="w-3 h-3" /> Locked
                    </Badge>
                );
            },
        },
        {
            id: 'transactions',
            header: '',
            cell: ({ row }) => (
                <Link 
                    to={`/admin/transactions?positionId=${row.original.id}`}
                    className="flex items-center gap-1 text-primary hover:underline text-sm"
                >
                    <FileText className="w-3 h-3" />
                    History
                </Link>
            ),
        },
    ], []);

    const table = useReactTable({
        data: data?.positions ?? [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-6 space-y-6">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold">All Stake Positions</h1>
                    <p className="text-muted-foreground">Manage all stake positions in the system</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, or wallet..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {userIdParam && (
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1 pr-1">
                        Filtering by User ID: {userIdParam}
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                            onClick={clearUserFilter}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                </div>
            )}

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
                                    <TableCell colSpan={columns.length} className="h-32 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <TrendingUp className="h-8 w-8 opacity-50" />
                                            <p>No positions found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {(data?.positions?.length ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="text-muted-foreground text-sm">
                            {data?.total ?? 0} position(s)
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-sm">
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
                    </div>
                )}
            </div>
        </div>
    );
}
