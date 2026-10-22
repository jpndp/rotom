const connectDB = require('./config/db');
const { port } = require('./config/env');
const app = require('./app');

connectDB().then(() => {
  app.listen(port, () => console.log(`[server] listening on ${port}`));
});