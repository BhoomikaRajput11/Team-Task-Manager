import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, projectsTable } from "@workspace/db";
import { eq, count, lt, and, ne, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/dashboard/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const now = new Date();

    const [totalProjectsResult] = await db.select({ count: count() }).from(projectsTable);
    const [activeProjectsResult] = await db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.status, "active"));
    const [totalTasksResult] = await db.select({ count: count() }).from(tasksTable);
    const [completedTasksResult] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.status, "completed"));
    const [overdueTasksResult] = await db.select({ count: count() }).from(tasksTable).where(
      and(
        lt(tasksTable.dueDate, now),
        ne(tasksTable.status, "completed")
      )
    );
    const [myTasksResult] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.assignedToId, userId));

    res.json({
      totalProjects: Number(totalProjectsResult?.count ?? 0),
      activeProjects: Number(activeProjectsResult?.count ?? 0),
      totalTasks: Number(totalTasksResult?.count ?? 0),
      completedTasks: Number(completedTasksResult?.count ?? 0),
      overdueTasks: Number(overdueTasksResult?.count ?? 0),
      myTasks: Number(myTasksResult?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
