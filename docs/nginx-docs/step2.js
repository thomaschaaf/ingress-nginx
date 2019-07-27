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

process.on('uncaughtException', (err) => {
  console.log(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
  console.log(reason);
  process.exit(1);
});

/*
  Step 2 reads the generated documentation, creates a list of the types,
  generating a new field in each directive with the name of the type.
*/
(async () => {
  const file = await readFilePromisified('documentation.json', 'utf8');
  const data = JSON.parse(file);

  const types = [];
  const stats={};

  for (let index = 0; index < data.modules.length; index++) {
    const module = data.modules[index];
    for (let index = 0; index < module.directives.length; index++) {
      const directive = module.directives[index];

      const rawType = directive.syntax
          .replace(directive.name, '')
          .replace(';', '')
          .trim();

      if (rawType.length === 0) {
        continue;
      }

      if (!types.includes(rawType)) {
        types.push(rawType);
        stats[rawType]=1;
        continue;
      }

      stats[rawType] += 1;
    };
  };

  const validTypes = [];

  for (const key in stats) {
    if (stats[key] === 1) {
      continue;
    } else {
      validTypes.push(key);
    }
  }

  console.log(validTypes);
  console.log(stats);
})();
