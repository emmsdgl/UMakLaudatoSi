'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, ChevronRight, Loader2, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PledgeUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  total_points: number;
  total_pledges: number;
  submitted_pledges: number;
  graded_pledges: number;
}

export default function AdminPledgesPage() {
  const router = useRouter();
  const [users, setUsers] = useState<PledgeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchDebounce) params.set('search', searchDebounce);
      const res = await fetch(`/api/admin/pledges?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [searchDebounce]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-green-600" />
          Pledge Albums
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review and grade user pledge submissions
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchDebounce ? 'No users found matching your search' : 'No users have created pledges yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <div
              key={user.id}
              className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              {/* Avatar */}
              <img
                src={user.avatar_url || '/default-avatar.png'}
                alt={user.name}
                className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-600 flex-shrink-0"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <div className="text-center">
                  <p className="font-bold text-gray-700 dark:text-gray-300">{user.total_pledges}</p>
                  <p className="text-gray-400">Total</p>
                </div>
                {user.submitted_pledges > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                    {user.submitted_pledges} pending
                  </Badge>
                )}
                <div className="text-center">
                  <p className="font-bold text-green-600">{user.graded_pledges}</p>
                  <p className="text-gray-400">Graded</p>
                </div>
              </div>

              {/* Action */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/admin/pledges/${user.id}`)}
                className="flex-shrink-0"
              >
                See Pledges
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
