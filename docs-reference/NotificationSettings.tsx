import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Bell, Send, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function NotificationSettings() {
  const [tenderDays, setTenderDays] = useState(7);
  
  const checkTenderMutation = trpc.notifications.checkTenderClosing.useMutation();
  const checkInventoryMutation = trpc.notifications.checkLowInventory.useMutation();
  const sendTestMutation = trpc.notifications.sendTest.useMutation();

  const handleCheckTenders = async () => {
    try {
      const result = await checkTenderMutation.mutateAsync({ daysAhead: tenderDays });
      toast.success(`Checked tenders: ${result.sent} notification(s) sent`);
    } catch (error: any) {
      toast.error(error.message || "Failed to check tenders");
    }
  };

  const handleCheckInventory = async () => {
    try {
      const result = await checkInventoryMutation.mutateAsync();
      toast.success(`Inventory checked: ${result.sent} notification(s) sent`);
    } catch (error: any) {
      toast.error(error.message || "Failed to check inventory");
    }
  };

  const handleSendTest = async () => {
    try {
      const result = await sendTestMutation.mutateAsync();
      if (result.sent) {
        toast.success("Test notification sent successfully!");
      } else {
        toast.error("Failed to send test notification");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send test notification");
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure alerts and notifications for your business
        </p>
      </div>

      {/* Tender Closing Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Tender Closing Alerts
          </CardTitle>
          <CardDescription>
            Get notified when tenders are approaching their closing date
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Check tenders closing within (days)</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={tenderDays}
                onChange={(e) => setTenderDays(parseInt(e.target.value))}
                className="max-w-xs mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Recommended: 7 days for weekly checks, 3 days for urgent alerts
              </p>
            </div>
            <Button onClick={handleCheckTenders} disabled={checkTenderMutation.isPending}>
              {checkTenderMutation.isPending ? "Checking..." : "Check Now"}
            </Button>
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm">
              <strong>How it works:</strong> This will check all open tenders and send notifications for any that are closing within the specified number of days.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Low Inventory Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Low Inventory Alerts
          </CardTitle>
          <CardDescription>
            Get notified when inventory items are low or out of stock
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable low stock alerts</p>
              <p className="text-sm text-muted-foreground">
                Receive notifications when items fall below minimum stock levels
              </p>
            </div>
            <Button onClick={handleCheckInventory} disabled={checkInventoryMutation.isPending}>
              {checkInventoryMutation.isPending ? "Checking..." : "Check Now"}
            </Button>
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm">
              <strong>How it works:</strong> This will check all inventory items and send a notification listing items that are out of stock or below their minimum stock level.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive alerts via email (currently enabled via Manus platform)
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            
            <div className="flex items-center justify-between opacity-50">
              <div>
                <p className="font-medium">WhatsApp Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive alerts via WhatsApp (coming soon)
                </p>
              </div>
              <Switch disabled />
            </div>
            
            <div className="flex items-center justify-between opacity-50">
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive alerts via SMS (coming soon)
                </p>
              </div>
              <Switch disabled />
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSendTest} disabled={sendTestMutation.isPending} variant="outline">
              {sendTestMutation.isPending ? "Sending..." : "Send Test Notification"}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Send a test notification to verify your settings are working correctly
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Automation */}
      <Card>
        <CardHeader>
          <CardTitle>Automated Checks (Coming Soon)</CardTitle>
          <CardDescription>
            Schedule automatic notification checks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 opacity-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Daily tender check</p>
                <p className="text-sm text-muted-foreground">
                  Automatically check for closing tenders every day at 9:00 AM
                </p>
              </div>
              <Switch disabled />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Weekly inventory check</p>
                <p className="text-sm text-muted-foreground">
                  Automatically check inventory levels every Monday at 8:00 AM
                </p>
              </div>
              <Switch disabled />
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            Automated scheduling will be available in a future update. For now, use the "Check Now" buttons above to manually trigger notifications.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
