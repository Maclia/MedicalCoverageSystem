import express from 'express';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { auditMiddleware } from './middleware/auditMiddleware.js';
import { responseStandardization } from './middleware/responseStandardization.js';
import routes from './routes/index.js';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

const app = express();

// MIDDLEWARE ORDER - STANDARD MANDATORY ORDER
app.use(auditMiddleware);
app.use(helmet());
// CORS configuration - HANDLED AT API GATEWAY EDGE
// Disabled to eliminate duplicate processing overhead
// app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(responseStandardization);

// ROUTES
app.use('/api', routes);

// ERROR HANDLER - ALWAYS LAST
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Finance Service running on port ${config.port}`);
});