import { createFileRoute } from "@tanstack/react-router";
import { ClusterOverviewPage } from "@/components/seo/ClusterOverviewPage";

export const Route = createFileRoute("/cluster-germany/")({
  component: () => <ClusterOverviewPage scope="germany" />,
  head: () => ({
    meta: [
      { title: "Cluster Germany – SEO-OS v3.1" },
      { name: "description", content: "Branchenübergreifende SEO-Cluster für deutsche Städte." },
    ],
  }),
});
