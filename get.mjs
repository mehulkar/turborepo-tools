import { builtinModules } from "module";
import { glob } from "glob";
import ts from "typescript";

const tsHost = ts.createCompilerHost(
  {
    allowJs: true,
    noEmit: true,
    isolatedModules: true,
    resolveJsonModule: false,
    moduleResolution: ts.ModuleResolutionKind.Classic, // we don't want node_modules
    incremental: true,
    noLib: true,
    noResolve: true,
  },
  true
);

function getImportsFromFile(fileName) {
  const sourceFile = tsHost.getSourceFile(
    fileName,
    ts.ScriptTarget.Latest,
    (msg) => {
      throw new Error(`Failed to parse ${fileName}: ${msg}`);
    }
  );
  if (!sourceFile) throw ReferenceError(`Failed to find file ${fileName}`);
  const importing = [];
  delintNode(sourceFile);
  return importing.filter((x) => !x.startsWith("."));

  function delintNode(node) {
    if (ts.isImportDeclaration(node)) {
      const moduleName = node.moduleSpecifier.getText().replace(/['"]/g, "");
      if (
        !moduleName.startsWith("node:") &&
        !builtinModules.includes(moduleName)
      ) {
        importing.push(moduleName);
      }
    } else {
      ts.forEachChild(node, delintNode);
    }
  }
}

function getPackageNamesFromImports(imports) {
  return imports.map((i) => {
    const split = i.split("/");

    if (i.startsWith("@")) {
      return `${split[0]}/${split[1]}`;
    }

    return split[0];
  });
}

// for all .ts files in this directory, check if they import the dependency
// returns a list of files that import the dependency
export async function getImportsInDirectory(rootDir, directory) {
  const files = await glob(`${rootDir}/${directory}/**/*.ts`, {
    ignore: "**/node_modules/**",
  });

  const all = new Map();
  for (const filePath of files) {
    const importsFromFile = getImportsFromFile(filePath);

    const pkgNames = getPackageNamesFromImports(importsFromFile);

    if (pkgNames.length === 0) {
      continue;
    }

    for (const pkg of pkgNames) {
      if (!all.get(pkg)) {
        all.set(pkg, []);
      }
      // console.log(`${pkg} imported in ${relative(rootDir, filePath)}`);
      all.get(pkg).push(filePath);
    }
  }

  return all;
}
