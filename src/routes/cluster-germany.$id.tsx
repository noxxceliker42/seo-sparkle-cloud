import { createFileRoute } from "@tanstack/react-router";
import { ClusterDetailPageComponent } from "@/components/seo/ClusterDetailPage";

export const Route = createFileRoute("/cluster-germany/$id")({
  component: ClusterGermanyDetailRoute,
  head: () => ({
    meta: [
      { title: "Cluster Germany Detail – SEO-OS v3.1" },
      { name: "description", content: "Cluster Germany Detail und Seitenmanagement." },
    ],
  }),
});

function ClusterGermanyDetailRoute() {
  const { id } = Route.useParams();
  return <ClusterDetailPageComponent id={id} scope="germany" />;
}
