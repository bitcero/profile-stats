/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 396:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 81:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 687:
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const https = __nccwpck_require__(687);
const fs = __nccwpck_require__(147);
const core = __nccwpck_require__(396);
const { execSync } = __nccwpck_require__(81);

const GH_USERNAME = core.getInput("GH_USERNAME");
const COMMIT_NAME = core.getInput("COMMIT_NAME");
const COMMIT_EMAIL = core.getInput("COMMIT_EMAIL");
const COMMIT_MSG = core.getInput("COMMIT_MSG");
const TARGET_FILE = core.getInput("TARGET_FILE");

const USER_QUERY = `
  query User {
      user(login: "${GH_USERNAME}") {
          isHireable
          repositories {
              totalCount
          }
          status {
              message
          }
          url
          websiteUrl
          pullRequests(states: [MERGED]) {
              totalCount
          }
          allTimeCommits: contributionsCollection {
              totalCommitContributions
              totalPullRequestContributions
              totalPullRequestReviewContributions
          }
          todayCommits: contributionsCollection(from: "${new Date().toISOString()}", to: "${new Date().toISOString()}" ) {
              totalCommitContributions
              totalPullRequestContributions
              totalPullRequestReviewContributions
          }
      }
      rateLimit {
          limit
          remaining
          used
          resetAt
      }
  }
`;

function fetchData(query, callback) {
  const data = JSON.stringify({ query });

  const options = {
    hostname: "api.github.com",
    path: "/graphql",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "User-Agent": "github-action",
    },
  };

  const req = https.request(options, (res) => {
    let body = "";

    res.on("data", (d) => {
      body += d;
    });

    res.on("end", () => {
      callback(JSON.parse(body));
    });
  });

  req.on("error", (e) => {
    console.error(e);
    core.setFailed(e.message);
  });

  req.write(data);
  req.end();
}

function generateReadmeContent(userData) {
  return `
## My GitHub Stats

- 🏆 ${userData.repositories.totalCount} repositories created
- 🔀 ${userData.pullRequests.totalCount} merged pull requests
- 💻 ${userData.allTimeCommits.totalCommitContributions} total commits
- 🧐 ${userData.allTimeCommits.totalPullRequestReviewContributions} code reviews

### Today's Activity

- 📝 ${userData.todayCommits.totalCommitContributions} commits
- 🤝 ${userData.todayCommits.totalPullRequestContributions} pull requests
- 👀 ${userData.todayCommits.totalPullRequestReviewContributions} reviews

${userData.isHireable ? "🔍 I am open to new opportunities!" : ""}
  `;
}

function updateReadme(content) {
  let readmeContent = fs.readFileSync(TARGET_FILE, "utf8");
  const sectionStart = "<!--SECTION:stats-->";
  const sectionEnd = "<!--/SECTION:stats-->";
  const startIndex = readmeContent.indexOf(sectionStart) + sectionStart.length;
  const endIndex = readmeContent.indexOf(sectionEnd);

  if (startIndex !== -1 && endIndex !== -1) {
    readmeContent = readmeContent.substring(0, startIndex) + content + readmeContent.substring(endIndex);
    fs.writeFileSync(TARGET_FILE, readmeContent);
    console.log("README updated successfully");
  } else {
    console.error("Section markers not found in README.md");
    core.setFailed("Section markers not found in README.md");
  }
}

function commitAndPushChanges() {
  execSync(`git config --global user.name "${COMMIT_NAME}"`);
  execSync(`git config --global user.email "${COMMIT_EMAIL}"`);
  execSync(`git add ${TARGET_FILE}`);
  execSync(`git commit -m "${COMMIT_MSG}"`);
  execSync("git push");
}

fetchData(USER_QUERY, (bodyJson) => {
  const userData = bodyJson.data.user;
  const readmeContent = generateReadmeContent(userData);
  updateReadme(readmeContent);
  commitAndPushChanges();
});
})();

module.exports = __webpack_exports__;
/******/ })()
;