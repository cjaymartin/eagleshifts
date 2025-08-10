# GitHub Actions Workflows

This directory contains GitHub Actions workflow configurations for the EagleShifts project.

## Available Workflows

### Run Tests (`run-tests.yml`)

This workflow automatically runs tests when:
- A pull request is opened or updated targeting the `main` or `master` branch
- Code is pushed to the `main` or `master` branch

#### What it does:
1. Checks out the repository code
2. Sets up Node.js v22.x (matching the version in package.json)
3. Installs dependencies using `yarn install --frozen-lockfile`
4. Installs timezone data (`tzdata` package) to ensure tests that rely on timezone information run correctly
5. Runs tests using `yarn test`
6. Uploads test results as artifacts (if available)

#### Viewing Test Results
After the workflow runs, you can view test results by:
1. Going to the Actions tab in the GitHub repository
2. Clicking on the specific workflow run
3. Scrolling down to the Artifacts section
4. Downloading the test-results artifact

## Adding New Workflows

To add a new workflow:
1. Create a new YAML file in this directory
2. Follow the GitHub Actions syntax (see [GitHub Actions documentation](https://docs.github.com/en/actions))
3. Update this README.md to document the new workflow
