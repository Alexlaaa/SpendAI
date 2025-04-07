import { ReporterService } from '../reporter/reporter.service';

export function TrackErrors(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    try {
      const result = originalMethod.apply(this, args);

      // If result is a Promise (asynchronous), handle the error when it rejects
      if (result instanceof Promise) {
        return result.catch((error) => {
          ReporterService.counter('function_error_count', {
            function_name: propertyKey,
          });
          throw error;
        });
      }

      // If the method is synchronous and returns a normal value, just return it
      return result;
    } catch (error) {
      // For synchronous errors, increment the counter and rethrow the error
      ReporterService.counter('function_error_count', {
        function_name: propertyKey,
      });
      throw error;
    }
  };

  return descriptor;
}
