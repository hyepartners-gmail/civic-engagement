import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import PlatformCard from '../PlatformCard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Shield, ShieldOff, UserX, UserCheck, Mail, MapPin, Calendar } from 'lucide-react';

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'user' | 'admin'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, selectedRole]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch users',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch users',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by role
    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    setFilteredUsers(filtered);
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, updates }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User updated successfully',
        });
        fetchUsers(); // Refresh the list
      } else {
        const data = await response.json();
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.message || 'Failed to update user',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user',
      });
    }
  };

  const toggleUserRole = (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    updateUser(user.id, { role: newRole });
  };

  const toggleUserMute = (user: User) => {
    updateUser(user.id, { isMuted: !user.isMuted });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <PlatformCard className="p-6">
        <div className="text-center">Loading users...</div>
      </PlatformCard>
    );
  }

  return (
    <div className="space-y-6">
      <PlatformCard className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedRole === 'all' ? 'default' : 'platform-secondary'}
              onClick={() => setSelectedRole('all')}
              size="sm"
            >
              All ({users.length})
            </Button>
            <Button
              variant={selectedRole === 'user' ? 'default' : 'platform-secondary'}
              onClick={() => setSelectedRole('user')}
              size="sm"
            >
              Users ({users.filter(u => u.role === 'user').length})
            </Button>
            <Button
              variant={selectedRole === 'admin' ? 'default' : 'platform-secondary'}
              onClick={() => setSelectedRole('admin')}
              size="sm"
            >
              Admins ({users.filter(u => u.role === 'admin').length})
            </Button>
          </div>
        </div>

        <div className="text-sm text-platform-text/70 mb-4">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </PlatformCard>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <PlatformCard key={user.id} className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{user.displayName}</h3>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                  {user.isVerified ? (
                    <Badge variant="outline" className="text-green-600">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600">
                      <UserX className="h-3 w-3 mr-1" />
                      Unverified
                    </Badge>
                  )}
                  {user.isMuted && (
                    <Badge variant="destructive">Muted</Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-platform-text/80">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </div>
                  {user.city && user.state && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {user.city}, {user.state}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Last active: {formatDate(user.lastActivityDate)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span>Votes: {user.votesCast || 0}</span>
                  <span>Comments: {user.totalComments || 0}</span>
                  <span>Solution Votes: {user.totalSolutionVotes || 0}</span>
                  <span>Badges: {user.badges?.length || 0}</span>
                  <span>Streak: {user.currentStreak || 0}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="platform-secondary"
                  size="sm"
                  onClick={() => toggleUserRole(user)}
                  className="flex items-center gap-2"
                >
                  {user.role === 'admin' ? (
                    <>
                      <ShieldOff className="h-4 w-4" />
                      Remove Admin
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Make Admin
                    </>
                  )}
                </Button>
                
                <Button
                  variant={user.isMuted ? "default" : "platform-secondary"}
                  size="sm"
                  onClick={() => toggleUserMute(user)}
                  className="flex items-center gap-2"
                >
                  {user.isMuted ? (
                    <>
                      <UserCheck className="h-4 w-4" />
                      Unmute
                    </>
                  ) : (
                    <>
                      <UserX className="h-4 w-4" />
                      Mute
                    </>
                  )}
                </Button>
              </div>
            </div>
          </PlatformCard>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <PlatformCard className="p-6">
          <div className="text-center text-platform-text/70">
            No users found matching your criteria.
          </div>
        </PlatformCard>
      )}
    </div>
  );
};

export default UserManager;