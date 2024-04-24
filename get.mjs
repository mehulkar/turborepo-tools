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

function getImportDetails(imports) {
  return imports.map((p) => {
    const split = p.split("/");

    let pkg = split[0];
    if (p.startsWith("@")) {
      pkg = `${split[0]}/${split[1]}`;
    }

    return { pkg, path: p };
  });
}

// for all .ts files in this directory, check if they import the dependency
// returns a list of files that import the dependency
export async function getImportsInDirectory(rootDir, directory) {
  const files = await glob(`${rootDir}/${directory}/**/*.ts`, {
    ignore: "**/node_modules/**",
  });

  // map keys are pkgNames
  // map values are { source, importedPkg, importedPath }
  const all = new Map();

  for (const filePath of files) {
    const importsFromFile = getImportsFromFile(filePath);
    const importDetails = getImportDetails(importsFromFile);

    if (importDetails.length === 0) {
      continue;
    }

    // group all the imports by the package that is being imported.
    for (const importDetail of importDetails) {
      if (!all.get(importDetail.pkg)) {
        all.set(importDetail.pkg, []);
      }

      all.get(importDetail.pkg).push({
        name: importDetail.pkg,
        path: importDetail.path,
        location: filePath,
      });
    }
  }

  return all;
}
