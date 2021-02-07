import * as core from '@actions/core'
import {Octokit} from '@octokit/action'
import {context} from '@actions/github'

export function getJobName(
  job: string,
  matrixOs: string,
  matrixNode: string
): string {
  let jobName = job
  if (matrixOs && matrixNode) {
    jobName = `${job} (${matrixOs}, ${matrixNode})`
  } else if (matrixOs && !matrixNode) {
    jobName = `${job} (${matrixOs})`
  } else if (!matrixOs && matrixNode) {
    jobName = `${job} (${matrixNode})`
  }
  return jobName
}

export async function getActionUrl(
  matrixOs: string,
  matrixNode: string
): Promise<string> {
  const {runId, job} = context
  const {owner, repo} = context.repo

  const commandUrl =
    'GET /repos/{onerPar}/{repoName}/actions/runs/{runIdPar}/jobs'
  const commandParams = {
    onerPar: owner,
    repoName: repo,
    runIdPar: runId
  }
  const jobName = getJobName(job, matrixOs, matrixNode)
  core.info(`Get action logs ${owner}/${repo} ${runId} ${jobName}`)
  const github_token = process.env['GITHUB_TOKEN']
  const octokit = new Octokit({auth: github_token})
  const retval = await octokit.request(commandUrl, commandParams)

  for (const buildNum in retval.data.jobs) {
    if (retval.data.jobs[buildNum].name === jobName) {
      const runJobId = retval.data.jobs[buildNum].id
      const link = `https://github.com/${owner}/${repo}/runs/${runJobId}?check_suite_focus=true`
      return link
    }
  }
  throw Error(`Job ${jobName} cannot be found at ${owner}/${repo}`)
}

async function run(): Promise<void> {
  try {
    const matrixOs: string = core.getInput('matrix_os')
    const matrixNode: string = core.getInput('matrix_node')
    core.info(`Got ${matrixOs} ${matrixNode}`)
    const buildUrl = await getActionUrl(matrixOs, matrixNode)

    core.info(`Action log url ${buildUrl}`)
    core.setOutput('url', buildUrl)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
