import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Clock, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [motivationalQuote, setMotivationalQuote] = useState('Time to crush your goals!');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    rejectedUsers: 0,
    totalDocuments: 0,
  });
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: '',
    status: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Save to Firestore
      await addDoc(collection(db, 'users'), {
        ...formData,
        createdAt: serverTimestamp(),
        createdBy: user?.email || 'unknown',
      });

      toast({
        title: 'Success',
        description: 'User added successfully!',
      });

      // Reset form
      handleCancel();
    } catch (error) {
      console.error('Error adding user:', error);
      toast({
        title: 'Error',
        description: 'Failed to add user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: '',
      email: '',
      role: '',
      status: '',
    });
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { emoji: '🌅', text: 'Good Morning' };
    if (hour < 17) return { emoji: '☀️', text: 'Good Afternoon' };
    if (hour < 21) return { emoji: '🌆', text: 'Good Evening' };
    return { emoji: '🌙', text: 'Good Night' };
  };

  // Get formatted date
  const getFormattedDate = () => {
    const now = new Date();
    const options = { weekday: 'long', month: 'short', day: '2-digit' };
    return `📅 ${now.toLocaleDateString('en-US', options)}`;
  };

  // Get user's first name
  const getUserName = () => {
    if (user?.displayName) {
      return user.displayName.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  // Fetch statistics from Firestore
  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user?.email) return;

    try {
      // Fetch users created by current admin
      const usersQuery = query(collection(db, 'users'), where('createdBy', '==', user.email));
      const usersSnapshot = await getDocs(usersQuery);
      const totalUsers = usersSnapshot.size;

      // Count pending approvals (created by current admin)
      const pendingQuery = query(
        collection(db, 'users'),
        where('createdBy', '==', user.email),
        where('status', '==', 'pending')
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      const pendingApprovals = pendingSnapshot.size;

      // Count rejected users (created by current admin)
      const rejectedQuery = query(
        collection(db, 'users'),
        where('createdBy', '==', user.email),
        where('status', '==', 'rejected')
      );
      const rejectedSnapshot = await getDocs(rejectedQuery);
      const rejectedUsers = rejectedSnapshot.size;

      // Fetch documents created by current admin
      const documentsQuery = query(collection(db, 'documents'), where('createdBy', '==', user.email));
      const documentsSnapshot = await getDocs(documentsQuery);
      const totalDocuments = documentsSnapshot.size;

      setStats({
        totalUsers,
        pendingApprovals,
        rejectedUsers,
        totalDocuments,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch motivational quote
  useEffect(() => {
    let isMounted = true;

    const fetchQuote = async () => {
      try {
        const response = await fetch('https://api.quotable.io/random?tags=motivational|inspirational');
        const data = await response.json();
        
        if (isMounted) {
          setMotivationalQuote(data.content);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch quote:', error);
        
        if (isMounted) {
          // Fallback quotes if API fails
          const fallbackQuotes = [
            'Time to crush your goals!',
            'Make today amazing!',
            'You are capable of amazing things!',
            'Success is the sum of small efforts repeated day in and day out.',
            'Believe you can and you\'re halfway there!',
          ];
          setMotivationalQuote(fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]);
          setLoading(false);
        }
      }
    };

    fetchQuote();

    return () => {
      isMounted = false;
    };
  }, []);

  const greeting = getGreeting();

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Rejected Users',
      value: stats.rejectedUsers,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Total Documents',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard</h1>
        <div className="space-y-1">
          <p className="text-base sm:text-lg">
            {greeting.emoji} {greeting.text}, {getUserName()}!
          </p>
          <p className="text-sm sm:text-base text-muted-foreground">{getFormattedDate()}</p>
          <p className="text-xs sm:text-sm italic text-muted-foreground">
            {loading ? 'Loading inspiration...' : motivationalQuote}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.title === 'Pending Approvals' || stat.title === 'Documents Pending Completion'
                    ? 'Requires attention'
                    : 'Total count'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Form Section */}
      <Card className="mt-6 sm:mt-8">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Add New User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Role Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleSelectChange('role', value)}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Centered Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Button type="submit" className="w-full sm:w-auto sm:min-w-[120px]" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="w-full sm:w-auto sm:min-w-[120px]"
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
