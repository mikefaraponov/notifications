const config = require('src/config');
const SECRET_TOKEN = config.get('SECRET_TOKEN');
const jwt = require('jsonwebtoken');

function ApplicationController(io, redis, logger) {
  return {
    onExit() {
      io.close();
      redis.disconnect();
    },
    onConnection(socket) {
      const {session} = socket;
      socket.join(`user:${session.user_id}`);
      logger.info('User attached', session);
      socket.on('disconnect', (reason) => {
        logger.info('User detached', reason, session);
      });
    },
    async onAuthentication(socket, next) {
      try {
        const token = socket.request.headers.cookie.token;
        if (!token) {
          throw 'Token is not present!';
        }
        const {session_id} = jwt.verify(token, SECRET_TOKEN);
        const result = await redis.get(`session:${session_id}`);
        if (!result) {
          throw 'Missing session!';
        }
        socket.session = JSON.parse(result);
      } catch(e) {
        logger.log('warn', e);
        next(new Error('Authentication error!'));
      }
    }
  }
}

module.exports = ApplicationController;