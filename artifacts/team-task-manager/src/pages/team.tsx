import { useListUsers } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Users, ShieldAlert, Mail, CalendarDays } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function Team() {
  const { data: users, isLoading } = useListUsers();

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse h-32"></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Team Members</h1>
        <p className="text-muted-foreground mt-1">Manage people and their roles across the workspace</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users?.map(user => (
          <Card key={user.id} className="border-border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 flex flex-row items-start gap-4 space-y-0">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarFallback className={user.role === 'admin' ? 'bg-primary/20 text-primary font-bold' : 'bg-muted text-muted-foreground font-medium'}>
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{user.name}</CardTitle>
                  <Badge variant="secondary" className={user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}>
                    {user.role}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                <CalendarDays className="h-3 w-3" />
                Joined {format(new Date(user.createdAt), 'MMMM d, yyyy')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
