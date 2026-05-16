import { useState } from "react";
import { 
  useListTasks, 
  getListTasksQueryKey,
  useUpdateTask,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { CheckSquare, AlertCircle, Filter } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Tasks() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "my">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Build query params based on filters
  const queryParams: any = {};
  if (filter === "my" && currentUser) {
    queryParams.assignedToId = currentUser.id;
  }
  if (statusFilter !== "all") {
    queryParams.status = statusFilter;
  }

  const { data: tasks, isLoading } = useListTasks({ query: queryParams });
  const updateTaskMutation = useUpdateTask();

  const handleStatusChange = (taskId: number, newStatus: "todo" | "in_progress" | "completed") => {
    updateTaskMutation.mutate({
      id: taskId,
      data: { status: newStatus }
    }, {
      onSuccess: () => {
        // Invalidate both potential query keys to ensure freshness
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    });
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="animate-pulse h-24"></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage and track work items</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-muted/30 p-2 rounded-lg border border-border">
        <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="my">Assigned to Me</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {!tasks || tasks.length === 0 ? (
          <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
            <CheckSquare className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground max-w-sm">
              Try adjusting your filters or create new tasks in projects.
            </p>
          </Card>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border border-border bg-card shadow-sm hover:shadow transition-shadow">
              <div className="flex items-start gap-3 w-full sm:w-auto">
                <div className="mt-1">
                  <Select 
                    value={task.status} 
                    onValueChange={(v: any) => handleStatusChange(task.id, v)}
                  >
                    <SelectTrigger className="w-12 h-6 p-0 flex items-center justify-center border-none shadow-none focus:ring-0 bg-transparent">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        task.status === 'completed' ? 'border-emerald-500 bg-emerald-500' :
                        task.status === 'in_progress' ? 'border-blue-500 border-t-transparent animate-spin-slow' :
                        'border-muted-foreground'
                      }`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-sm">
                      {task.project?.title || "No Project"}
                    </span>
                  </div>
                  <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="outline" className={
                      task.priority === 'high' ? 'border-red-200 text-red-700 bg-red-50' : 
                      task.priority === 'medium' ? 'border-orange-200 text-orange-700 bg-orange-50' : 
                      'border-gray-200 text-gray-700 bg-gray-50'
                    }>
                      {task.priority}
                    </Badge>
                    {task.dueDate && (
                      <span className={`text-xs flex items-center gap-1 ${task.isOverdue && task.status !== 'completed' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        {task.isOverdue && task.status !== 'completed' && <AlertCircle className="h-3 w-3" />}
                        {format(new Date(task.dueDate), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-4 sm:mt-0 ml-7 sm:ml-0 self-end sm:self-auto min-w-[120px] justify-end">
                {task.assignedTo ? (
                  <div className="flex items-center gap-2" title={`Assigned to ${task.assignedTo.name}`}>
                    <span className="text-xs text-muted-foreground hidden sm:inline-block">
                      {task.assignedTo.name.split(' ')[0]}
                    </span>
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {getInitials(task.assignedTo.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic bg-muted px-2 py-1 rounded">Unassigned</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
