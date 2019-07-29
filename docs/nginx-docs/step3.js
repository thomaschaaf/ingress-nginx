/*
Copyright 2019 The Kubernetes Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

const fs = require('fs');
const util = require('util');
const readFilePromisified = util.promisify(fs.readFile);
const writeFilePromisified = util.promisify(fs.writeFile);

process.on('uncaughtException', (err) => {
  console.log(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
  console.log(reason);
  process.exit(1);
});

/*
  Step 3 reads the generated documentation and the mapping file,
  updating the goType field in each directive if the mapping value
  is not a number.
*/
(async () => {
  let file = await readFilePromisified('documentation.json', 'utf8');
  const directives = JSON.parse(file);

  file = await readFilePromisified('types-mapping.json', 'utf8');
  const typesMapping = JSON.parse(file);

  for (let index = 0; index < directives.modules.length; index++) {
    const module = directives.modules[index];
    for (let index = 0; index < module.directives.length; index++) {
      const directive = module.directives[index];

      const rawType = directive.syntax
          .replace(directive.name, '')
          .replace(';', '')
          .trim();

      if (rawType.length === 0) {
        continue;
      }

      const t = typesMapping[rawType];
      if (t) {
        if (typeof t === 'number') {
          continue;
        }

        directive.goType = t;
      }
    };
  };

  const d = JSON.stringify(directives, null, 2);
  await writeFilePromisified('documentation.json', d, 'utf8');
})();
