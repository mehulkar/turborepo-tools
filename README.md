# `turborepo-tools`

If you have a large monorepo and your root `package.json` has a lot of dependencies that are
only used in some packages (or apps or whatever), you can run this script to move them over.
I've been using this for a monorepo with close to 500 packages and it's working somewhat well.

### `move-root-deps`

```bash
npx -p turborepo-tools move-root-deps -d .
```

**Options**

| Name                | Short | Description                                         |
| ------------------- | ----- | --------------------------------------------------- |
| `--directory` (req) | `-d`  | path to your monorepo. Can be a relative path       |
| `--limit`           | `-l`  | Limit the number of deps to move                    |
| `--dry-run`         |       | Log and exit                                        |
| `--pristine`        | `-p`  | Specify dirs you don't want to touch                |
| `--skip`            | `-s`  | Skip some deps, can use multiple times              |
| `--skip-prefix`     |       | Same idea as `--skip`                               |
| `--only`            |       | Move only the dep specified, can use multiple times |
| `--only-prefix`     |       | Same idea as `--only`                               |
| `--include-dev`     |       | Includes `devDependencies` (default true)           |

### `self-imports`

```bash
npx -p turborepo-tools fix-self-imports -d .
```

**Options**

| Name                | Short | Description                                         |
| ------------------- | ----- | --------------------------------------------------- |
| `--directory` (req) | `-d`  | path to your monorepo. Can be a relative path       |
| `--dry-run`         |       | Log and exit                                        |
| `--limit`           | `-l`  | Limit the number of deps to move                    |
| `--only`            |       | Move only the dep specified. Can use multiple times |

### `get-deps`

```bash
npx -p turborepo-tools get-deps -d . -p @internal/foo
```

**Options**

| Name                | Short | Description                                   |
| ------------------- | ----- | --------------------------------------------- |
| `--directory` (req) | `-d`  | path to your monorepo. Can be a relative path |
| `--package`         | `-p`  | Required. specify a single package            |
| `--recursive`       | `-r`  | Crawl up the dependent tree                   |

### `footprint`

```bash
npx -p turborepo-tools footprint -d . -p @internal/foo
```

| Name                | Short | Description                                   |
| ------------------- | ----- | --------------------------------------------- |
| `--directory` (req) | `-d`  | path to your monorepo. Can be a relative path |
| `--package`         | `-p`  | Required. specify a single package            |

### `has-script`

Checks all packages for a given script.

```bash
npx -p turborepo-tools has-script -d . -t test
```

**Options**

| Name                | Short | Description                                      |
| ------------------- | ----- | ------------------------------------------------ |
| `--directory` (req) | `-d`  | path to your monorepo. Can be a relative path    |
| `--task`            | `-t`  | Required. specify the script you are looking for |
