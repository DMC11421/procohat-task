import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function UserManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch users from Firestore - only users created by current admin
  useEffect(() => {
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    if (!user?.email) return;

    try {
      // Query only users created by the current admin
      const usersQuery = query(
        collection(db, 'users'),
        where('createdBy', '==', user.email)
      );
      const querySnapshot = await getDocs(usersQuery);
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkAction) {
      toast({
        title: 'Warning',
        description: 'Please select an action.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({
        title: 'Warning',
        description: 'Please select at least one user.',
        variant: 'destructive',
      });
      return;
    }

    // Validate rejection reason if action is rejected
    if (bulkAction === 'rejected' && !rejectionReason.trim()) {
      toast({
        title: 'Warning',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Update all selected users
      const updatePromises = selectedUsers.map(userId => {
        const updateData = {
          status: bulkAction,
        };

        // Add rejection reason if status is rejected
        if (bulkAction === 'rejected') {
          updateData.rejectionReason = rejectionReason;
          updateData.rejectedAt = serverTimestamp();
        } else {
          // Clear rejection reason if status is not rejected
          updateData.rejectionReason = null;
          updateData.rejectedAt = null;
        }

        return updateDoc(doc(db, 'users', userId), updateData);
      });

      await Promise.all(updatePromises);

      toast({
        title: 'Success',
        description: `${selectedUsers.length} user(s) updated successfully!`,
      });

      // Refresh the list
      await fetchUsers();
      setSelectedUsers([]);
      setBulkAction('');
      setRejectionReason('');
    } catch (error) {
      console.error('Error updating users:', error);
      toast({
        title: 'Error',
        description: 'Failed to update users.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">User Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage and approve users</p>
      </div>

      {/* Bulk Actions */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Bulk Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Action Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="bulkAction">Action</Label>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger id="bulkAction">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                  <SelectItem value="pending">Set to Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rejection Reason (conditional) */}
            {bulkAction === 'rejected' && (
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason</Label>
                <Input
                  id="rejectionReason"
                  placeholder="Enter reason for rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={submitting}
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Button 
              onClick={handleBulkUpdate} 
              disabled={submitting || selectedUsers.length === 0}
              className="w-full sm:w-auto sm:min-w-[120px]"
            >
              {submitting ? 'Updating...' : 'Submit'}
            </Button>
          </div>

          {selectedUsers.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              {selectedUsers.length} user(s) selected
            </p>
          )}
        </CardContent>
      </Card>

      {/* Users List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold">Users List</h2>
          <div className="hidden sm:block">
            <Checkbox
              checked={selectedUsers.length === users.length && users.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="ml-2 text-sm text-muted-foreground">Select All</span>
          </div>
        </div>

        {users.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No users found. Add users from the Dashboard.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile: Cards View */}
            <div className="sm:hidden space-y-3">
              {users.map((user) => (
                <Card key={user.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => handleSelectUser(user.id, checked)}
                        />
                        <div>
                          <h3 className="font-medium">{user.username}</h3>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : user.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {user.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Role:</span>
                        <span className="capitalize font-medium">{user.role}</span>
                      </div>
                      {user.status === 'rejected' && user.rejectionReason && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Reason:</span>
                          <span className="text-red-600 italic text-right flex-1 ml-2">{user.rejectionReason}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created By:</span>
                        <span className="text-right">{user.createdBy}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop: Table View */}
            <Card className="hidden sm:block overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="w-[48px] px-4">
                          <Checkbox
                            checked={selectedUsers.length === users.length && users.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="min-w-[120px] px-4">Username</TableHead>
                        <TableHead className="min-w-[200px] px-4">Email</TableHead>
                        <TableHead className="min-w-[100px] px-4">Role</TableHead>
                        <TableHead className="min-w-[120px] px-4">Status</TableHead>
                        <TableHead className="min-w-[180px] px-4">Rejection Reason</TableHead>
                        <TableHead className="min-w-[180px] px-4">Created By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/50">
                          <TableCell className="py-3 px-4">
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) => handleSelectUser(user.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium py-3 px-4 whitespace-nowrap">{user.username}</TableCell>
                          <TableCell className="py-3 px-4 whitespace-nowrap">{user.email}</TableCell>
                          <TableCell className="capitalize py-3 px-4 whitespace-nowrap">{user.role}</TableCell>
                          <TableCell className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                                user.status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : user.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {user.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground py-3 px-4">
                            {user.status === 'rejected' && user.rejectionReason ? (
                              <span className="text-red-600 italic">{user.rejectionReason}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground py-3 px-4 whitespace-nowrap">
                            {user.createdBy}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
