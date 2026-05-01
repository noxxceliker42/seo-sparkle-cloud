import { createFileRoute } from "@tanstack/react-router";
import { ClusterOverviewPage } from "@/components/seo/ClusterOverviewPage";

export const Route = createFileRoute("/cluster/")({
  component: () => <ClusterOverviewPage scope="default" />,
  head: () => ({
    meta: [
      { title: "Cluster – SEO-OS v3.1" },
      { name: "description", content: "Alle SEO-Cluster verwalten." },
    ],
  }),
});
