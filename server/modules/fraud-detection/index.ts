import router from './fraudDetectionRoutes';
import { fraudDetectionService } from './fraudDetectionService';

export const FraudDetectionModule = {
  router,
  service: fraudDetectionService
};

export default FraudDetectionModule;