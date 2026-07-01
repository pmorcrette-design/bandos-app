"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  t,
  translateTaskPriority,
  translateTaskStatus,
  type Locale
} from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useBandosUIStore } from "@/store/ui-store";

const taskColumns = ["todo", "in progress", "waiting", "done"] as const;
const taskPriorities = ["low", "medium", "high", "critical"] as const;

export function TasksView({
  locale
}: {
  locale: Locale;
}) {
  const tasks = useBandosUIStore((state) => state.workspaceTasks);
  const addWorkspaceTask = useBandosUIStore((state) => state.addWorkspaceTask);
  const updateWorkspaceTask = useBandosUIStore((state) => state.updateWorkspaceTask);
  const moveWorkspaceTask = useBandosUIStore((state) => state.moveWorkspaceTask);
  const deleteWorkspaceTask = useBandosUIStore((state) => state.deleteWorkspaceTask);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<(typeof taskPriorities)[number]>("medium");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const tasksByStatus = useMemo(
    () =>
      taskColumns.reduce<Record<(typeof taskColumns)[number], typeof tasks>>(
        (accumulator, status) => {
          accumulator[status] = tasks.filter((task) => task.status === status);
          return accumulator;
        },
        {
          todo: [],
          "in progress": [],
          waiting: [],
          done: []
        }
      ),
    [tasks]
  );

  const selectedTask =
    tasks.find((task) => task.id === selectedTaskId) ?? null;

  function createTask() {
    if (!title.trim()) {
      return;
    }

    addWorkspaceTask({
      title,
      assignee,
      deadline,
      priority,
      status: "todo",
      comments: 0,
      attachments: 0
    });

    setTitle("");
    setAssignee("");
    setDeadline("");
    setPriority("medium");
  }

  function moveTaskRelative(
    taskId: string,
    direction: "left" | "right",
    currentStatus: (typeof taskColumns)[number]
  ) {
    const currentIndex = taskColumns.indexOf(currentStatus);
    const nextIndex =
      direction === "left" ? currentIndex - 1 : currentIndex + 1;
    const nextStatus = taskColumns[nextIndex];

    if (!nextStatus) {
      return;
    }

    moveWorkspaceTask(taskId, nextStatus);
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <p className="text-lg font-medium text-mist-50">
            {t(locale, "Ajouter une tâche", "Add a task")}
          </p>
          <p className="mt-2 text-sm text-mist-300">
            {t(
              locale,
              "Le kanban sauvegarde maintenant les tâches du workspace. Tu peux les déplacer, les éditer et les supprimer sans changer de vue.",
              "The kanban now saves workspace tasks. You can move, edit, and delete them without changing views."
            )}
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[2fr,1.2fr,1fr,0.9fr,auto]">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t(
              locale,
              "Ex. confirmer l'hôtel de Sheffield",
              "e.g. confirm the Sheffield hotel"
            )}
          />
          <Input
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            placeholder={t(locale, "Assigné", "Assignee")}
          />
          <Input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as (typeof taskPriorities)[number])
            }
            className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
          >
            {taskPriorities.map((option) => (
              <option key={option} value={option} className="bg-graphite-900">
                {translateTaskPriority(locale, option)}
              </option>
            ))}
          </select>
          <Button type="button" onClick={createTask}>
            <Plus className="h-4 w-4" />
            {t(locale, "Ajouter", "Add")}
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-4">
        {taskColumns.map((column) => (
          <Card
            key={column}
            className="flex min-h-[540px] flex-col p-4"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();

              if (!draggedTaskId) {
                return;
              }

              moveWorkspaceTask(draggedTaskId, column);
              setDraggedTaskId(null);
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium capitalize text-mist-50">
                  {translateTaskStatus(locale, column)}
                </p>
                <p className="mt-1 text-xs text-mist-300">
                  {t(locale, "Glisse une carte ici", "Drop a card here")}
                </p>
              </div>
              <Badge>{tasksByStatus[column].length}</Badge>
            </div>

            <div className="flex flex-1 flex-col gap-3">
              {tasksByStatus[column].length ? (
                tasksByStatus[column].map((task) => (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={() => setDraggedTaskId(task.id)}
                    onDragEnd={() => setDraggedTaskId(null)}
                    onClick={() => setSelectedTaskId(task.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedTaskId(task.id);
                      }
                    }}
                    className={cn(
                      "rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.05]",
                      draggedTaskId === task.id && "opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-mist-50">{task.title}</p>
                        <p className="mt-2 text-sm text-mist-300">
                          {task.assignee || t(locale, "Non assigné", "Unassigned")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteWorkspaceTask(task.id);
                          if (selectedTaskId === task.id) {
                            setSelectedTaskId(null);
                          }
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-mist-300 transition hover:bg-white/10 hover:text-mist-50"
                        aria-label={t(locale, "Supprimer la tâche", "Delete task")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge tone="accent">
                        {translateTaskPriority(locale, task.priority)}
                      </Badge>
                      {task.deadline ? <Badge>{task.deadline}</Badge> : null}
                      {task.comments ? (
                        <Badge>
                          {task.comments} {t(locale, "commentaires", "comments")}
                        </Badge>
                      ) : null}
                      {task.attachments ? (
                        <Badge>
                          {task.attachments} {t(locale, "pièces jointes", "attachments")}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={column === "todo"}
                          onClick={(event) => {
                            event.stopPropagation();
                            moveTaskRelative(task.id, "left", column);
                          }}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={column === "done"}
                          onClick={(event) => {
                            event.stopPropagation();
                            moveTaskRelative(task.id, "right", column);
                          }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <span className="text-xs text-mist-400">
                        {t(locale, "Cliquer pour éditer", "Click to edit")}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-mist-400">
                  {t(locale, "Aucune tâche dans cette colonne.", "No task in this column.")}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTaskId(null)}
        title={selectedTask?.title || t(locale, "Éditer la tâche", "Edit task")}
        description={t(
          locale,
          "Chaque modification est enregistrée dans le workspace sans changer le reste de ton organisation.",
          "Every edit is saved to the workspace without changing the rest of your setup."
        )}
      >
        {selectedTask ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-mist-300">
                <span>{t(locale, "Titre", "Title")}</span>
                <Input
                  value={selectedTask.title}
                  onChange={(event) =>
                    updateWorkspaceTask(selectedTask.id, {
                      title: event.target.value
                    })
                  }
                />
              </label>
              <label className="space-y-2 text-sm text-mist-300">
                <span>{t(locale, "Assigné", "Assignee")}</span>
                <Input
                  value={selectedTask.assignee}
                  onChange={(event) =>
                    updateWorkspaceTask(selectedTask.id, {
                      assignee: event.target.value
                    })
                  }
                />
              </label>
              <label className="space-y-2 text-sm text-mist-300">
                <span>{t(locale, "Échéance", "Deadline")}</span>
                <Input
                  type="date"
                  value={selectedTask.deadline}
                  onChange={(event) =>
                    updateWorkspaceTask(selectedTask.id, {
                      deadline: event.target.value
                    })
                  }
                />
              </label>
              <label className="space-y-2 text-sm text-mist-300">
                <span>{t(locale, "Priorité", "Priority")}</span>
                <select
                  value={selectedTask.priority}
                  onChange={(event) =>
                    updateWorkspaceTask(selectedTask.id, {
                      priority: event.target.value as (typeof taskPriorities)[number]
                    })
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                >
                  {taskPriorities.map((option) => (
                    <option key={option} value={option} className="bg-graphite-900">
                      {translateTaskPriority(locale, option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-mist-300">
                <span>{t(locale, "Colonne", "Column")}</span>
                <select
                  value={selectedTask.status}
                  onChange={(event) =>
                    moveWorkspaceTask(
                      selectedTask.id,
                      event.target.value as (typeof taskColumns)[number]
                    )
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 outline-none"
                >
                  {taskColumns.map((column) => (
                    <option key={column} value={column} className="bg-graphite-900">
                      {translateTaskStatus(locale, column)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-mist-300">
                <span>{t(locale, "Commentaires", "Comments")}</span>
                <Input
                  type="number"
                  min={0}
                  value={selectedTask.comments}
                  onChange={(event) =>
                    updateWorkspaceTask(selectedTask.id, {
                      comments: Math.max(0, Number(event.target.value) || 0)
                    })
                  }
                />
              </label>
              <label className="space-y-2 text-sm text-mist-300">
                <span>{t(locale, "Pièces jointes", "Attachments")}</span>
                <Input
                  type="number"
                  min={0}
                  value={selectedTask.attachments}
                  onChange={(event) =>
                    updateWorkspaceTask(selectedTask.id, {
                      attachments: Math.max(0, Number(event.target.value) || 0)
                    })
                  }
                />
              </label>
            </div>

            <div className="flex justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  deleteWorkspaceTask(selectedTask.id);
                  setSelectedTaskId(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t(locale, "Supprimer la tâche", "Delete task")}
              </Button>
              <Button type="button" onClick={() => setSelectedTaskId(null)}>
                {t(locale, "Fermer", "Close")}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
