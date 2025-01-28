import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart, useAuth } from '@/lib/store';
import { ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  const createBookings = async () => {
    try {
      setIsLoading(true);
      
      // Get user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id, auth_id')
        .eq('email', user?.email)
        .single();

      if (!userData) throw new Error('User not found');

      // Create bookings
      for (const item of items) {
        // Get service ID
        const { data: serviceData } = await supabase
          .from('services')
          .select('id')
          .eq('name', item.serviceName)
          .single();

        if (!serviceData) throw new Error('Service not found');

        // Create booking
        const { error: bookingError } = await supabase
          .from('bookings')
          .insert({
            user_id: userData.id,
            service_id: serviceData.id,
            status: 'pending',
            scheduled_at: new Date(`${item.date}T${item.time}`).toISOString(),
            address: item.address,
            amount: parseInt(item.price.replace('₹', '')),
            metadata: {
              customer_name: item.name,
              customer_email: item.email,
              customer_phone: item.phone
            }
          });

        if (bookingError) throw bookingError;
      }

      clearCart();
      navigate('/checkout-success');
    } catch (error) {
      console.error('Error creating bookings:', error);
      toast({
        title: "Error",
        description: "Failed to create bookings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!items.length) {
    return null;
  }

  return (
    <div className="container py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="grid gap-8 md:grid-cols-3">
          {/* Order Summary */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h3 className="font-semibold">{item.serviceName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.date} at {item.time}
                        </p>
                        <p className="text-sm">{item.address}</p>
                      </div>
                      <p className="font-semibold">{item.price}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 border rounded-lg text-center">
                <ShieldCheck className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Professional Service</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">24/7 Support</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Satisfaction Guaranteed</p>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>
                      ₹{items.reduce((acc, item) => acc + parseInt(item.price.replace('₹', '')), 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service Tax</span>
                    <span>₹0</span>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>
                      ₹{items.reduce((acc, item) => acc + parseInt(item.price.replace('₹', '')), 0)}
                    </span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={createBookings}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Confirm Booking'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By clicking "Confirm Booking", you agree to our Terms of Service and Privacy Policy
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}