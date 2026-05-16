import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { 
  useGetProject, 
  getGetProjectQueryKey,
  useListUsers,
  useAddProjectMember,
  useRemoveProjectMember,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useUpdateProject,
  useDeleteProject
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  CheckSquare, 
  Plus, 
  Trash2, 
  MoreVertical, 
  Settings,
  AlertCircle
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const createTaskSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "completed"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().optional().nullable(),
  assignedToId: z.coerce.number().optional().nullable(),
});

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState<string>("");

  const { data: project, isLoading: isProjectLoading } = useGetProject(projectId, { 
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } 
  });
  
  const { data: users } = useListUsers({ query: { enabled: currentUser?.role === "admin" }});

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const addMemberMutation = useAddProjectMember();
  const removeMemberMutation = useRemoveProjectMember();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const taskForm = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
    },
  });

  const onTaskSubmit = (values: z.infer<typeof createTaskSchema>) => {
    createTaskMutation.mutate({ 
      data: { 
        ...values, 
        projectId,
        assignedToId: values.assignedToId || null,
        dueDate: values.dueDate || null 
      } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        setIsCreateTaskOpen(false);
        taskForm.reset();
        toast({ title: "Task created successfully" });
      },
      onError: (err: any) => {
        toast({ title: "Failed to create task", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleStatusChange = (taskId: number, newStatus: "todo" | "in_progress" | "completed") => {
    updateTaskMutation.mutate({
      id: taskId,
      data: { status: newStatus }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      }
    });
  };

  const handleAddMember = () => {
    if (!memberToAdd) return;
    addMemberMutation.mutate({
      projectId,
      data: { userId: parseInt(memberToAdd) }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        setIsAddMemberOpen(false);
        setMemberToAdd("");
        toast({ title: "Member added successfully" });
      },
      onError: (err: any) => {
        toast({ title: "Failed to add member", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleRemoveMember = (userId: number) => {
    removeMemberMutation.mutate({
      projectId,
      userId
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        toast({ title: "Member removed successfully" });
      }
    });
  };

  const handleDeleteProject = () => {
    deleteProjectMutation.mutate({ id: projectId }, {
      onSuccess: () => {
        toast({ title: "Project deleted" });
        setLocation("/projects");
      }
    });
  };

  if (isProjectLoading) {
    return <div className="p-8 text-center animate-pulse">Loading project...</div>;
  }

  if (!project) {
    return <div className="p-8 text-center text-muted-foreground">Project not found</div>;
  }

  const completedTasksCount = project.tasks?.filter(t => t.status === 'completed').length || 0;
  const totalTasksCount = project.tasks?.length || 0;
  const progress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);

  // Filter available users for adding (not already in project)
  const availableUsers = users?.filter(u => !project.members?.some(m => m.id === u.id)) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/projects")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm text-muted-foreground font-medium">Back to Projects</div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{project.title}</h1>
            <Badge className={
              project.status === 'active' ? 'bg-blue-100 text-blue-800' :
              project.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
              'bg-amber-100 text-amber-800'
            } variant="outline">
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 max-w-3xl">{project.description}</p>
        </div>
        
        {currentUser?.role === "admin" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsAddMemberOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              Add Member
            </Button>
            <Button onClick={() => setIsCreateTaskOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Project Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  updateProjectMutation.mutate({ 
                    id: projectId, 
                    data: { status: project.status === 'active' ? 'completed' : 'active' } 
                  }, {
                    onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) })
                  });
                }}>
                  Mark as {project.status === 'active' ? 'Completed' : 'Active'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => setIsDeleteAlertOpen(true)}>
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="col-span-1 md:col-span-3 border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span>Overall Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 mb-4" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground font-medium mb-1">Total Tasks</div>
                <div className="text-2xl font-bold">{totalTasksCount}</div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground font-medium mb-1">Completed</div>
                <div className="text-2xl font-bold text-emerald-600">{completedTasksCount}</div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground font-medium mb-1">In Progress</div>
                <div className="text-2xl font-bold text-blue-600">{project.tasks?.filter(t => t.status === 'in_progress').length || 0}</div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground font-medium mb-1">Overdue</div>
                <div className="text-2xl font-bold text-red-600">{project.tasks?.filter(t => t.isOverdue).length || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground block text-xs">Created on</span>
                <span className="font-medium">{format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground block text-xs">Team Size</span>
                <span className="font-medium">{project.members?.length || 0} members</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks">
          <div className="space-y-4">
            {project.tasks && project.tasks.length > 0 ? (
              project.tasks.map(task => (
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
                      <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                      )}
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
                            {format(new Date(task.dueDate), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-4 sm:mt-0 ml-7 sm:ml-0 self-end sm:self-auto">
                    {task.assignedTo ? (
                      <div className="flex items-center gap-2" title={`Assigned to ${task.assignedTo.name}`}>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {getInitials(task.assignedTo.name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">Unassigned</div>
                    )}
                    
                    {currentUser?.role === "admin" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              deleteTaskMutation.mutate({ id: task.id }, {
                                onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) })
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-12 border border-dashed rounded-lg bg-muted/10">
                <CheckSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-medium mb-1">No tasks yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create the first task to get this project moving.</p>
                {currentUser?.role === "admin" && (
                  <Button variant="outline" onClick={() => setIsCreateTaskOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Task
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="members">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {project.members?.map(member => (
              <Card key={member.id} className="border-border shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{member.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{member.role}</div>
                    </div>
                  </div>
                  {currentUser?.role === "admin" && project.members && project.members.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-red-600 h-8 w-8"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Add a new task to {project.title}.</DialogDescription>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4">
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Task summary" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detailed instructions..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="assignedToId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Unassigned</SelectItem>
                          {project.members?.map(m => (
                            <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateTaskOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Select a user to add to this project.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {availableUsers.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground p-4">
                No users available to add.
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select User</label>
                <Select value={memberToAdd} onValueChange={setMemberToAdd}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={!memberToAdd || addMemberMutation.isPending}>
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              and all of its associated tasks and member assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
