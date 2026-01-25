import * as React from 'react';
import { Link } from 'react-router-dom';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { MoreHorizontal, Shield, ShieldAlert, ShieldCheck, UserX, Users, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAdminUsers, useUpdateUserRole, useUpdateUserStatus } from '@/hooks/use-admin';

import type { AdminUser, UserRole, UserStatus } from '@/interfaces/admin';

export default function AdminUsersPage() {
    const [page] = React.useState(1);
    const { data, isLoading } = useAdminUsers({ page, limit: 100 });
    const updateRole = useUpdateUserRole();
    const updateStatus = useUpdateUserStatus();

    const handleRoleChange = (userId: number, role: UserRole) => {
        updateRole.mutate({ userId, role });
    };

    const handleStatusChange = (userId: number, status: UserStatus) => {
        updateStatus.mutate({ userId, status });
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return <Badge variant="default" className="bg-purple-500">Admin</Badge>;
            default:
                return <Badge variant="secondary">User</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <Badge variant="default" className="bg-green-500">Active</Badge>;
            case 'SUSPENDED':
                return <Badge variant="destructive">Suspended</Badge>;
            default:
                return <Badge variant="outline">Inactive</Badge>;
        }
    };

    const columns: ColumnDef<AdminUser>[] = React.useMemo(() => [
        {
            accessorKey: 'name',
            header: 'User',
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.name}</div>
                    <div className="text-sm text-muted-foreground">
                        {row.original.email || 'No email'}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'wallets',
            header: 'Wallet',
            cell: ({ row }) => (
                row.original.wallets.length > 0 ? (
                    <code className="text-xs">
                        {row.original.wallets[0].walletAddress.slice(0, 6)}...
                        {row.original.wallets[0].walletAddress.slice(-4)}
                    </code>
                ) : (
                    <span className="text-muted-foreground">-</span>
                )
            ),
        },
        {
            accessorKey: 'role',
            header: 'Role',
            cell: ({ row }) => getRoleBadge(row.original.role),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            accessorKey: 'authMethod',
            header: 'Auth',
            cell: ({ row }) => <Badge variant="outline">{row.original.authMethod}</Badge>,
        },
        {
            id: 'positions',
            header: 'Positions',
            cell: ({ row }) => (
                <Link 
                    to={`/admin/positions?userId=${row.original.id}`}
                    className="flex items-center gap-1 text-primary hover:underline text-sm"
                >
                    <TrendingUp className="w-3 h-3" />
                    View Stakes
                </Link>
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={() => handleRoleChange(user.id, user.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                            >
                                {user.role === 'ADMIN' ? (
                                    <>
                                        <Shield className="mr-2 h-4 w-4" />
                                        Remove Admin
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        Make Admin
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.status === 'ACTIVE' ? (
                                <DropdownMenuItem
                                    onClick={() => handleStatusChange(user.id, 'SUSPENDED')}
                                    className="text-destructive"
                                >
                                    <ShieldAlert className="mr-2 h-4 w-4" />
                                    Suspend User
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem
                                    onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                                >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Activate User
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], []);

    const table = useReactTable({
        data: data?.users ?? [],
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
            <div>
                <h1 className="text-2xl font-bold">User Management</h1>
                <p className="text-muted-foreground">Manage users of the application</p>
            </div>

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
                                            <Users className="h-8 w-8 opacity-50" />
                                            <p>No users found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {(data?.users?.length ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="text-muted-foreground text-sm">
                            {data?.total ?? 0} user(s)
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
