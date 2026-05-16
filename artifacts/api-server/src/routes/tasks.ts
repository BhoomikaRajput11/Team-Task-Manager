import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, projectsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { CreateTaskBody, UpdateTaskBody } from "@workspace/api-zod";

const router = Router();

router.get("/tasks", requireAuth, async (req, res) => {
  try {
    const { projectId, assignedToId, status } = req.query;

    const conditions = [];
    if (projectId) conditions.push(eq(tasksTable.projectId, parseInt(projectId as string)));
    if (assignedToId) conditions.push(eq(tasksTable.assignedToId, parseInt(assignedToId as string)));
    if (status) conditions.push(eq(tasksTable.status, status as "todo" | "in_progress" | "completed"));

    const rows = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        projectId: tasksTable.projectId,
        assignedToId: tasksTable.assignedToId,
        createdById: tasksTable.createdById,
        createdAt: tasksTable.createdAt,
        assigneeId: usersTable.id,
        assigneeName: usersTable.name,
        assigneeEmail: usersTable.email,
        assigneeRole: usersTable.role,
        assigneeCreatedAt: usersTable.createdAt,
        projectTitle: projectsTable.title,
      })
      .from(tasksTable)
      .leftJoin(usersTable, eq(tasksTable.assignedToId, usersTable.id))
      .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(tasksTable.createdAt);

    const now = new Date();
    const tasks = rows.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      projectId: t.projectId,
      assignedToId: t.assignedToId,
      createdById: t.createdById,
      createdAt: t.createdAt,
      isOverdue: t.dueDate != null && t.dueDate < now && t.status !== "completed",
      assignedTo: t.assigneeId ? {
        id: t.assigneeId,
        name: t.assigneeName!,
        email: t.assigneeEmail!,
        role: t.assigneeRole!,
        createdAt: t.assigneeCreatedAt!,
      } : null,
      project: t.projectTitle ? { id: t.projectId, title: t.projectTitle } : null,
    }));

    res.json(tasks);
  } catch (err) {
    req.log.error({ err }, "List tasks error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks", requireAuth, requireAdmin, async (req, res) => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  try {
    const [task] = await db.insert(tasksTable).values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: (parsed.data.status as "todo" | "in_progress" | "completed") ?? "todo",
      priority: (parsed.data.priority as "low" | "medium" | "high") ?? "medium",
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      projectId: parsed.data.projectId,
      assignedToId: parsed.data.assignedToId ?? null,
      createdById: req.user!.id,
    }).returning();

    const [project] = await db.select({ id: projectsTable.id, title: projectsTable.title }).from(projectsTable).where(eq(projectsTable.id, task.projectId)).limit(1);

    let assignedTo = null;
    if (task.assignedToId) {
      const [assignee] = await db.select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      }).from(usersTable).where(eq(usersTable.id, task.assignedToId)).limit(1);
      assignedTo = assignee ?? null;
    }

    const now = new Date();
    res.status(201).json({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      projectId: task.projectId,
      assignedToId: task.assignedToId,
      createdById: task.createdById,
      createdAt: task.createdAt,
      isOverdue: task.dueDate != null && task.dueDate < now && task.status !== "completed",
      assignedTo,
      project: project ? { id: project.id, title: project.title } : null,
    });
  } catch (err) {
    req.log.error({ err }, "Create task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tasks/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  try {
    const [row] = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        projectId: tasksTable.projectId,
        assignedToId: tasksTable.assignedToId,
        createdById: tasksTable.createdById,
        createdAt: tasksTable.createdAt,
        assigneeId: usersTable.id,
        assigneeName: usersTable.name,
        assigneeEmail: usersTable.email,
        assigneeRole: usersTable.role,
        assigneeCreatedAt: usersTable.createdAt,
        projectTitle: projectsTable.title,
      })
      .from(tasksTable)
      .leftJoin(usersTable, eq(tasksTable.assignedToId, usersTable.id))
      .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
      .where(eq(tasksTable.id, id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const now = new Date();
    res.json({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      dueDate: row.dueDate,
      projectId: row.projectId,
      assignedToId: row.assignedToId,
      createdById: row.createdById,
      createdAt: row.createdAt,
      isOverdue: row.dueDate != null && row.dueDate < now && row.status !== "completed",
      assignedTo: row.assigneeId ? {
        id: row.assigneeId,
        name: row.assigneeName!,
        email: row.assigneeEmail!,
        role: row.assigneeRole!,
        createdAt: row.assigneeCreatedAt!,
      } : null,
      project: row.projectTitle ? { id: row.projectId, title: row.projectTitle } : null,
    });
  } catch (err) {
    req.log.error({ err }, "Get task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/tasks/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  try {
    const updates: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
    if (parsed.data.dueDate !== undefined) updates.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
    if (parsed.data.assignedToId !== undefined) updates.assignedToId = parsed.data.assignedToId;

    const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).returning();
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const [project] = await db.select({ id: projectsTable.id, title: projectsTable.title }).from(projectsTable).where(eq(projectsTable.id, task.projectId)).limit(1);

    let assignedTo = null;
    if (task.assignedToId) {
      const [assignee] = await db.select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      }).from(usersTable).where(eq(usersTable.id, task.assignedToId)).limit(1);
      assignedTo = assignee ?? null;
    }

    const now = new Date();
    res.json({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      projectId: task.projectId,
      assignedToId: task.assignedToId,
      createdById: task.createdById,
      createdAt: task.createdAt,
      isOverdue: task.dueDate != null && task.dueDate < now && task.status !== "completed",
      assignedTo,
      project: project ? { id: project.id, title: project.title } : null,
    });
  } catch (err) {
    req.log.error({ err }, "Update task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tasks/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }

  try {
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
