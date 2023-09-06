const Readable = require('stream').Readable;
let sftpClient = require('ssh2-sftp-client');

module.exports = {

  init(config) {

    let access = {
      host: config.host,
      port: config.port,
      username: config.user,
      password: config.password,
    };

    const stream2buffer = async (stream) => {
      return new Promise((resolve, reject) => {
        const _buf = [];
        stream.on('data', (chunk) => _buf.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(_buf)));
        stream.on('error', (err) => reject(err));
      });
    }

    const uploadStream = async (inputFile) => {

      const file = { ...inputFile };
      file.buffer = await stream2buffer(file.stream);

      const source = new Readable();
      source._read = () => { }; // _read is required but you can noop it
      source.push(file.buffer);
      source.push(null);

      const path = `${config.path}/${file.hash}${file.ext}`;

      return new Promise((resolve, reject) => {
        let client = new sftpClient();
        client
        .connect(access)
        .then(() => {
          return client.put(source, path);
        })
        .then(() => {
          resolve();
          return client.end();
        })
        .catch(err => {
          reject(err);
        });
      });
    };

    const deleteFile = async (file) => {

      const path = `${config.path}/${file.hash}${file.ext}`;

      return new Promise((resolve, reject) => {
        let client = new sftpClient();
        client
        .connect(access)
        .then(() => {
          return client.delete(path);
        })
        .then(() => {
          resolve();
          return client.end();
        })
        .catch(err => {
          reject(err);
        });
      });
    };

    return {
      async upload(file) {
        await uploadStream(file);
        file.url = `${config.baseUrl}/${file.hash}${file.ext}`;
        delete file.buffer;
      },
      async uploadStream(file) {
        await uploadStream(file);
        file.url = `${config.baseUrl}/${file.hash}${file.ext}`;
        delete file.buffer;
      },
      delete(file) {
        return new Promise((resolve, reject) => {
          deleteFile(file)
          .then(() => {
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
        });
      },
    };
  },
};
