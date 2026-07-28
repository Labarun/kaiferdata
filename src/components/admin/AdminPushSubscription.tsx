import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const PUBLIC_VAPID_KEY = "BETfQPCOgVhgF9JpNx388hViZeAPp2VX8scW-Gt616PZGpyhDQr9PTtg8fKzUIagJyeiW8k-sI3pX-dW-shLe9c";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function AdminPushSubscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking push subscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribe = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });
      
      const subJSON = subscription.toJSON();
      
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subJSON.endpoint,
        auth_key: subJSON.keys?.auth,
        p256dh_key: subJSON.keys?.p256dh
      }, { onConflict: 'user_id, endpoint' });
      
      if (error) throw error;
      
      setIsSubscribed(true);
      toast({
        title: "Notifications Enabled",
        description: "You will now receive alerts for fallback orders.",
      });
    } catch (error: any) {
      console.error("Subscription failed:", error);
      toast({
        title: "Failed to enable notifications",
        description: error.message || "Please ensure you have granted notification permissions in your browser.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        const subJSON = subscription.toJSON();
        
        // Remove from database
        if (user && subJSON.endpoint) {
           await supabase.from('push_subscriptions')
             .delete()
             .eq('user_id', user.id)
             .eq('endpoint', subJSON.endpoint);
        }
      }
      
      setIsSubscribed(false);
      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive alerts on this device.",
      });
    } catch (error: any) {
      console.error("Unsubscribe failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null; // Don't show button if browser doesn't support Web Push
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-2" 
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <BellOff className="h-4 w-4 text-amber-500" />
      ) : (
        <Bell className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="hidden sm:inline">
        {isSubscribed ? "Disable Alerts" : "Enable Alerts"}
      </span>
    </Button>
  );
}
