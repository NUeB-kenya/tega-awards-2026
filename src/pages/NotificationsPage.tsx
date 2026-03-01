import { useNotifications } from '@/hooks/useNotifications';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const typeColors: Record<string, string> = {
    success: 'bg-success/20 text-success',
    error: 'bg-destructive/20 text-destructive',
    warning: 'bg-warning/20 text-warning',
    info: 'bg-primary/20 text-primary',
  };

  const handleClick = (n: any) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">
              <span className="text-gradient-gold">Notifications</span>
            </h1>
            <p className="text-muted-foreground mt-1">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card className="glass-card py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <Card
                key={n.id}
                className={`glass-card cursor-pointer transition-all hover:border-primary/30 ${!n.is_read ? 'border-l-4 border-l-primary' : ''}`}
                onClick={() => handleClick(n)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{n.title}</h3>
                      <Badge className={`${typeColors[n.type] || typeColors.info} border-0 text-[10px]`}>{n.type}</Badge>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {n.link && (
                    <Badge variant="outline" className="text-[10px] border-border shrink-0">Open →</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
