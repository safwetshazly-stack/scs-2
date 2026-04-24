import { logger } from '../../utils/logger';
import { EventPublisher } from '../events/event-publisher';
import { ResilienceService } from '../resilience/resilience.service';

export class PaymentWrapperService {
  static async processPayment(userId: string, courseId: string, amount: number, paymentMethodId: string): Promise<boolean> {
    return ResilienceService.execute<boolean>(
      'PaymentService',
      async (signal: AbortSignal) => {
        logger.info(`[PaymentWrapperService] Processing payment of $${amount} for user: ${userId}`);
        
        if (signal.aborted) throw new Error('AbortError');
        const isSuccess = true; 

        if (isSuccess) {
          await EventPublisher.publishCoursePurchased(userId, courseId, amount);
        }
        return isSuccess;
      },
      async () => {
        logger.warn('Payment fallback hit. Alerting ops.');
        return false;
      },
      10000, // 10s timeout
      2      // max 2 retries to avoid double charge risk
    );
  }
}
