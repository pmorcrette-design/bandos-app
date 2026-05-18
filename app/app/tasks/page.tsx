import { PageHeader } from "@/components/shared/page-header";
import { TasksView } from "@/components/tasks/tasks-view";
import { t } from "@/lib/i18n";
import { getLocalePreference } from "@/lib/preferences";

export default async function TasksPage() {
  const locale = await getLocalePreference();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(locale, "Tâches", "Tasks")}
        title={t(
          locale,
          "Coordonne l'équipe avec des tâches opérationnelles visibles",
          "Coordinate the crew with visible operational work"
        )}
        description={t(
          locale,
          "Crée des tâches avec assigné, échéance, priorité, commentaires et pièces jointes, puis consulte-les en liste, kanban ou calendrier.",
          "Create tasks with assignee, deadline, priority, comments, and attachments, then review them in list, kanban, or calendar views."
        )}
      />
      <TasksView locale={locale} />
    </div>
  );
}
