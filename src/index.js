import 'babel-runtime'
import syslog from 'syslogudp'

function createSyslogStream(url, options = {}) {
  const [host, port] = url.split(':')
  const client = syslog.createClient(parseInt(port, 10), host, options)
  const promises = []

  return {
    async close() {
      await Promise.all(promises)
      client.close()
    },
    writeAsync(s) {
      try {
        promises.push(
          new Promise((resolve, reject) =>
            client.log(s.replace(/\n$/, ''), 'info', (err, emsg) => {
              if (err) { return reject(emsg) }
              resolve()
            })
          )
        )
      } catch (error) {
        console.error(error.stack)
      }
    },
  }
}

export default class Logger {
  constructor(options = {}) {
    this.context = options.context || {}

    this.streams = [process.stdout]
    if (options.syslogUrl) {
      this.streams.push(createSyslogStream(options.syslogUrl, options))
    }
  }

  log(event, cb) {
    const string = JSON.stringify({...this.context, ...event}) + '\n'
    for (const s of this.streams) {
      if (s.writeAsync) {
        s.writeAsync(string, cb)
      } else {
        s.write(string)
      }
    }
  }

  close() {
    for (const s of this.streams) {
      if (s.close) {
        s.close()
      }
    }
  }
}
