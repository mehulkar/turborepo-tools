## `monorepo-root-deps`

If you have a large monorepo and your root `package.json` has a lot of dependencies that are
only used in some packages (or apps or whatever), you can run this script to move them over.
I've been using this for a monorepo with close to 500 packages and it's working somewhat well.

## Usage

```bash
npx monorepo-root-deps --directory .
```

## Options

### `--directory` (`-d`)

**Required**

The path to your monorepo. Can be a relative path. I would just be cd'd into that directory
and use `--directory .`.

### `--dry-run`

Run the script and show a bunch of logs about what will happen, but don't actually do it. Useful
for debugging.

### `--limit` (`-l`)

Only move some dependencies at a time. When the limit is reached, the script will stop.

### `--pristine` (`-p`)

**Accepts multiple**

Specify the directories you don't want to change. This is the relative path to the directory
that contains packages that you don't want to change.

E.g.

```bash
npx monorepo-root-deps --directory . --pristine packages/foobarbaz
```

Any root dependencies that are imported in files in `packages/foobarbarz/` will
be retained in the root package.json also. All other packages will still get
those dependencies moved into them though.

### `--skip` (`-s`)

**Accepts multiple**

Skip dependencies that you don't want moved. E.g. if you want to keep `eslint` in your root package.json
pass it in as this flag option.

### `--skip-prefix`

**Accepts multiple**

Same as `--skip`, except you can use prefixes. E.g. `--skip-prefix="@types/"`. Another useful thing
is to pass the prefix you use for internal dependencies. E.g. if all your internal packages are named
`@repo/whatever` , you can use `--skip-prefix=@repo/` to skip moving them.

### `--include-dev`

Include devDependencies from root package.json. Defaults to true, but you can turn it off.
