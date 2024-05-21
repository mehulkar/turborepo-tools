import { Workspace } from "@turbo/repository";

export async function readWorkspacePackages(dir) {
  const workspace = await Workspace.find(dir);
  const packages = await workspace.findPackages();
  return packages;
}

export async function getPackageWithGraph(dir) {
  const workspace = await Workspace.find(dir);
  const [packages, graph] = Promise.all([
    workspace.findPackages(),
    workspace.findPackagesWithGraph(),
  ]);

  return [packages, graph];
}
