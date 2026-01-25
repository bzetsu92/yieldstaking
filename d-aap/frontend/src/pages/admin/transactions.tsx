import * as React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getFilteredRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { ExternalLink, FileText, Search, X } from 'lucide-react';

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
import { useAdminTransactions } from '@/hooks/use-admin';

import type { AdminTransactionAdmin } from '@/interfaces/admin';

function formatAmount(amount: string, decimals: number = 6): string {
    const value = Number(BigInt(amount)) / Math.pow(10, decimals);
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

export default function AdminTransactionsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const userIdParam = searchParams.get('userId');
    const positionIdParam = searchParams.get('positionId');
    
    const [typeFilter, setTypeFilter] = React.useState<string>('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { data, isLoading } = useAdminTransactions({ 
        page: 1, 
        limit: 100,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        userId: userIdParam ? parseInt(userIdParam) : undefined,
        search: debouncedSearch || undefined,
        positionId: positionIdParam ? parseInt(positionIdParam) : undefined,
    });

    const clearFilter = (key: string) => {
        searchParams.delete(key);
        setSearchParams(searchParams);
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'STAKE':
                return <Badge className="bg-blue-500">Stake</Badge>;
            case 'CLAIM':
                return <Badge className="bg-green-500">Claim</Badge>;
            case 'WITHDRAW':
                return <Badge className="bg-orange-500">Withdraw</Badge>;
            case 'EMERGENCY_WITHDRAW':
                return <Badge variant="destructive">Emergency</Badge>;
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'CONFIRMED':
                return <Badge variant="default" className="bg-green-500">Confirmed</Badge>;
            case 'PENDING':
                return <Badge variant="outline">Pending</Badge>;
            case 'FAILED':
                return <Badge variant="destructive">Failed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    const columns: ColumnDef<AdminTransactionAdmin>[] = React.useMemo(() => [
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
            accessorKey: 'type',
            header: 'Type',
            cell: ({ row }) => getTypeBadge(row.original.type),
        },
        {
            accessorKey: 'amount',
            header: 'Amount',
            cell: ({ row }) => (
                <span className="font-mono">
                    {row.original.type === 'CLAIM' 
                        ? `${formatAmount(row.original.amount, 18)} AUR`
                        : `${formatAmount(row.original.amount, 6)} USDT`
                    }
                </span>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            accessorKey: 'txHash',
            header: 'Tx Hash',
            cell: ({ row }) => (
                row.original.txHash ? (
                    <a
                        href={row.original.explorerUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                    >
                        <code className="text-xs">
                            {row.original.txHash.slice(0, 8)}...{row.original.txHash.slice(-6)}
                        </code>
                        <ExternalLink className="w-3 h-3" />
                    </a>
                ) : (
                    <span className="text-muted-foreground">-</span>
                )
            ),
        },
        {
            accessorKey: 'createdAt',
            header: 'Date',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {formatDate(row.original.createdAt)}
                </span>
            ),
        },
    ], []);

    const table = useReactTable({
        data: data?.transactions ?? [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
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
                    <h1 className="text-2xl font-bold">All Transactions</h1>
                    <p className="text-muted-foreground">Manage all transactions in the system</p>
                </div>
            </div>

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
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="STAKE">Stake</SelectItem>
                        <SelectItem value="CLAIM">Claim</SelectItem>
                        <SelectItem value="WITHDRAW">Withdraw</SelectItem>
                        <SelectItem value="EMERGENCY_WITHDRAW">Emergency</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {(userIdParam || positionIdParam) && (
                <div className="flex items-center gap-2 flex-wrap">
                    {userIdParam && (
                        <Badge variant="secondary" className="gap-1 pr-1">
                            User ID: {userIdParam}
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                                onClick={() => clearFilter('userId')}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}
                    {positionIdParam && (
                        <Badge variant="secondary" className="gap-1 pr-1">
                            Position ID: {positionIdParam}
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                                onClick={() => clearFilter('positionId')}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}
                    <Link to="/admin/transactions" className="text-sm text-muted-foreground hover:underline">
                        Clear all filters
                    </Link>
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
                                            <FileText className="h-8 w-8 opacity-50" />
                                            <p>No transactions found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {(data?.transactions?.length ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="text-muted-foreground text-sm">
                            {data?.total ?? 0} transaction(s)
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
