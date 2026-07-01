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
          "Pilote l'équipe avec un kanban opérationnel",
          "Run the crew from one operational kanban"
        )}
        description={t(
          locale,
          "Ajoute, déplace, édite et supprime les tâches directement dans le kanban du workspace, sans autre vue ni reset de ton organisation.",
          "Add, move, edit, and delete tasks directly in the workspace kanban, with no extra views and no reset of your setup."
        )}
      />
      <TasksView locale={locale} />
    </div>
  );
}
