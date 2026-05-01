import { createFileRoute } from "@tanstack/react-router";
import { ClusterDetailPageComponent } from "@/components/seo/ClusterDetailPage";

export const Route = createFileRoute("/cluster/$id")({
  component: ClusterDetailRoute,
  head: () => ({
    meta: [
      { title: "Cluster-Detail – SEO-OS v3.1" },
      { name: "description", content: "Cluster-Detail und Seitenmanagement." },
    ],
  }),
});

function ClusterDetailRoute() {
  const { id } = Route.useParams();
  return <ClusterDetailPageComponent id={id} scope="default" />;
}
