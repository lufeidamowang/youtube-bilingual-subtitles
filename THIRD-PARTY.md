# Third-party notices

This project is an independent adaptation, not an official YouTube, Google, Shadowrocket or DualSubs product.

- **DualSubs/Universal**, VirgilClyne and contributors, Apache-2.0. `vendor/dualsubs/Composite.mjs` is copied unchanged from commit `c610f5d35779471400b0062f2fc0d35cb3438e62`, `src/class/Composite.mjs`. Source: https://github.com/DualSubs/Universal . License retained beside the file. The build replaces its logging import with a no-op implementation. The surrounding request and runtime adaptation is maintained by this project.
- **core-js 3.50.0**: MIT, URL compatibility.
- **text-encoding 0.7.0**: Unlicense, TextEncoder/TextDecoder compatibility. Deprecated upstream; retained from the tested implementation.
- **fast-xml-parser 5.11.2**: MIT, XML parsing/building. Its bundled dependencies retain their own licenses.
- **esbuild 0.28.2**: MIT, build tool only.

Runtime license texts are included in `dist/licenses`. Package versions and transitive sources are pinned in package-lock.json. Original copyright notices are retained. Project code is licensed under Apache-2.0; third-party code keeps its respective license.

Transitive runtime dependencies: @nodable/entities 3.1.0 (MIT; license from https://github.com/nodable/val-parsers/blob/main/LICENSE), fast-xml-builder, is-unsafe, path-expression-matcher, strnum, anynum and xml-naming (MIT; exact versions in lockfile). Their license texts are included in dist/licenses.
