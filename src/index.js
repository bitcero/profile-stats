const https = require("https");
const fs = require("fs");
const core = require("@actions/core");
const { execSync } = require("child_process");
const moment = require("moment");
const dotenv = require("dotenv").config();

const GH_USERNAME = core.getInput("GH_USERNAME") || process.env.GH_LOGIN;
const COMMIT_NAME = core.getInput("COMMIT_NAME");
const COMMIT_EMAIL = core.getInput("COMMIT_EMAIL");
const COMMIT_MSG = core.getInput("COMMIT_MSG");
const TARGET_FILE = core.getInput("TARGET_FILE") || "README.md";

const startOfLastWeek = moment()
  .subtract(1, "weeks")
  .startOf("week")
  .toISOString();
const endOfLastWeek = moment().subtract(1, "weeks").endOf("week").toISOString();

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
          lastYearCommits: contributionsCollection {
              totalCommitContributions
              totalPullRequestContributions
              totalPullRequestReviewContributions
          }
          todayCommits: contributionsCollection(from: "${moment().startOf("day").toISOString()}", to: "${moment().endOf("day").toISOString()}" ) {
              totalCommitContributions
              totalPullRequestContributions
              totalPullRequestReviewContributions
          }
          weekCommits: contributionsCollection(from: "${startOfLastWeek}", to: "${endOfLastWeek}" ) {
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
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
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
- 💻 ${userData.lastYearCommits.totalCommitContributions} total commits last year
- 🧐 ${userData.lastYearCommits.totalPullRequestReviewContributions} code reviews last year

### Today's Activity

- 📝 ${userData.todayCommits.totalCommitContributions} commits
- 🤝 ${userData.todayCommits.totalPullRequestContributions} pull requests
- 👀 ${userData.todayCommits.totalPullRequestReviewContributions} reviews

### Last Week's Activity

- 💻 ${userData.weekCommits.totalCommitContributions} commits
- 🤝 ${userData.weekCommits.totalPullRequestContributions} pull requests
- 👀 ${userData.weekCommits.totalPullRequestReviewContributions} reviews

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
    readmeContent =
      readmeContent.substring(0, startIndex) +
      content +
      readmeContent.substring(endIndex);
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
  console.log(userData);
  const readmeContent = generateReadmeContent(userData);
  updateReadme(readmeContent);
  commitAndPushChanges();
});
