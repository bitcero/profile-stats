const https = require("https");
const fs = require("fs");
const core = require("@actions/core");
const { execSync } = require("child_process");

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
# Hello, I am ${GH_USERNAME} 👋

${userData.status.message ? `🌟 ${userData.status.message}` : ""}

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

[My GitHub Profile](${userData.url})
${userData.websiteUrl ? `[My Website](${userData.websiteUrl})` : ""}

*Last updated: ${new Date().toLocaleString()}*
  `;
}

function updateReadme(content) {
  fs.writeFileSync(TARGET_FILE, content);
  console.log("README updated successfully");
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