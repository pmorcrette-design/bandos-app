"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  t,
  translateTaskPriority,
  translateTaskStatus,
  type Locale
} from "@/lib/i18n";
import { tasks as seededTasks } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useBandosUIStore } from "@/store/ui-store";

const taskColumns = ["todo", "in progress", "waiting", "done"] as const;

export function TasksView({
  locale
}: {
  locale: Locale;
}) {
  const view = useBandosUIStore((state) => state.taskView);
  const setView = useBandosUIStore((state) => state.setTaskView);
  const [tasks, setTasks] = useState(seededTasks);
  const [title, setTitle] = useState("");

  const tasksByStatus = useMemo(
    () =>
      taskColumns.reduce<Record<string, typeof tasks>>((accumulator, status) => {
        accumulator[status] = tasks.filter((task) => task.status === status);
        return accumulator;
      }, {}),
    [tasks]
  );

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-wrap gap-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t(
              locale,
              "Créer une tâche, par exemple : confirmer le deal de Sheffield",
              "Create a task, for example: confirm Sheffield settlement"
            )}
          />
          <Button
            type="button"
            onClick={() => {
              if (!title.trim()) {
                return;
              }
              setTasks((current) => [
                {
                  id: `${title}-${current.length}`,
                  title,
                  assignee: "Alex Mercer",
                  deadline: "2026-05-22",
                  priority: "medium",
                  status: "todo",
                  comments: 0,
                  attachments: 0
                },
                ...current
              ]);
              setTitle("");
            }}
          >
            <Plus className="h-4 w-4" />
            {t(locale, "Ajouter la tâche", "Add task")}
          </Button>
        </div>
        <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
          {(["list", "kanban", "calendar"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm capitalize transition",
                view === option
                  ? "bg-coral-500 text-white"
                  : "text-mist-300 hover:text-mist-50"
              )}
            >
              {t(
                locale,
                option === "list"
                  ? "liste"
                  : option === "kanban"
                    ? "kanban"
                    : "calendrier",
                option
              )}
            </button>
          ))}
        </div>
      </Card>

      {view === "list" ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-lg font-medium text-mist-50">{task.title}</p>
                  <p className="mt-2 text-sm text-mist-300">
                    {task.assignee} • {t(locale, "échéance", "due")} {task.deadline}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="accent">
                    {translateTaskPriority(locale, task.priority)}
                  </Badge>
                  <Badge>{translateTaskStatus(locale, task.status)}</Badge>
                  <Badge>
                    {task.comments} {t(locale, "commentaires", "comments")}
                  </Badge>
                  <Badge>
                    {task.attachments} {t(locale, "pièces jointes", "attachments")}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {view === "kanban" ? (
        <div className="grid gap-4 xl:grid-cols-4">
          {taskColumns.map((column) => (
            <Card key={column} className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium capitalize text-mist-50">
                  {translateTaskStatus(locale, column)}
                </p>
                <Badge>{tasksByStatus[column].length}</Badge>
              </div>
              <div className="space-y-3">
                {tasksByStatus[column].map((task) => (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"
                  >
                    <p className="text-sm font-medium text-mist-50">{task.title}</p>
                    <p className="mt-2 text-sm text-mist-300">{task.assignee}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone="accent">
                        {translateTaskPriority(locale, task.priority)}
                      </Badge>
                      <Badge>{task.deadline}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {view === "calendar" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            t(locale, "Lun", "Mon"),
            t(locale, "Mar", "Tue"),
            t(locale, "Mer", "Wed"),
            t(locale, "Jeu", "Thu")
          ].map((day, index) => (
            <Card key={day}>
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-coral-300" />
                <p className="text-sm font-medium text-mist-50">{day}</p>
              </div>
              <div className="mt-4 space-y-3">
                {tasks
                  .slice(index, index + 2)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"
                    >
                      <p className="text-sm font-medium text-mist-50">
                        {task.title}
                      </p>
                      <p className="mt-2 text-sm text-mist-300">{task.deadline}</p>
                    </div>
                  ))}
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
