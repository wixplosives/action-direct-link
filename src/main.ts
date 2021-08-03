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
  matrixNode: string,
  customJobName: string
): Promise<string> {
  const runId = context.runId
  const {owner, repo} = context.repo
  const jobNameToUse = customJobName ?? context.job
  const jobName = getJobName(jobNameToUse, matrixOs, matrixNode)
  const octokit = new Octokit({auth: process.env['GITHUB_TOKEN']})
  const jobs = await octokit.request(
    `GET /repos/${owner}/${repo}/actions/runs/${runId}/jobs`
  )
  for (const buildNum in jobs.data.jobs) {
    if (jobs.data.jobs[buildNum].name === jobName) {
      const runJobId = jobs.data.jobs[buildNum].id
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
    const customJobName: string = core.getInput('custom_job_name')
    core.info(`Got ${matrixOs} ${matrixNode}`)
    const buildUrl = await getActionUrl(matrixOs, matrixNode, customJobName)
    core.info(`Action log url ${buildUrl}`)
    core.setOutput('url', buildUrl)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
