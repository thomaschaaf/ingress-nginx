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

/*
  Step one downloads the index page of the NGINX documentation and returns
  an array of objects. Each object contains name of the NGINX module and the
  link of the documentation.
  With this information there is an iteration to obtain the directives of each
  module. The directive consist of a name, syntax, default value, context and
  description. If the description field contains 'commercial subscription' the
  directive is ommited.
*/

'use strict';

const fs = require('fs');
const util = require('util');
const writeFilePromisified = util.promisify(fs.writeFile);

const browserConsole = require('debug')('browser:console');

const puppeteer = require('puppeteer');

const DOCS_BASE_URL = 'https://nginx.org/en/docs';

process.on('uncaughtException', (err) => {
  console.log(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
  console.log(reason);
  process.exit(1);
});

const modules = [
  'ngx_http_core_module',
  'ngx_http_access_module',
  'ngx_http_addition_module',
  'ngx_http_api_module',
  'ngx_http_auth_basic_module',
  'ngx_http_auth_request_module',
  'ngx_http_browser_module',
  'ngx_http_charset_module',
  'ngx_http_empty_gif_module',
  'ngx_http_fastcgi_module',
  'ngx_http_geo_module',
  'ngx_http_geoip_module',
  'ngx_http_grpc_module',
  'ngx_http_gunzip_module',
  'ngx_http_gzip_module',
  'ngx_http_gzip_static_module',
  'ngx_http_headers_module',
  'ngx_http_image_filter_module',
  'ngx_http_index_module',
  'ngx_http_limit_conn_module',
  'ngx_http_limit_req_module',
  'ngx_http_log_module',
  'ngx_http_map_module',
  'ngx_http_mirror_module',
  'ngx_http_proxy_module',
  'ngx_http_realip_module',
  'ngx_http_referer_module',
  'ngx_http_rewrite_module',
  'ngx_http_split_clients_module',
  'ngx_http_ssl_module',
  'ngx_http_status_module',
  'ngx_http_stub_status_module',
  'ngx_http_sub_module',
  'ngx_http_userid_module',
  'ngx_http_v2_module',
  'ngx_stream_core_module',
  'ngx_stream_access_module',
  'ngx_stream_geo_module',
  'ngx_stream_geoip_module',
  'ngx_stream_keyval_module',
  'ngx_stream_limit_conn_module',
  'ngx_stream_log_module',
  'ngx_stream_map_module',
  'ngx_stream_proxy_module',
  'ngx_stream_realip_module',
  'ngx_stream_return_module',
  'ngx_stream_split_clients_module',
  'ngx_stream_ssl_module',
  'ngx_stream_ssl_preread_module',
];

const scrapeIndex = async (page) => {
  await page.goto(DOCS_BASE_URL, {
    waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
  });

  const result = await page.$$eval('ul.compact li a', (links) => {
    return links.map((a) => {
      const link = a.href;
      const name = a.textContent.replace(/\s+/g, ' ').trim();
      return {name, link};
    });
  });

  return result.filter((module) => {
    return module.name.startsWith('ngx_') && modules.includes(module.name);
  }).filter((x) => x);
};

const scrapeDirectives = async (ngxDirective, page) => {
  await page.goto(ngxDirective.link, {
    waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
  });

  const directives = await page.evaluate((sel) => {
    const extract = (elem, depth) =>{
      let result = elem.nextElementSibling;
      if (depth === 0) {
        return result;
      }

      for (let index = 0; index < depth; index++) {
        result = result.nextElementSibling;
      }

      return result;
    };

    const extractOrSkip = (elem) => {
      const result = [];
      let depth = 0;

      while (true) {
        const sibling = extract(elem, depth);
        if (!sibling) {
          return [false, result.join('\n')];
        }

        if (sibling.tagName === 'A') {
          return [false, result.join('\n')];
        }

        if (sibling.tagName === 'BLOCKQUOTE' &&
         sibling.textContent.includes('commercial subscription')) {
          return [true, null];
        }

        result.push(sibling.textContent);
        depth += 1;
      }
    };

    const camelize = (text, separator='_')=> (
      text.split(separator)
          .map((w)=> w.replace(/./, (m)=> m.toUpperCase()))
          .join('')
    );

    const directiveList = Array.from(document.querySelectorAll(sel));

    const directivesToSkip = [
      'server',
      'http',
      'location',
      'listen',
    ];

    return directiveList.map((directive) => {
      const rows = Array.from(directive.querySelectorAll('table tbody tr'));

      const result = {};
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];

        const name = row.querySelector('th').textContent
            .replace(/:/, '')
            .replace(/\s+/, ' ')
            .toLowerCase()
            .trim();

        const value = row.querySelector('td').textContent
            .replace(/\s+/g, ' ').trim();

        // fix word is the name of the directive
        if (name === 'syntax') {
          result.name = value.split(' ')[0];
          result.fieldName = camelize(result.name);

          if (directivesToSkip.includes(result.name)) {
            return null;
          }
        }

        // don't configure default empty values
        if (name === 'default') {
          if (value.length === 1) {
            continue;
          }
        }

        result[name] = value;
      }

      // end of the section is a link
      // each p section is part of the description
      // if the directive contains a blockquote with
      // 'commercial subscription' should be skipped.
      const [skip, description] = extractOrSkip(directive);
      if (skip) {
        return null;
      }

      result.description = description;

      return result;
    });
  }, 'div.directive');

  return directives.filter((x) => x);
};

(async () => {
  const args = [
    '--disable-gpu',
    '--disable-infobars',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-zygote',
    '--window-size=1440x900',
  ];

  const browser = await puppeteer.launch({
    args,
    headless: process.env.HEADLESS ? process.env.HEADLESS === 'true' : true,
    slowMo: 50,
    ignoreHTTPSErrors: true,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  // do not download images.
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.resourceType() === 'image') {
      request.abort();
      return;
    }

    request.continue();
  });

  // enable only for debugging
  page.on('console', (msg) => browserConsole(`${msg.text()}`));

  // download the documentation index page with all the modules
  console.log('Downloading index of NGINX documentation');
  const data = await scrapeIndex(page);
  console.log(`downloading documentation of ${data.length} modules...`);

  // obtain the detail of each module
  for (let index = 0; index < data.length; index++) {
    const ngxDirective = data[index];
    console.log(`  downloading module ${ngxDirective.name}...`);
    ngxDirective.directives = await scrapeDirectives(ngxDirective, page);
  }

  await browser.close();

  // dump the contenxt to a file
  console.log('Saving documentation in file documentation.json');
  const json = JSON.stringify({modules: data}, null, 2);
  await writeFilePromisified('documentation.json', json, 'utf8');
})();
