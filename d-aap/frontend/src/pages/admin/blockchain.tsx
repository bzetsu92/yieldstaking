import * as React from 'react';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { RefreshCw, Play, AlertCircle, CheckCircle, Clock, Database, Activity, Inbox, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    useBlockchainSyncStatuses,
    useBlockchainHealth,
    useUnprocessedEventCount,
    useTriggerBlockchainSync,
    useProcessBlockchainEvents,
} from '@/hooks/use-admin';

import type { BlockchainSyncStatus } from '@/interfaces/admin';

export default function AdminBlockchainPage() {
    const { data: syncStatuses, isLoading: syncLoading, refetch: refetchSync } = useBlockchainSyncStatuses();
    const { data: health, isLoading: healthLoading } = useBlockchainHealth();
    const { data: unprocessed } = useUnprocessedEventCount();
    const triggerSync = useTriggerBlockchainSync();
    const processEvents = useProcessBlockchainEvents();

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Synced</Badge>;
            case 'PROCESSING':
                return <Badge variant="default" className="bg-blue-500"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Syncing</Badge>;
            case 'FAILED':
                return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
            default:
                return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    const columns: ColumnDef<BlockchainSyncStatus>[] = React.useMemo(() => [
        {
            accessorKey: 'contractAddress',
            header: 'Contract',
            cell: ({ row }) => (
                <code className="text-xs">
                    {row.original.contractAddress.slice(0, 10)}...{row.original.contractAddress.slice(-6)}
                </code>
            ),
        },
        {
            accessorKey: 'chain',
            header: 'Chain',
            cell: ({ row }) => row.original.chain?.name || `Chain ${row.original.chainId}`,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            accessorKey: 'lastProcessedBlock',
            header: 'Last Block',
            cell: ({ row }) => (
                <span className="font-mono text-sm">{row.original.lastProcessedBlock}</span>
            ),
        },
        {
            accessorKey: 'currentBlock',
            header: 'Current Block',
            cell: ({ row }) => (
                <span className="font-mono text-sm">{row.original.currentBlock || '-'}</span>
            ),
        },
        {
            accessorKey: 'lastSyncAt',
            header: 'Last Sync',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {formatDate(row.original.lastSyncAt)}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => triggerSync.mutate({
                        chainId: row.original.chainId,
                        contractAddress: row.original.contractAddress,
                    })}
                    disabled={triggerSync.isPending}
                >
                    <RefreshCw className={`w-4 h-4 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
                </Button>
            ),
        },
    ], [triggerSync]);

    const table = useReactTable({
        data: syncStatuses ?? [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    if (syncLoading || healthLoading) {
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
                    <h1 className="text-2xl font-bold">Blockchain Management</h1>
                    <p className="text-muted-foreground">Monitor sync status and process events</p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={() => refetchSync()}
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Service Status</CardTitle>
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <Activity className="h-4 w-4 text-green-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {health?.isRunning ? (
                                <span className="text-green-500">Running</span>
                            ) : (
                                <span className="text-yellow-500">Stopped</span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {Object.keys(health?.providers || {}).length} provider(s) connected
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/20 to-transparent rounded-bl-full" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Unprocessed Events</CardTitle>
                        <div className="p-2 rounded-lg bg-orange-500/10">
                            <Inbox className="h-4 w-4 text-orange-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{unprocessed?.count ?? 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Pending blockchain events</p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Quick Actions</CardTitle>
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Zap className="h-4 w-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => processEvents.mutate(100)}
                            disabled={processEvents.isPending || (unprocessed?.count ?? 0) === 0}
                            className="w-full"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            Process Events
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold">Sync Status</h3>
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
                                            <Database className="h-8 w-8 opacity-50" />
                                            <p>No sync records found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {(syncStatuses?.length ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="text-muted-foreground text-sm">
                            {syncStatuses?.length ?? 0} contract(s)
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
