import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckSquare,
  Plus,
  Search,
  Pencil,
  Calendar as CalendarIcon,
  Download,
  LayoutGrid,
  List,
  Filter,
  Clock,
  AlertCircle,
  User,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteButton } from "@/components/DeleteButton";
import { exportToCSV } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

type Task = {
  id: number;
  title: string;
  description?: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent" | null;
  dueDate?: Date | string | null;
  estimatedHours?: number | null;
  assignedToId?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string | null;
};

type ViewMode = "table" | "kanban" | "calendar";

export default function TasksEnhanced() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Task | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Fetch data
  const { data: tasks = [], isLoading, refetch } = trpc.tasks.list.useQuery();
  const { data: users = [] } = trpc.crud.customers.list.useQuery(); // Using customers as users for now

  // Mutations
  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created successfully");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      toast.success("Task deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast.success("Task updated successfully");
      setIsEditDialogOpen(false);
      setEditingItem(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  // Quick status update
  const quickUpdateStatus = (taskId: number, newStatus: Task["status"]) => {
    updateMutation.mutate({
      id: taskId,
      status: newStatus,
    });
  };

  // Check if task is overdue
  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === "completed" || task.status === "cancelled") {
      return false;
    }
    return new Date(task.dueDate) < new Date();
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task: Task) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.status?.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesOverdue = !showOverdueOnly || isOverdue(task);

      return matchesSearch && matchesStatus && matchesPriority && matchesOverdue;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, showOverdueOnly]);

  // Group tasks by status for Kanban view
  const tasksByStatus = useMemo(() => {
    const grouped: Record<Task["status"], Task[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };

    filteredTasks.forEach((task: Task) => {
      grouped[task.status].push(task);
    });

    return grouped;
  }, [filteredTasks]);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const dueDate = formData.get("dueDate") as string;
    const estimatedHours = formData.get("estimatedHours") as string;
    const assignedToId = formData.get("assignedToId") as string;

    createMutation.mutate({
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      status: (formData.get("status") as Task["status"]) || "pending",
      priority: (formData.get("priority") as Task["priority"]) || "medium",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedHours: estimatedHours ? parseInt(estimatedHours) : undefined,
      assignedToId: assignedToId && assignedToId !== "0" ? parseInt(assignedToId) : undefined,
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;

    const formData = new FormData(e.currentTarget);
    const dueDate = formData.get("dueDate") as string;
    const estimatedHours = formData.get("estimatedHours") as string;
    const assignedToId = formData.get("assignedToId") as string;

    updateMutation.mutate({
      id: editingItem.id,
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      status: (formData.get("status") as Task["status"]) || "pending",
      priority: (formData.get("priority") as Task["priority"]) || "medium",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedHours: estimatedHours ? parseInt(estimatedHours) : undefined,
      assignedToId: assignedToId && assignedToId !== "0" ? parseInt(assignedToId) : undefined,
    });
  };

  const getStatusBadge = (status: Task["status"]) => {
    const variants: Record<Task["status"], { variant: any; className: string }> = {
      pending: { variant: "outline", className: "border-gray-400 text-gray-700 bg-gray-50" },
      in_progress: { variant: "default", className: "bg-blue-100 text-blue-700 border-blue-300" },
      completed: { variant: "default", className: "bg-green-100 text-green-700 border-green-300" },
      cancelled: { variant: "destructive", className: "bg-red-100 text-red-700" },
    };
    const config = variants[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: Task["priority"]) => {
    if (!priority) return <Badge variant="outline">-</Badge>;
    
    const variants: Record<string, { className: string }> = {
      low: { className: "bg-gray-100 text-gray-600 border-gray-300" },
      medium: { className: "bg-blue-100 text-blue-600 border-blue-300" },
      high: { className: "bg-orange-100 text-orange-600 border-orange-300" },
      urgent: { className: "bg-red-100 text-red-600 border-red-300" },
    };
    const config = variants[priority];
    return (
      <Badge variant="outline" className={config.className}>
        {priority}
      </Badge>
    );
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const handleExportCSV = () => {
    const exportData = filteredTasks.map((task: Task) => ({
      Title: task.title || "",
      Description: task.description || "",
      Status: task.status?.replace("_", " ") || "",
      Priority: task.priority || "",
      "Due Date": formatDate(task.dueDate),
      "Estimated Hours": task.estimatedHours || "",
      Overdue: isOverdue(task) ? "Yes" : "No",
    }));
    exportToCSV(exportData, "tasks");
    toast.success("Tasks exported to CSV");
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const overdue = isOverdue(task);

    return (
      <Card
        className={cn(
          "mb-3 cursor-pointer hover:shadow-md transition-shadow",
          overdue && "border-red-300 bg-red-50"
        )}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold mb-1">{task.title}</CardTitle>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
              )}
            </div>
            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            {getPriorityBadge(task.priority)}
            {task.dueDate && (
              <Badge variant="outline" className="text-xs">
                <CalendarIcon className="w-3 h-3 mr-1" />
                {formatDate(task.dueDate)}
              </Badge>
            )}
            {overdue && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Overdue
              </Badge>
            )}
            {task.estimatedHours && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {task.estimatedHours}h
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setEditingItem(task);
                setIsEditDialogOpen(true);
              }}
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <DeleteButton
              itemName={task.title}
              onDelete={() => deleteMutation.mutate({ id: task.id })}
              size="sm"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  const KanbanColumn = ({ status, tasks }: { status: Task["status"]; tasks: Task[] }) => {
    const statusLabels: Record<Task["status"], string> = {
      pending: "Pending",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };

    const statusColors: Record<Task["status"], string> = {
      pending: "bg-gray-100 border-gray-300",
      in_progress: "bg-blue-100 border-blue-300",
      completed: "bg-green-100 border-green-300",
      cancelled: "bg-red-100 border-red-300",
    };

    return (
      <div className="flex-1 min-w-[280px]">
        <div className={cn("rounded-lg border-2 p-3 mb-3", statusColors[status])}>
          <h3 className="font-semibold flex items-center justify-between">
            <span>{statusLabels[status]}</span>
            <Badge variant="secondary">{tasks.length}</Badge>
          </h3>
        </div>
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </div>
    );
  };

  const TaskFormDialog = ({
    open,
    onOpenChange,
    onSubmit,
    task,
    title,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    task?: Task | null;
    title: string;
  }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {task ? "Update task details" : "Create a new task with details"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={task?.title}
                placeholder="e.g., Review inventory levels"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={task?.description || ""}
                placeholder="Task description and details"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={task?.status || "pending"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" defaultValue={task?.priority || "medium"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  defaultValue={
                    task?.dueDate
                      ? new Date(task.dueDate).toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  name="estimatedHours"
                  type="number"
                  min="0"
                  defaultValue={task?.estimatedHours || ""}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignedToId">Assign To</Label>
              <Select name="assignedToId" defaultValue={task?.assignedToId?.toString() || "0"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Unassigned</SelectItem>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name || user.email || `User ${user.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : task
                ? "Update Task"
                : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CheckSquare className="w-8 h-8 text-purple-600" />
            Tasks Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage tasks, assignments, and deadlines
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            {/* Overdue Filter */}
            <Button
              variant={showOverdueOnly ? "default" : "outline"}
              onClick={() => setShowOverdueOnly(!showOverdueOnly)}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Overdue Only
            </Button>

            {/* Export */}
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <div className="mb-4">
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              viewMode === "table" && "bg-background text-foreground shadow-sm"
            )}
          >
            <List className="w-4 h-4 mr-2" />
            Table View
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              viewMode === "kanban" && "bg-background text-foreground shadow-sm"
            )}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Kanban Board
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              viewMode === "calendar" && "bg-background text-foreground shadow-sm"
            )}
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Calendar View
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === "table" && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Est. Hours</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No tasks found. Add your first task to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task: Task) => {
                    const overdue = isOverdue(task);
                    return (
                      <TableRow
                        key={task.id}
                        className={cn(overdue && "bg-red-50 hover:bg-red-100")}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {task.title}
                            {overdue && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {task.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={task.status}
                            onValueChange={(value) =>
                              quickUpdateStatus(task.id, value as Task["status"])
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              {getStatusBadge(task.status)}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                        <TableCell>{formatDate(task.dueDate)}</TableCell>
                        <TableCell>{task.estimatedHours || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingItem(task);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <DeleteButton
                              itemName={task.title}
                              onDelete={() => deleteMutation.mutate({ id: task.id })}
                              size="sm"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
      )}

      {/* Kanban View */}
      {viewMode === "kanban" && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            <KanbanColumn status="pending" tasks={tasksByStatus.pending} />
            <KanbanColumn status="in_progress" tasks={tasksByStatus.in_progress} />
            <KanbanColumn status="completed" tasks={tasksByStatus.completed} />
            <KanbanColumn status="cancelled" tasks={tasksByStatus.cancelled} />
          </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
          <Card className="p-6">
            <div className="text-center py-12">
              <CalendarIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Calendar View Coming Soon</h3>
              <p className="text-muted-foreground">
                View and manage tasks on a calendar by due date
              </p>
            </div>
          </Card>
      )}

      {/* Create Dialog */}
      <TaskFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        title="Add New Task"
      />

      {/* Edit Dialog */}
      <TaskFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleEdit}
        task={editingItem}
        title="Edit Task"
      />
    </div>
  );
}
