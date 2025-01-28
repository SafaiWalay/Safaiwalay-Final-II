import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import {
  Clock,
  DollarSign,
  Calendar,
  CheckCircle2,
  Timer,
  Pause,
  Play,
  IndianRupee,
  Star,
} from 'lucide-react';
import { useAuth } from '@/lib/store';
import {
  fetchAvailableBookings,
  fetchCleanerBookings,
  fetchCleanerEarnings,
  pickBooking,
  startJob,
  pauseJob,
  resumeJob,
  completeJob
} from '@/lib/supabase';

interface Orders {
  current: any[];
  history: any[];
}

export default function CleanerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Orders>({ current: [], history: [] });
  const [earnings, setEarnings] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    pendingCashout: 0,
    completedJobs: 0,
    totalHours: 0,
    averageRating: 0,
  });

  useEffect(() => {
    if (user?.role === 'cleaner') {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      const [availableBookings, cleanerBookings] = await Promise.all([
        fetchAvailableBookings(),
        fetchCleanerBookings()
      ]);

      const currentOrders = [
        ...availableBookings,
        ...cleanerBookings.filter(
          (booking) =>
            !booking.payment_collected_at &&
            booking.status !== 'payment_verified' &&
            (booking.status === 'pending' ||
              booking.status === 'picked' ||
              booking.status === 'in_progress' ||
              booking.status === 'paused')
        ),
      ].sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() -
          new Date(b.scheduled_at).getTime()
      );

      const historyOrders = cleanerBookings
        .filter(
          (booking) =>
            booking.payment_collected_at ||
            booking.status === 'payment_verified' ||
            booking.status === 'completed'
        )
        .sort(
          (a, b) =>
            new Date(b.completed_at).getTime() -
            new Date(a.completed_at).getTime()
        );

      setOrders({
        current: currentOrders,
        history: historyOrders,
      });

      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate earnings from earnings_history
      const cleaner = await fetchCleanerEarnings();
      console.log('Cleaner data:', cleaner);
      console.log('Earnings history:', cleaner?.earnings_history);

try {
  // Calculate earnings from earnings_history
  const cleaner = await fetchCleanerEarnings();
  console.log('Raw cleaner data:', cleaner);
  
  // Validate cleaner data
  if (!cleaner) {
    throw new Error('No cleaner data found');
  }

  // Ensure earnings_history is valid
  if (!cleaner.earnings_history) {
    console.warn('No earnings history found, initializing empty array');
  }
  
  const earnings_history = Array.isArray(cleaner.earnings_history) 
    ? cleaner.earnings_history 
    : [];
    
  console.log('Earnings history type:', typeof earnings_history);
  console.log('Earnings history structure:', JSON.stringify(earnings_history, null, 2));

// Calculate date ranges in UTC
const now = new Date();

// Start of day - set to 00:00:00 UTC
const startOfDay = new Date(now.toISOString().split('T')[0] + 'T00:00:00.000Z');
console.log('Start of day:', startOfDay.toISOString());

// Start of week - Sunday, 00:00:00 UTC
const startOfWeek = new Date(now);
startOfWeek.setUTCDate(now.getUTCDate() - now.getUTCDay());
startOfWeek.setUTCHours(0, 0, 0, 0);
console.log('Start of week:', startOfWeek.toISOString());

// Start of month - 1st of month, 00:00:00 UTC
const startOfMonth = new Date(now);
startOfMonth.setUTCDate(1);
startOfMonth.setUTCHours(0, 0, 0, 0);
console.log('Start of month:', startOfMonth.toISOString());

// Helper function to safely calculate sum
const calculateSum = (entries: any[], dateFilter?: Date) => {
  try {
    return entries
      .filter(entry => {
        if (!entry?.earned_at) {
          console.warn('Entry missing earned_at:', entry);
          return false;
        }
        if (!entry?.amount) {
          console.warn('Entry missing amount:', entry);
          return false;
        }
        if (dateFilter) {
          const entryDate = new Date(entry.earned_at);
          console.log(`Comparing entry date ${entryDate.toISOString()} with filter ${dateFilter.toISOString()}`);
          return entryDate >= dateFilter;
        }
        return true;
      })
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  } catch (error) {
    console.error('Error calculating sum:', error);
    return 0;
  }
};

  // Calculate total hours with error handling
  const totalHours = cleanerBookings.reduce((sum, booking) => {
    try {
      if (!booking.started_at || !booking.completed_at) {
        return sum;
      }
      const duration =
        new Date(booking.completed_at).getTime() -
        new Date(booking.started_at).getTime();
      return sum + duration / (1000 * 60 * 60);
    } catch (error) {
      console.error('Error calculating duration for booking:', booking.id, error);
      return sum;
    }
  }, 0);

  setEarnings({
    today: calculateSum(earnings_history, startOfDay),
    thisWeek: calculateSum(earnings_history, startOfWeek),
    thisMonth: calculateSum(earnings_history, startOfMonth),
    pendingCashout: calculateSum(earnings_history),
    completedJobs: cleanerBookings.length,
    totalHours,
    averageRating: 4.8,
  });

} catch (error) {
  console.error('Error calculating earnings:', error);
  // Set default values in case of error
  setEarnings({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    pendingCashout: 0,
    completedJobs: cleanerBookings?.length || 0,
    totalHours: 0,
    averageRating: 0,
  });
  
  toast({
    title: 'Error',
    description: 'Failed to calculate earnings. Please try again later.',
    variant: 'destructive',
  });
}
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickBooking = async (orderId: string) => {
    try {
      await pickBooking(orderId);
      await loadOrders();
      toast({
        title: 'Success',
        description: 'Booking picked successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to pick booking',
        variant: 'destructive',
      });
    }
  };

  const handleStartJob = async (orderId: string) => {
    try {
      await startJob(orderId);
      await loadOrders();
      toast({
        title: 'Job Started',
        description: 'Timer has been started for this job.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start job',
        variant: 'destructive',
      });
    }
  };

  const handlePauseJob = async (orderId: string) => {
    try {
      await pauseJob(orderId);
      await loadOrders();
      toast({
        title: 'Job Paused',
        description: 'Timer has been paused.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to pause job',
        variant: 'destructive',
      });
    }
  };

  const handleResumeJob = async (orderId: string) => {
    try {
      await resumeJob(orderId);
      await loadOrders();
      toast({
        title: 'Job Resumed',
        description: 'Timer has been resumed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resume job',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteJob = async (orderId: string) => {
    try {
      await completeJob(orderId);
      await loadOrders();
      toast({
        title: 'Job Completed & Earnings Updated',
        description: 'Great work! The job has been completed and your earnings have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete job',
        variant: 'destructive',
      });
    }
  };

  if (!user || user.role !== 'cleaner') {
    return <Navigate to="/cleaner/login" />;
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      picked: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-blue-100 text-blue-800',
      paused: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getJobDuration = (order: any) => {
    if (!order.started_at) return '0h 0m';

    const start = new Date(order.started_at);
    const end = order.completed_at ? new Date(order.completed_at) : new Date();

    let duration =
      end.getTime() -
      start.getTime() -
      (order.total_pause_duration || 0) * 60 * 1000;

    if (order.status === 'paused' && order.paused_at) {
      duration -= new Date().getTime() - new Date(order.paused_at).getTime();
    }

    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-8">Cleaner Dashboard</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Today's Earnings
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{earnings.today}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{earnings.thisWeek}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  This Month
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{earnings.thisMonth}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Cashout
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{earnings.pendingCashout}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="current">
            <TabsList>
              <TabsTrigger value="current">Current Orders</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="current">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-6">
                      {orders.current.map((order) => (
                        <Card key={order.id}>
                          <CardContent className="p-6">
                            {/* Order details */}
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {order.services?.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(
                                    order.scheduled_at
                                  ).toLocaleString()}
                                </p>
                                {order.started_at && (
                                  <p className="text-sm text-muted-foreground">
                                    Duration: {getJobDuration(order)}
                                  </p>
                                )}
                              </div>
                              <Badge className={getStatusBadge(order.status)}>
                                {order.status.toUpperCase()}
                              </Badge>
                            </div>

                            {/* Customer details */}
                            <div className="space-y-2 mb-4">
                              <div>
                                <span className="font-medium">Customer: </span>
                                {order.users?.name}
                              </div>
                              <div>
                                <span className="font-medium">Phone: </span>
                                {order.users?.phone}
                              </div>
                              <div>
                                <span className="font-medium">Address: </span>
                                {order.address}
                              </div>
                              <div>
                                <span className="font-medium">Amount: </span>₹
                                {order.amount}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex justify-end space-x-4">
                              {order.status === 'pending' && (
                                <Button
                                  onClick={() => handlePickBooking(order.id)}
                                >
                                  <Clock className="mr-2 h-4 w-4" />
                                  Pick Job
                                </Button>
                              )}

                              {order.status === 'picked' && (
                                <Button
                                  onClick={() => handleStartJob(order.id)}
                                >
                                  <Clock className="mr-2 h-4 w-4" />
                                  Start Job
                                </Button>
                              )}

                              {order.status === 'in_progress' &&
                                !order.isPaused && (
                                  <Button
                                    onClick={() => handlePauseJob(order.id)}
                                  >
                                    <Pause className="mr-2 h-4 w-4" />
                                    Pause Job
                                  </Button>
                                )}

                              {order.status === 'paused' && (
                                <Button
                                  onClick={() => handleResumeJob(order.id)}
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Resume Job
                                </Button>
                              )}

                              {(order.status === 'in_progress' ||
                                order.status === 'paused') && (
                                <Button
                                  onClick={() => handleCompleteJob(order.id)}>
                                  <IndianRupee className="mr-2 h-4 w-4" />
                                  End Job & Get Paid
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="earnings">
              <Card>
                <CardHeader>
                  <CardTitle>Earnings Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Completed Jobs
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {earnings.completedJobs}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Hours
                        </CardTitle>
                        <Timer className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {Math.round(earnings.totalHours)}h
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Average Rating
                        </CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {earnings.averageRating.toFixed(1)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Completed Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-6">
                      {orders.history.map((order) => (
                        <Card key={order.id}>
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {order.services?.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Completed:{' '}
                                  {new Date(
                                    order.completed_at
                                  ).toLocaleString()}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Duration: {getJobDuration(order)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Payment collected:{' '}
                                  {new Date(
                                    order.payment_collected_at
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">₹{order.amount}</p>
                                <Badge className={getStatusBadge('completed')}>
                                  COMPLETED
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}