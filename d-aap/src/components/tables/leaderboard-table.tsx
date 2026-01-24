import * as React from 'react';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Trophy, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface LeaderboardItem {
    rank: number;
    address: string;
    staked: number;
    rewards: number;
}

interface LeaderboardTableProps {
    data: LeaderboardItem[];
    explorerUrl?: string;
}

export function LeaderboardTable({ 
    data, 
    explorerUrl = 'https://sepolia.etherscan.io'
}: LeaderboardTableProps) {
    const columns: ColumnDef<LeaderboardItem>[] = React.useMemo(() => [
        {
            accessorKey: 'rank',
            header: 'Rank',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{row.original.rank}</span>
                    {row.original.rank <= 3 && (
                        <Trophy className={`h-4 w-4 ${
                            row.original.rank === 1 ? 'text-yellow-500' : 
                            row.original.rank === 2 ? 'text-slate-400' : 
                            'text-amber-600'
                        }`} />
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'address',
            header: 'Staker',
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <span className="font-mono text-sm">{row.original.address}</span>
                    <Copy 
                        className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" 
                        onClick={() => navigator.clipboard.writeText(row.original.address)}
                    />
                </div>
            ),
        },
        {
            accessorKey: 'staked',
            header: 'Staked',
            cell: ({ row }) => (
                <span className="font-medium text-green-500">
                    {row.original.staked.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            accessorKey: 'rewards',
            header: 'Est. Rewards',
            cell: ({ row }) => (
                <span>
                    ${row.original.rewards.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            ),
        }
    ], [explorerUrl]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 6,
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
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Trophy className="h-8 w-8 opacity-50" />
                                        <p>No stakers yet</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {data.length > 5 && (
                <div className="flex items-center justify-between">
                    <div className="text-muted-foreground text-sm">
                        {data.length} staker(s)
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
    );
}
