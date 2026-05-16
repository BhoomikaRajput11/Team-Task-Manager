import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, projectMembersTable, tasksTable, usersTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { CreateProjectBody, UpdateProjectBody, AddProjectMemberBody } from "@workspace/api-zod";

const router = Router();

router.get("/projects", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === "admin";

    let projectIds: number[];

    if (isAdmin) {
      const allProjects = await db.select({ id: projectsTable.id }).from(projectsTable);
      projectIds = allProjects.map((p) => p.id);
    } else {
      const memberships = await db.select({ projectId: projectMembersTable.projectId })
        .from(projectMembersTable)
        .where(eq(projectMembersTable.userId, userId));
      projectIds = memberships.map((m) => m.projectId);
    }

    if (projectIds.length === 0) {
      res.json([]);
      return;
    }

    const projects = await db.select().from(projectsTable)
      .where(sql`${projectsTable.id} = ANY(ARRAY[${sql.join(projectIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
      .orderBy(projectsTable.createdAt);

    const enriched = await Promise.all(projects.map(async (project) => {
      const [taskCountResult] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.projectId, project.id));
      const [completedCountResult] = await db.select({ count: count() }).from(tasksTable).where(and(eq(tasksTable.projectId, project.id), eq(tasksTable.status, "completed")));
      const [memberCountResult] = await db.select({ count: count() }).from(projectMembersTable).where(eq(projectMembersTable.projectId, project.id));

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        createdById: project.createdById,
        createdAt: project.createdAt,
        taskCount: Number(taskCountResult?.count ?? 0),
        completedTaskCount: Number(completedCountResult?.count ?? 0),
        memberCount: Number(memberCountResult?.count ?? 0),
      };
    }));

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "List projects error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/projects", requireAuth, requireAdmin, async (req, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  try {
    const [project] = await db.insert(projectsTable).values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status ?? "active",
      createdById: req.user!.id,
    }).returning();

    await db.insert(projectMembersTable).values({
      projectId: project.id,
      userId: req.user!.id,
    });

    res.status(201).json({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      createdById: project.createdById,
      createdAt: project.createdAt,
      taskCount: 0,
      completedTaskCount: 0,
      memberCount: 1,
    });
  } catch (err) {
    req.log.error({ err }, "Create project error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/projects/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const memberRows = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(projectMembersTable)
      .innerJoin(usersTable, eq(projectMembersTable.userId, usersTable.id))
      .where(eq(projectMembersTable.projectId, id));

    const taskRows = await db
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
        assigneeName: usersTable.name,
        assigneeEmail: usersTable.email,
        assigneeRole: usersTable.role,
        assigneeCreatedAt: usersTable.createdAt,
      })
      .from(tasksTable)
      .leftJoin(usersTable, eq(tasksTable.assignedToId, usersTable.id))
      .where(eq(tasksTable.projectId, id));

    const now = new Date();
    const tasks = taskRows.map((t) => ({
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
      assignedTo: t.assignedToId ? {
        id: t.assignedToId,
        name: t.assigneeName!,
        email: t.assigneeEmail!,
        role: t.assigneeRole!,
        createdAt: t.assigneeCreatedAt!,
      } : null,
      project: { id: project.id, title: project.title },
    }));

    res.json({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      createdById: project.createdById,
      createdAt: project.createdAt,
      members: memberRows,
      tasks,
    });
  } catch (err) {
    req.log.error({ err }, "Get project error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/projects/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  try {
    const updates: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;

    const [project] = await db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).returning();
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [taskCountResult] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.projectId, id));
    const [completedCountResult] = await db.select({ count: count() }).from(tasksTable).where(and(eq(tasksTable.projectId, id), eq(tasksTable.status, "completed")));
    const [memberCountResult] = await db.select({ count: count() }).from(projectMembersTable).where(eq(projectMembersTable.projectId, id));

    res.json({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      createdById: project.createdById,
      createdAt: project.createdAt,
      taskCount: Number(taskCountResult?.count ?? 0),
      completedTaskCount: Number(completedCountResult?.count ?? 0),
      memberCount: Number(memberCountResult?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Update project error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/projects/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete project error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/projects/:id/members", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const parsed = AddProjectMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  try {
    const [member] = await db.insert(projectMembersTable).values({
      projectId: id,
      userId: parsed.data.userId,
    }).returning();

    res.status(201).json(member);
  } catch (err) {
    req.log.error({ err }, "Add member error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/projects/:id/members/:userId", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const userId = parseInt(String(req.params.userId));
  if (isNaN(id) || isNaN(userId)) {
    res.status(400).json({ error: "Invalid ids" });
    return;
  }

  try {
    await db.delete(projectMembersTable).where(
      and(eq(projectMembersTable.projectId, id), eq(projectMembersTable.userId, userId))
    );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Remove member error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
