'use client';

/**
 * ============================================================================
 * ADMIN USERS PAGE
 * ============================================================================
 * User management interface for SA Admin and Super Admin.
 * Allows searching, filtering, role changes, and banning.
 * ============================================================================
 */

import { useEffect, useState } from 'react';
import { Search, Filter, MoreVertical, Shield, Ban, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import type { User, UserRole } from '@/types';

// Role badge colors
const roleBadgeColors: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  employee: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  guest: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  canteen_admin: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  admin: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  super_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Dialog states
  const [roleDialog, setRoleDialog] = useState<{
    open: boolean;
    user: User | null;
    newRole: UserRole | null;
  }>({ open: false, user: null, newRole: null });

  const [banDialog, setBanDialog] = useState<{
    open: boolean;
    user: User | null;
    reason: string;
  }>({ open: false, user: null, reason: '' });

  const [pointsDialog, setPointsDialog] = useState<{
    open: boolean;
    user: User | null;
    amount: string;
    reason: string;
  }>({ open: false, user: null, amount: '', reason: '' });

  // Fetch users
  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append('search', search);
      if (roleFilter !== 'all') params.append('role', roleFilter);

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        toast({
          title: 'Error',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Update user role
  const handleRoleChange = async () => {
    if (!roleDialog.user || !roleDialog.newRole) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: roleDialog.user.id,
          action: 'update_role',
          value: roleDialog.newRole,
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast({ title: 'Success', description: 'User role updated' });
        fetchUsers(pagination.page);
      } else {
        toast({
          title: 'Error',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setRoleDialog({ open: false, user: null, newRole: null });
    }
  };

  // Toggle ban status
  const handleBanToggle = async () => {
    if (!banDialog.user) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: banDialog.user.id,
          action: 'toggle_ban',
          reason: banDialog.reason,
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: banDialog.user.is_banned
            ? 'User unbanned successfully'
            : 'User banned successfully',
        });
        fetchUsers(pagination.page);
      } else {
        toast({
          title: 'Error',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update ban status',
        variant: 'destructive',
      });
    } finally {
      setBanDialog({ open: false, user: null, reason: '' });
    }
  };

  // Adjust points
  const handlePointsAdjust = async () => {
    if (!pointsDialog.user || !pointsDialog.amount) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: pointsDialog.user.id,
          action: 'adjust_points',
          value: parseInt(pointsDialog.amount),
          reason: pointsDialog.reason,
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast({ title: 'Success', description: 'Points adjusted successfully' });
        fetchUsers(pagination.page);
      } else {
        toast({
          title: 'Error',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to adjust points',
        variant: 'destructive',
      });
    } finally {
      setPointsDialog({ open: false, user: null, amount: '', reason: '' });
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || '??';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage users, roles, and permissions
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="employee">Employees</SelectItem>
                <SelectItem value="guest">Guests</SelectItem>
                <SelectItem value="canteen_admin">Canteen Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Users ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48 mt-1" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between py-4 ${
                    user.is_banned ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={user.avatar_url} alt={user.name} />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">{user.name || 'Unnamed'}</p>
                        {user.is_banned && (
                          <Badge variant="destructive" className="text-xs">
                            Banned
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge className={roleBadgeColors[user.role] || ''}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1">
                        {user.total_points.toLocaleString()} pts
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setRoleDialog({ open: true, user, newRole: null })
                          }
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setPointsDialog({
                              open: true,
                              user,
                              amount: '',
                              reason: '',
                            })
                          }
                        >
                          <Coins className="w-4 h-4 mr-2" />
                          Adjust Points
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className={
                            user.is_banned
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                          onClick={() =>
                            setBanDialog({ open: true, user, reason: '' })
                          }
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          {user.is_banned ? 'Unban User' : 'Ban User'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => fetchUsers(pagination.page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => fetchUsers(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog
        open={roleDialog.open}
        onOpenChange={(open) =>
          setRoleDialog({ open, user: null, newRole: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update role for {roleDialog.user?.name || roleDialog.user?.email}
            </DialogDescription>
          </DialogHeader>
          <Select
            value={roleDialog.newRole || ''}
            onValueChange={(value) =>
              setRoleDialog({ ...roleDialog, newRole: value as UserRole })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select new role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="canteen_admin">Canteen Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRoleDialog({ open: false, user: null, newRole: null })
              }
            >
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={!roleDialog.newRole}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog
        open={banDialog.open}
        onOpenChange={(open) => setBanDialog({ open, user: null, reason: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {banDialog.user?.is_banned ? 'Unban User' : 'Ban User'}
            </DialogTitle>
            <DialogDescription>
              {banDialog.user?.is_banned
                ? `Are you sure you want to unban ${banDialog.user?.name}?`
                : `This will prevent ${banDialog.user?.name} from accessing the platform.`}
            </DialogDescription>
          </DialogHeader>
          {!banDialog.user?.is_banned && (
            <Input
              placeholder="Reason for ban (optional)"
              value={banDialog.reason}
              onChange={(e) =>
                setBanDialog({ ...banDialog, reason: e.target.value })
              }
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBanDialog({ open: false, user: null, reason: '' })}
            >
              Cancel
            </Button>
            <Button
              variant={banDialog.user?.is_banned ? 'default' : 'destructive'}
              onClick={handleBanToggle}
            >
              {banDialog.user?.is_banned ? 'Unban' : 'Ban'} User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Points Adjustment Dialog */}
      <Dialog
        open={pointsDialog.open}
        onOpenChange={(open) =>
          setPointsDialog({ open, user: null, amount: '', reason: '' })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Points</DialogTitle>
            <DialogDescription>
              Current balance: {pointsDialog.user?.total_points.toLocaleString()} pts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="Points to add (negative to subtract)"
              value={pointsDialog.amount}
              onChange={(e) =>
                setPointsDialog({ ...pointsDialog, amount: e.target.value })
              }
            />
            <Input
              placeholder="Reason for adjustment"
              value={pointsDialog.reason}
              onChange={(e) =>
                setPointsDialog({ ...pointsDialog, reason: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setPointsDialog({ open: false, user: null, amount: '', reason: '' })
              }
            >
              Cancel
            </Button>
            <Button onClick={handlePointsAdjust} disabled={!pointsDialog.amount}>
              Adjust Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
