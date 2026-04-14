import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/cluster")({
  component: ClusterLayout,
});

function ClusterLayout() {
  return <Outlet />;
}
