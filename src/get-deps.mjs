import { getPackageWithGraph } from "./utils/turbo.mjs";

export async function main({ directory, pkg, recursive }) {
  const [packages, graph] = await getPackageWithGraph(directory);

  // create a map keyed by the relative path of each package
  // so we can look up dependencies/dependents. findPackagesWithGraph is keyed by relative path
  const pathToName = new Map();
  const nameToPath = new Map();
  for (const pkg of packages) {
    pathToName.set(pkg.relativePath, pkg.name);
    nameToPath.set(pkg.name, pkg.relativePath);
  }

  const pkgPath = nameToPath.get(pkg);

  if (!pkgPath) {
    throw new Error("Not found");
  }

  if (!recursive) {
    return graph[pkgPath].dependents.map((x) => pathToName.get(x)).sort();
  }

  // recursive

  // Construct a full dependents graph first.
  const dependentsGraph = {};
  for (const [pkgRelativePath, pkgDetails] of Object.entries(graph)) {
    dependentsGraph[pkgRelativePath] = pkgDetails.dependents;
  }

  const all = new Set();
  all.add(pkgPath);

  const fullTree = traverse({
    pkg: pkgPath,
    graph: dependentsGraph,
  });
  fullTree.forEach((p) => all.add(p));
  return [...all].map((x) => pathToName.get(x)).sort();
}

export function traverse({ pkg, graph, visited }) {
  const seen = visited ?? new Set();

  if (seen.has(pkg)) {
    return [pkg];
  }

  seen.add(pkg);

  if (!(pkg in graph) || graph[pkg].length === 0) {
    return [pkg];
  }

  let dependents = [pkg];
  for (const dependent of graph[pkg]) {
    // TODO: do we need this?
    if (dependent === "") {
      continue;
    }

    if (!seen.has(dependent)) {
      dependents = [
        ...dependents,
        ...traverse({
          pkg: dependent,
          graph,
          visited: seen,
        }),
      ];
    }
  }

  return [...new Set(dependents)];
}
