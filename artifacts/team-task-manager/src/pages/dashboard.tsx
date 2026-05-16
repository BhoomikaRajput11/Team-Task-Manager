import { useGetDashboardStats, useListTasks } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { 
  FolderKanban, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  LayoutList
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: tasks, isLoading: tasksLoading } = useListTasks();

  const recentTasks = tasks?.slice(0, 5) || [];

  if (statsLoading || tasksLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20"></CardHeader>
              <CardContent className="h-10"></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Projects",
      value: stats?.activeProjects || 0,
      total: stats?.totalProjects || 0,
      icon: FolderKanban,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "My Tasks",
      value: stats?.myTasks || 0,
      total: null,
      icon: LayoutList,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100"
    },
    {
      title: "Completed Tasks",
      value: stats?.completedTasks || 0,
      total: stats?.totalTasks || 0,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100"
    },
    {
      title: "Overdue",
      value: stats?.overdueTasks || 0,
      total: null,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100"
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your team's progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="shadow-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stat.value}
                  {stat.total !== null && <span className="text-sm text-muted-foreground font-normal ml-1">/ {stat.total}</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found.
            </div>
          ) : (
            <div className="space-y-4">
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div>
                    <h4 className="font-medium">{task.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>{task.project?.title || "No Project"}</span>
                      {task.dueDate && (
                        <span className={task.isOverdue ? "text-red-600 font-medium" : ""}>
                          Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={
                      task.priority === 'high' ? 'border-red-200 text-red-700 bg-red-50' : 
                      task.priority === 'medium' ? 'border-orange-200 text-orange-700 bg-orange-50' : 
                      'border-gray-200 text-gray-700 bg-gray-50'
                    }>
                      {task.priority}
                    </Badge>
                    <Badge className={
                      task.status === 'completed' ? 'bg-emerald-500 hover:bg-emerald-600' :
                      task.status === 'in_progress' ? 'bg-blue-500 hover:bg-blue-600' :
                      'bg-gray-500 hover:bg-gray-600'
                    }>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
