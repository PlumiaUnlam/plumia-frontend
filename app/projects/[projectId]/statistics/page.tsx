import { StatisticsDashboard } from "@/components/statistics/statistics-dashboard";

type ProjectStatisticsPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectStatisticsPage({
  params,
}: Readonly<ProjectStatisticsPageProps>) {
  const { projectId } = await params;

  return <StatisticsDashboard projectId={projectId} />;
}
