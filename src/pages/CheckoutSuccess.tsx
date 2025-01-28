import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function CheckoutSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // After 5 seconds, redirect to home
    const timer = setTimeout(() => {
      navigate('/');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1
                }}
                className="p-3 rounded-full bg-green-100"
              >
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </motion.div>
            </div>
            <CardTitle className="text-2xl text-center">Booking Confirmed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Thank you for your booking. We'll send you an email confirmation shortly.
            </p>
            <div className="space-x-4">
              <Button onClick={() => navigate('/')}>
                Return Home
              </Button>
              <Button variant="outline" onClick={() => navigate('/profile')}>
                View Bookings
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Redirecting to home page in 5 seconds...
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}