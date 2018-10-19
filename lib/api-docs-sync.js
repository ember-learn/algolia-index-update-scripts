import http from 'http'
import https from 'https'
import humanSize from 'human-size'
import ora from 'ora'
import S3 from 's3'

// To increase s3's download & upload dir perf
http.globalAgent.maxSockets = https.globalAgent.maxSockets = 30

const { AWS_ACCESS_KEY, AWS_SECRET_KEY } = process.env

const client = S3.createClient({
  s3Options: { accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY },
})

const jsonDocsDirDownloadOptions = {
  localDir: 'tmp/json-docs',
  s3Params: { Bucket: 'api-docs.emberjs.com', Prefix: 'json-docs' },
}

let revDocsDirDownloadOptions = {
  localDir: 'tmp/rev-index',
  s3Params: { Bucket: 'api-docs.emberjs.com', Prefix: 'rev-index' },
}

const syncDir = options => {
  return new Promise((resolve, reject) => {
    let sync = client.downloadDir(options)
    let progressIndicator = ora(
      `downloading ${options.s3Params.Prefix} docs`
    ).start()

    sync.on('progress', () => {
      const { progressAmount, progressTotal } = sync
      progressIndicator.text = `Downloading json docs (${humanSize(
        progressAmount
      )} of ${humanSize(progressTotal)})`
    })

    sync.on('end', () => {
      progressIndicator.succeed(`downloaded ${options.s3Params.Prefix} docs`)
      resolve()
    })

    sync.on('error', err => {
      progressIndicator.fail()
      reject(err)
    })
  })
}

export default function downloadExistingDocsToLocal() {
  return Promise.all([
    syncDir(jsonDocsDirDownloadOptions),
    syncDir(revDocsDirDownloadOptions),
  ])
}
